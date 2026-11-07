import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StatusBar,
  Share,
  BackHandler,
} from 'react-native';

// Polyfills antes de Amplify
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';
import { signIn, signOut, confirmSignIn, getCurrentUser } from 'aws-amplify/auth';

import { TOKENS, num, severidad, confianzaPct } from './src/DesignTokens';
import {
  Screen,
  Logo,
  Spinner,
  TabBar,
  ConfirmModal,
  PromptModal,
} from './src/DesignComponents';
import {
  LoginScreen,
  HomeScreen,
  LotesScreen,
  FoldersScreen,
  FolderScreen,
  ActivityScreen,
  SettingsScreen,
  ContextScreen,
  CameraScreen,
  PreviewScreen,
  AnalyzingScreen,
  ResultScreen,
  DetailScreen,
} from './src/screens';
import {
  nombreCortoBloque,
  puedeGestionarMedicion,
  puedeGestionarLote,
  traducirAuthError,
  PAGINA_MEDICIONES,
  paginaAnterior,
  mezclarMediciones,
  hayMasMediciones as calcularHayMas,
  resumirCola,
} from './src/helpers';
import {
  AWS_CONFIG,
  APP_CONFIG,
  LISTA_BLOQUES,
} from './src/config';
import {
  getMiPerfil,
  getIndicadores,
  getMedicionesRecientes,
  getBloques,
  resolverBloqueId,
  subirMedicion,
  renombrarMedicion,
  renombrarLote,
  eliminarMedicion,
} from './src/api-real';
import {
  getCurrentLocation,
  reverseGeocode,
  pickPhoto,
  pickPhotos,
  validarFoto,
  formatDateTime,
  calcularEstadisticas,
  saveLocal,
  loadLocal,
  clearLocalData,
  guardarFotoLocal,
  bloqueDeMedicion,
  construirNotas,
  adaptarBloque,
} from './src/utils';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: AWS_CONFIG.userPoolId,
      userPoolClientId: AWS_CONFIG.userPoolClientId,
      region: AWS_CONFIG.region,
      loginWith: { username: true, email: true },
    },
  },
});

const TABS = [
  { key: 'home', label: 'Inicio' },
  { key: 'lotes', label: 'Lotes' },
  { key: 'folders', label: 'Puntos' },
  { key: 'activity', label: 'Actividad' },
  { key: 'settings', label: 'Ajustes' },
];

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <Root />
    </>
  );
}

function Root() {
  // auth
  const [booting, setBooting] = useState(true);
  const [logged, setLogged] = useState(false);

  // login form
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [needsNewPass, setNeedsNewPass] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // sesión / datos
  const [perfil, setPerfil] = useState(null);
  const [indicadoresServidor, setIndicadoresServidor] = useState(null);
  const [mediciones, setMediciones] = useState([]);
  const [hayMasMediciones, setHayMasMediciones] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [bloques, setBloques] = useState([]); // catálogo real (GET /bloques), adaptado
  const [bloqueMap, setBloqueMap] = useState({});
  const [obsMap, setObsMap] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  // navegación
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home'); // home | folders | folder | activity | settings | context | camera | preview | analyzing | result | detail
  const [folderClave, setFolderClave] = useState(null);
  const [detalle, setDetalle] = useState(null);

  // flujo de medición
  const [bloqueSel, setBloqueSel] = useState('');
  const [loteIdActual, setLoteIdActual] = useState('');
  const [loteNombreInput, setLoteNombreInput] = useState('');
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [foto, setFoto] = useState(null);
  const [colaFotos, setColaFotos] = useState([]); // [{ uri, base64, status: 'esperando'|'subiendo'|'analizando'|'lista'|'error', error?: string }]
  const colaRef = useRef([]); // copia síncrona de colaFotos para el bucle de subida
  const loteIdRef = useRef('');
  const analizandoRef = useRef(false);
  const sesionRef = useRef(0); // sube al cerrar sesión: descarta respuestas tardías de la sesión anterior
  const [lugar, setLugar] = useState(null); // { ciudad, barrio, direccion } del reverse-geocode
  const [etapaSubida, setEtapaSubida] = useState(''); // preparando_subida | subiendo_s3 | analizando_ia | completado
  const [resultado, setResultado] = useState(null);
  const [espesor, setEspesor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [obsOpen, setObsOpen] = useState(false);
  const [obsSaved, setObsSaved] = useState(false);

  // modales interactivos (reemplazo de Alert.alert y Alert.prompt en web y móvil)
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', variant: 'primary', onConfirm: null, onCancel: null });
  const [promptModal, setPromptModal] = useState({ visible: false, title: '', message: '', initialValue: '', onConfirm: null });

  const cerrarConfirm = () => setConfirmModal((prev) => ({ ...prev, visible: false }));
  const cancelarConfirm = () => {
    const alCancelar = confirmModal.onCancel;
    cerrarConfirm();
    if (alCancelar) alCancelar();
  };
  const avisar = (title, message) =>
    setConfirmModal({
      visible: true,
      title,
      message,
      confirmLabel: 'Entendido',
      cancelLabel: '',
      onConfirm: cerrarConfirm,
    });

  // La cola nunca se muta: cada cambio crea objetos nuevos y sincroniza el ref.
  const fijarCola = (cola) => {
    colaRef.current = cola;
    setColaFotos(cola);
  };
  const actualizarFoto = (i, cambios) =>
    fijarCola(colaRef.current.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  const fijarLoteId = (id) => {
    loteIdRef.current = id;
    setLoteIdActual(id);
  };

  const nombre = perfil?.nombre || (perfil?.email || email).split('@')[0] || 'Usuario';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  // El backend bloquea con 403 a cliente en POST /medicion: se oculta la entrada
  // a "Nueva medición" para que la UX no rompa con un error del servidor.
  const esCliente = (perfil?.rol || '').toLowerCase() === 'cliente';
  const stats = useMemo(() => calcularEstadisticas(mediciones), [mediciones]);

  // Catálogo de bloques a usar: el real del backend si cargó, si no el de
  // respaldo offline (BLOQUES_CAMPUS/LISTA_BLOQUES, ver src/config.js).
  const listaBloques = bloques.length ? bloques : LISTA_BLOQUES;
  const bloquesMap = useMemo(
    () => Object.fromEntries(listaBloques.map((b) => [b.clave, b])),
    [listaBloques]
  );
  // Label corto para pantallas que arman "Bloque {bloqueSel}" (Cámara, Revisar
  // foto, Analizando, Resultado): antes bloqueSel era una letra (G/J/K/L); ahora
  // puede ser un id_bloque real, así que se muestra el nombre del bloque en su
  // lugar (sin duplicar la palabra "Bloque" si el nombre real ya la trae).
  const bloqueSelLabel = nombreCortoBloque(bloquesMap[bloqueSel], bloqueSel);

  // ───────────────────────── arranque: sesión persistida ─────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setLogged(true);
      } catch {
        setLogged(false);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (logged) cargarTodo(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged]);

  // Manejador del botón atrás de Android (BackHandler)
  useEffect(() => {
    const onBackPress = () => {
      // Con un modal abierto, atrás lo cierra primero.
      if (confirmModal.visible) {
        cancelarConfirm();
        return true;
      }
      if (promptModal.visible) {
        setPromptModal((prev) => ({ ...prev, visible: false }));
        return true;
      }
      // Durante el análisis no se puede cancelar la subida: atrás no debe sacar de la app.
      if (screen === 'analyzing') {
        avisar('Análisis en curso', 'Espera a que termine el análisis de las fotos.');
        return true;
      }
      if (screen === 'detail') {
        setScreen(folderClave ? 'folder' : tab);
        return true;
      }
      if (screen === 'folder') {
        setScreen('folders');
        setFolderClave(null);
        return true;
      }
      if (screen === 'preview') {
        setScreen('camera');
        return true;
      }
      if (screen === 'camera') {
        setScreen('context');
        return true;
      }
      if (screen === 'context') {
        setScreen('home');
        return true;
      }
      if (screen === 'result') {
        irAInicioConservandoLote();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        setScreen('home');
        return true;
      }
      return false; // permite salir de la app en la pantalla inicial
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [screen, tab, folderClave, confirmModal, promptModal]);

  const cargarTodo = useCallback(async (first = false) => {
    const sesion = sesionRef.current;
    if (first) setLoadingData(true);
    // cache local primero (para pintar algo sin red)
    const [cache, bmap, omap] = await Promise.all([
      loadLocal(APP_CONFIG.storageKeys.historialCache, []),
      loadLocal(APP_CONFIG.storageKeys.bloquePorMedicion, {}),
      loadLocal(APP_CONFIG.storageKeys.obsPorMedicion, {}),
    ]);
    if (sesion !== sesionRef.current) return;
    setBloqueMap(bmap || {});
    setObsMap(omap || {});
    if (Array.isArray(cache) && cache.length) setMediciones(cache);

    try {
      const [p, respMeds, blqs, inds] = await Promise.all([
        getMiPerfil().catch(() => null),
        getMedicionesRecientes(undefined, PAGINA_MEDICIONES).catch(() => ({ mediciones: [] })),
        getBloques().catch(() => null),
        getIndicadores().catch(() => null),
      ]);
      if (sesion !== sesionRef.current) return;
      if (p) setPerfil(p);
      if (inds) setIndicadoresServidor(inds);
      if (Array.isArray(blqs)) setBloques(blqs.map(adaptarBloque));

      const lista = Array.isArray(respMeds) ? respMeds : respMeds?.mediciones || respMeds?.items || [];
      setHayMasMediciones(calcularHayMas(respMeds, PAGINA_MEDICIONES));

      const limpio = lista
        .map(({ mascaras, ...rest }) => rest)
        .sort((a, z) => new Date(z.timestamp || 0) - new Date(a.timestamp || 0));
      setMediciones(limpio);
      setOffline(false);
      saveLocal(
        APP_CONFIG.storageKeys.historialCache,
        limpio.map(({ detecciones, ...rest }) => rest)
      );
    } catch (e) {
      console.log('cargarTodo', e?.message);
      setOffline(true);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  // El backend no tiene cursor: se pide `hasta` = día de la medición más antigua
  // cargada y se deduplica por id_medicion (ver paginaAnterior en src/logic.js).
  const cargarMasMediciones = async () => {
    if (cargandoMas) return;
    const pagina = paginaAnterior(mediciones);
    if (!pagina) return;
    const sesion = sesionRef.current;
    setCargandoMas(true);
    try {
      const resp = await getMedicionesRecientes(undefined, pagina.limit, { hasta: pagina.hasta });
      if (sesion !== sesionRef.current) return;
      const lista = Array.isArray(resp) ? resp : resp?.mediciones || resp?.items || [];
      const nuevas = lista.map(({ mascaras, ...rest }) => rest);
      const { agregadas } = mezclarMediciones(mediciones, nuevas);
      // Actualización funcional: no pisa una medición subida mientras se esperaba.
      setMediciones((prev) => mezclarMediciones(prev, nuevas).lista);
      setHayMasMediciones(calcularHayMas(resp, pagina.limit, agregadas));
    } catch (e) {
      console.log('cargarMasMediciones', e?.message);
      avisar('No se pudieron cargar más mediciones', e.message || 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setCargandoMas(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarTodo(false);
  };

  // ───────────────────────── auth handlers ─────────────────────────
  // Aplica el resultado de signIn() a la UI (se usa en el intento normal y en
  // el reintento tras cerrar una sesión vieja, ver handleLogin más abajo).
  const aplicarResultadoSignIn = (res) => {
    if (res.isSignedIn || res.nextStep?.signInStep === 'DONE') {
      setLogged(true);
    } else if (res.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      setNeedsNewPass(true);
      setAuthError('Tu contraseña es temporal. Define una nueva.');
    } else {
      setAuthError(`Paso adicional requerido: ${res.nextStep?.signInStep || 'desconocido'}`);
    }
  };

  const handleLogin = async () => {
    setAuthError('');
    if (!email.trim() || !pass) {
      setAuthError('Escribe tu correo y contraseña.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await signIn({ username: email.trim(), password: pass });
      aplicarResultadoSignIn(res);
    } catch (e) {
      if (e?.name === 'UserAlreadyAuthenticatedException') {
        // Quedó una sesión vieja en el dispositivo (misma app/package de una
        // instalación anterior). No sabemos si es la misma cuenta que se
        // está intentando entrar ahora, así que la cerramos y reintentamos
        // el login real con las credenciales escritas — nunca asumimos que
        // "ya hay sesión" == "es la persona correcta".
        try {
          await signOut();
          const res = await signIn({ username: email.trim(), password: pass });
          aplicarResultadoSignIn(res);
        } catch (e2) {
          console.log('signIn retry error', e2?.name, e2?.message, e2?.underlyingError);
          setAuthError(traducirAuthError(e2));
        }
      } else {
        console.log('signIn error', e?.name, e?.message, e?.underlyingError);
        setAuthError(traducirAuthError(e));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleNewPassword = async () => {
    setAuthError('');
    if (newPass.length < 8) {
      setAuthError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await confirmSignIn({ challengeResponse: newPass });
      if (res.isSignedIn) {
        setNeedsNewPass(false);
        setLogged(true);
      } else {
        setAuthError('No se pudo completar el cambio de contraseña.');
      }
    } catch (e) {
      setAuthError(traducirAuthError(e));
    } finally {
      setAuthBusy(false);
    }
  };

  // Deja la app como recién abierta: nada de la sesión anterior debe verse ni
  // filtrarse al siguiente usuario que inicie sesión en este dispositivo.
  const reiniciarEstadoSesion = () => {
    sesionRef.current += 1;
    setLogged(false);
    setPerfil(null);
    setIndicadoresServidor(null);
    setMediciones([]);
    setHayMasMediciones(false);
    setCargandoMas(false);
    setBloques([]);
    setBloqueMap({});
    setObsMap({});
    setLoadingData(false);
    setRefreshing(false);
    setOffline(false);
    // login
    setEmail('');
    setPass('');
    setNewPass('');
    setNeedsNewPass(false);
    setAuthBusy(false);
    setAuthError('');
    // navegación
    setTab('home');
    setScreen('home');
    setFolderClave(null);
    setDetalle(null);
    // flujo de medición
    setBloqueSel('');
    fijarLoteId('');
    setLoteNombreInput('');
    setGps(null);
    setGpsError('');
    setFoto(null);
    fijarCola([]);
    analizandoRef.current = false;
    setLugar(null);
    setEtapaSubida('');
    setResultado(null);
    setEspesor('');
    setDescripcion('');
    setObsOpen(false);
    setObsSaved(false);
    // modales
    setConfirmModal({ visible: false, title: '', message: '', variant: 'primary', onConfirm: null, onCancel: null });
    setPromptModal({ visible: false, title: '', message: '', initialValue: '', onConfirm: null });
  };

  const handleLogout = async () => {
    setConfirmModal({
      visible: true,
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres salir de tu cuenta?',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          await signOut();
        } catch {}
        await clearLocalData();
        reiniciarEstadoSesion();
      },
    });
  };

  // ───────────────────────── flujo de medición ─────────────────────────
  const irANuevaMedicion = async ({ mantenerLote = false } = {}) => {
    if (!mantenerLote) {
      setBloqueSel('');
      fijarLoteId('');
      setLoteNombreInput('');
    }
    setFoto(null);
    fijarCola([]);
    setGps(null);
    setGpsError('');
    setResultado(null);
    setEspesor('');
    setDescripcion('');
    setObsOpen(false);
    setObsSaved(false);
    setLugar(null);
    if (mantenerLote && bloqueSel) {
      setScreen('camera');
    } else {
      setScreen('context');
    }
    try {
      const loc = await getCurrentLocation();
      setGps(loc);
      reverseGeocode(loc.lat, loc.lng)
        .then((l) => setLugar(l))
        .catch(() => {});
    } catch (e) {
      setGpsError(e.message || 'No se pudo obtener la ubicación.');
    }
  };

  // Atrás desde el resultado: vuelve al inicio sin cerrar el lote (se puede seguir
  // agregando fotos); cerrar el lote es una acción explícita (terminarLote).
  const irAInicioConservandoLote = () => {
    setScreen('home');
    setTab('home');
  };

  const terminarLote = () => {
    setBloqueSel('');
    fijarLoteId('');
    setLoteNombreInput('');
    setScreen('home');
    setTab('home');
  };

  const capturar = async (fromCamera) => {
    try {
      if (fromCamera) {
        const f = await pickPhoto({ fromCamera: true });
        if (!f) return;
        const err = validarFoto(f);
        if (err) {
          avisar('Foto no válida', err);
          return;
        }
        setFoto(f);
        fijarCola([{ ...f, status: 'esperando' }]);
        setScreen('preview');
      } else {
        const fotosSeleccionadas = await pickPhotos({ fromCamera: false, allowsMultiple: true });
        if (!fotosSeleccionadas || !fotosSeleccionadas.length) return;
        const validas = [];
        for (const item of fotosSeleccionadas) {
          if (!validarFoto(item)) {
            validas.push({ ...item, status: 'esperando' });
          }
        }
        if (!validas.length) {
          avisar('Fotos no válidas', 'Ninguna de las fotos seleccionadas cumple los requisitos de resolución.');
          return;
        }
        setFoto(validas[0]);
        fijarCola(validas);
        setScreen('preview');
      }
    } catch (e) {
      avisar('Cámara / Galería', e.message || 'No se pudo acceder a las fotos.');
    }
  };

  // Envía las fotos de la cola que aún no están `lista`. Un reintento solo reenvía las
  // fallidas y reutiliza el imagen_key de las que ya llegaron a S3 (POST /medicion es
  // idempotente por imagen_key), así que nunca duplica una medición ya analizada.
  const analizar = async () => {
    if (analizandoRef.current || !colaRef.current.length || !bloqueSel) return;
    analizandoRef.current = true;
    setScreen('analyzing');
    setResultado(null);
    setEtapaSubida('');

    const bloqueElegido = bloquesMap[bloqueSel];
    const gpsUsar = gps || { lat: bloqueElegido?.lat, lng: bloqueElegido?.lng };
    const bloquesNuevos = {};

    try {
      const notas = construirNotas(nombreCortoBloque(bloqueElegido, bloqueSel), descripcion);
      const bloqueIdReal = await resolverBloqueId({ bloque: bloqueElegido });
      if (!loteIdRef.current && loteNombreInput) fijarLoteId(`lote_${Date.now()}`);

      for (let i = 0; i < colaRef.current.length; i++) {
        const itemFoto = colaRef.current[i];
        if (itemFoto.status === 'lista') continue;
        actualizarFoto(i, { status: 'subiendo', error: undefined });

        try {
          const { medicion } = await subirMedicion({
            foto: itemFoto,
            gps: gpsUsar,
            bloqueId: bloqueIdReal,
            loteId: loteIdRef.current || undefined,
            loteNombre: loteNombreInput || undefined,
            notas,
            imagenKey: itemFoto.imagenKey,
            onImagenKey: (k) => actualizarFoto(i, { imagenKey: k }),
            onEtapa: (e) => setEtapaSubida(e),
          });

          actualizarFoto(i, { status: 'lista', medicion, error: undefined });
          bloquesNuevos[medicion.id_medicion] = bloqueIdReal;
          setBloqueMap((prev) => ({ ...prev, [medicion.id_medicion]: bloqueIdReal }));

          guardarFotoLocal({
            uri: itemFoto.uri,
            base64: itemFoto.base64,
            bloque: bloqueIdReal,
            id: medicion.id_medicion,
            ts: medicion.timestamp,
            meta: {
              nivel_corrosion: medicion.nivel_corrosion,
              area_corroida_pct: medicion.area_corroida_pct,
              confianza_promedio: medicion.confianza_promedio,
            },
          });

          const { mascaras, ...ligera } = medicion;
          const medConFoto = { ...ligera, url_imagen: medicion.url_imagen || itemFoto.uri, _localUri: itemFoto.uri };
          setMediciones((prev) => [medConFoto, ...prev.filter((m) => m.id_medicion !== medicion.id_medicion)]);
        } catch (errFoto) {
          actualizarFoto(i, { status: 'error', error: errFoto.message || 'No se pudo analizar la foto.' });
        }
      }

      // Se persiste una sola vez, mezclando con lo ya guardado (no con un estado capturado).
      if (Object.keys(bloquesNuevos).length) {
        const guardado = await loadLocal(APP_CONFIG.storageKeys.bloquePorMedicion, {});
        await saveLocal(APP_CONFIG.storageKeys.bloquePorMedicion, { ...guardado, ...bloquesNuevos });
      }

      setEtapaSubida('completado');

      // La imagen y el análisis que se muestran salen del MISMO ítem de la cola.
      const { ultimaLista } = resumirCola(colaRef.current);
      if (!ultimaLista) {
        throw new Error(resumirCola(colaRef.current).primerError || 'No se pudo procesar ninguna foto.');
      }
      const { mascaras, ...ligera } = ultimaLista.medicion;
      setResultado({
        ...ligera,
        url_imagen: ultimaLista.medicion.url_imagen || ultimaLista.uri,
        _localUri: ultimaLista.uri,
      });
      setScreen('result');
    } catch (e) {
      setConfirmModal({
        visible: true,
        title: 'Error en el análisis',
        message: e.message || 'Error del servidor.',
        confirmLabel: 'Reintentar',
        cancelLabel: 'Volver',
        onConfirm: () => {
          cerrarConfirm();
          analizar();
        },
        // Nunca dejar al usuario atrapado en "analyzing": volver a revisar la foto.
        onCancel: () => setScreen('preview'),
      });
    } finally {
      analizandoRef.current = false;
    }
  };

  const guardarObs = async () => {
    if (!resultado) return;
    const nuevo = { ...obsMap, [resultado.id_medicion]: { espesor, descripcion } };
    setObsMap(nuevo);
    await saveLocal(APP_CONFIG.storageKeys.obsPorMedicion, nuevo);
    setObsSaved(true);
  };

  const abrirDetalle = (m) => {
    setDetalle(m);
    setScreen('detail');
  };

  const compartir = async (m) => {
    try {
      const s = severidad(m);
      await Share.share({
        message:
          `PIXELRUST — ${bloqueDeMedicion(m, bloqueMap) ? 'Bloque ' + bloqueDeMedicion(m, bloqueMap) : 'Medición'}\n` +
          `Corrosión: ${s.label} (${num(m.area_corroida_pct, 0).toFixed(1)}%)\n` +
          `Confianza: ${confianzaPct(m.confianza_promedio)}%\n` +
          `Fecha: ${formatDateTime(m.timestamp)}`,
      });
    } catch {}
  };

  const renombrarFoto = (m) => {
    if (!puedeGestionarMedicion(perfil, m)) return;
    setPromptModal({
      visible: true,
      title: 'Renombrar foto',
      message: 'Ingresa el nuevo nombre descriptivo para esta medición:',
      initialValue: m.nombre || '',
      placeholder: 'Ej. Cara norte, Viga 4B',
      onConfirm: async (nuevoNombre) => {
        setPromptModal((prev) => ({ ...prev, visible: false }));
        if (!nuevoNombre || !nuevoNombre.trim()) return;
        try {
          await renombrarMedicion(m.id_punto, m.id_medicion, nuevoNombre.trim());
          const act = { ...m, nombre: nuevoNombre.trim() };
          setDetalle(act);
          setMediciones((prev) => prev.map((x) => (x.id_medicion === m.id_medicion ? act : x)));
        } catch (e) {
          avisar('No se pudo renombrar', e.message || 'Error del servidor.');
        }
      },
    });
  };

  const borrar = (m) => {
    if (!puedeGestionarMedicion(perfil, m)) return;
    setConfirmModal({
      visible: true,
      title: 'Eliminar medición',
      message: 'Esta acción no se puede deshacer. Se borrará la foto y el registro.',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          await eliminarMedicion(m.id_punto, m.id_medicion);
          setMediciones((prev) => prev.filter((x) => x.id_medicion !== m.id_medicion));
          setDetalle(null);
          setScreen(folderClave ? 'folder' : tab);
        } catch (e) {
          avisar('No se pudo eliminar', e.message || 'Error del servidor.');
        }
      },
    });
  };

  // ───────────────────────── render ─────────────────────────
  // Los modales se montan una sola vez en la raíz para que sean visibles en
  // todas las pantallas (detalle, carpeta, contexto, cámara, análisis, etc.).
  const modales = (
    <>
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={cancelarConfirm}
      />
      <PromptModal
        visible={promptModal.visible}
        title={promptModal.title}
        message={promptModal.message}
        initialValue={promptModal.initialValue}
        placeholder={promptModal.placeholder}
        onConfirm={promptModal.onConfirm}
        onCancel={() => setPromptModal((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );

  const renderPantalla = () => {
    if (booting) {
      return (
        <Screen center style={{ gap: 18 }}>
          <Logo size={16} />
          <Spinner />
        </Screen>
      );
    }

    if (!logged) {
      return (
        <LoginScreen
          {...{
            email,
            setEmail,
            pass,
            setPass,
            newPass,
            setNewPass,
            needsNewPass,
            authBusy,
            authError,
            onLogin: handleLogin,
            onNewPassword: handleNewPassword,
          }}
        />
      );
    }

    // pantallas de flujo (sin tab bar)
    if (screen === 'context')
      return (
        <ContextScreen
          gps={gps}
          gpsError={gpsError}
          lugar={lugar}
          bloques={listaBloques}
          bloqueSel={bloqueSel}
          setBloqueSel={setBloqueSel}
          loteNombre={loteNombreInput}
          setLoteNombre={setLoteNombreInput}
          onBack={() => setScreen('home')}
          onNext={() => setScreen('camera')}
        />
      );

    if (screen === 'camera')
      return (
        <CameraScreen
          bloqueSel={bloqueSelLabel}
          onBack={() => setScreen('context')}
          onPick={capturar}
        />
      );

    if (screen === 'preview')
      return (
        <PreviewScreen
          foto={foto}
          bloqueSel={bloqueSelLabel}
          onBack={() => setScreen('camera')}
          onConfirm={analizar}
        />
      );

    if (screen === 'analyzing')
      return <AnalyzingScreen etapa={etapaSubida} colaFotos={colaFotos} bloqueSel={bloqueSelLabel} />;

    if (screen === 'result' && resultado)
      return (
        <ResultScreen
          medicion={resultado}
          bloqueSel={bloqueSelLabel}
          loteNombre={loteNombreInput}
          espesor={espesor}
          setEspesor={setEspesor}
          descripcion={descripcion}
          setDescripcion={setDescripcion}
          obsOpen={obsOpen}
          setObsOpen={setObsOpen}
          obsSaved={obsSaved}
          onSaveObs={guardarObs}
          onNext={() => irANuevaMedicion({ mantenerLote: true })}
          onTerminarLote={terminarLote}
          resumenLote={resumirCola(colaFotos)}
          onReintentar={analizar}
          onBack={irAInicioConservandoLote}
          onHome={terminarLote}
        />
      );

    if (screen === 'detail' && detalle) {
      const detalleClaveBloque = bloqueDeMedicion(detalle, bloqueMap, listaBloques);
      const puedeGestionar = puedeGestionarMedicion(perfil, detalle);

      return (
        <DetailScreen
          medicion={detalle}
          bloque={detalleClaveBloque ? nombreCortoBloque(bloquesMap[detalleClaveBloque], detalleClaveBloque) : null}
          obs={obsMap[detalle.id_medicion]}
          puedeGestionar={puedeGestionar}
          onBack={() => setScreen(folderClave ? 'folder' : tab)}
          onShare={() => compartir(detalle)}
          onRename={() => renombrarFoto(detalle)}
          onDelete={() => borrar(detalle)}
        />
      );
    }

    if (screen === 'folder' && folderClave)
      return (
        <FolderScreen
          clave={folderClave}
          mediciones={mediciones}
          bloqueMap={bloqueMap}
          bloquesMap={bloquesMap}
          listaBloques={listaBloques}
          onBack={() => setScreen('folders')}
          onOpen={abrirDetalle}
        />
      );

    // pantallas con tab bar
    const setTabAndScreen = (k) => {
      setTab(k);
      setScreen(k);
      setFolderClave(null);
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {tab === 'home' && (
          <HomeScreen
            nombre={nombre}
            iniciales={iniciales}
            stats={stats}
            indicadoresServidor={indicadoresServidor}
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            bloquesMap={bloquesMap}
            offline={offline}
            loading={loadingData}
            refreshing={refreshing}
            esCliente={esCliente}
            onRefresh={onRefresh}
            onNueva={irANuevaMedicion}
            onOpen={abrirDetalle}
            onSettings={() => setTabAndScreen('settings')}
          />
        )}
        {tab === 'lotes' && (
          <LotesScreen
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            bloquesMap={bloquesMap}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpen={abrirDetalle}
            hayMas={hayMasMediciones}
            cargandoMas={cargandoMas}
            onCargarMas={cargarMasMediciones}
            puedeRenombrarLote={(items) => puedeGestionarLote(perfil, items)}
            onRenameLote={async (items, nuevo) => {
              try {
                await renombrarLote(items, nuevo);
                await cargarTodo(false);
              } catch (e) {
                avisar('No se pudo renombrar el lote', e.message || 'Error del servidor.');
              }
            }}
          />
        )}
        {tab === 'folders' && (
          <FoldersScreen
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            listaBloques={listaBloques}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpen={(clave) => {
              setFolderClave(clave);
              setScreen('folder');
            }}
          />
        )}
        {tab === 'activity' && (
          <ActivityScreen
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            bloquesMap={bloquesMap}
            refreshing={refreshing}
            hayMas={hayMasMediciones}
            cargandoMas={cargandoMas}
            onCargarMas={cargarMasMediciones}
            onRefresh={onRefresh}
            onOpen={abrirDetalle}
          />
        )}
        {tab === 'settings' && (
          <SettingsScreen perfil={perfil} nombre={nombre} iniciales={iniciales} onLogout={handleLogout} />
        )}
      </View>
      <TabBar current={tab} onChange={setTabAndScreen} items={TABS} />
    </Screen>
  );
  };

  return (
    <>
      {renderPantalla()}
      {modales}
    </>
  );
}
