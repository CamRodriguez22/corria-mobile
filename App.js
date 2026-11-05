import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  Image,
  StatusBar,
  Share,
  KeyboardAvoidingView,
  Platform,
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
  Button,
  Field,
  SeverityBadge,
  StatCard,
  MeasurementRow,
  ProgressBar,
  Spinner,
  Segmented,
  EmptyState,
  KeyValueCard,
  Header,
  TabBar,
  ResultCard,
  ConfirmModal,
  PromptModal,
} from './src/DesignComponents';
import { IconLotes, IconPuntos } from './src/Icons';
import {
  AWS_CONFIG,
  APP_CONFIG,
  LISTA_BLOQUES,
  ENTIDAD,
  CIUDAD,
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
  formatDate,
  formatDateTime,
  calcularEstadisticas,
  saveLocal,
  loadLocal,
  clearLocalData,
  guardarFotoLocal,
  bloqueDeMedicion,
  agruparPorBloque,
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

const PAD = TOKENS.spacing.lg;

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
  const [cursorPaginacion, setCursorPaginacion] = useState(null);
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
  const [lugar, setLugar] = useState(null); // { ciudad, barrio, direccion } del reverse-geocode
  const [etapaSubida, setEtapaSubida] = useState(''); // preparando_subida | subiendo_s3 | analizando_ia | completado
  const [resultado, setResultado] = useState(null);
  const [espesor, setEspesor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [obsOpen, setObsOpen] = useState(false);
  const [obsSaved, setObsSaved] = useState(false);

  // modales interactivos (reemplazo de Alert.alert y Alert.prompt en web y móvil)
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', variant: 'primary', onConfirm: null });
  const [promptModal, setPromptModal] = useState({ visible: false, title: '', message: '', initialValue: '', onConfirm: null });

  const nombre = perfil?.nombre || (perfil?.email || email).split('@')[0] || 'Usuario';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  const esAdmin = (perfil?.rol || '').toLowerCase() === 'admin';
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
        terminarLote();
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
  }, [screen, tab, folderClave]);

  const cargarTodo = useCallback(async (first = false) => {
    if (first) setLoadingData(true);
    // cache local primero (para pintar algo sin red)
    const [cache, bmap, omap] = await Promise.all([
      loadLocal(APP_CONFIG.storageKeys.historialCache, []),
      loadLocal(APP_CONFIG.storageKeys.bloquePorMedicion, {}),
      loadLocal(APP_CONFIG.storageKeys.obsPorMedicion, {}),
    ]);
    setBloqueMap(bmap || {});
    setObsMap(omap || {});
    if (Array.isArray(cache) && cache.length) setMediciones(cache);

    try {
      const [p, respMeds, blqs, inds] = await Promise.all([
        getMiPerfil().catch(() => null),
        getMedicionesRecientes(undefined, 30).catch(() => ({ mediciones: [] })),
        getBloques().catch(() => null),
        getIndicadores().catch(() => null),
      ]);
      if (p) setPerfil(p);
      if (inds) setIndicadoresServidor(inds);
      if (Array.isArray(blqs)) setBloques(blqs.map(adaptarBloque));

      const lista = Array.isArray(respMeds) ? respMeds : respMeds?.mediciones || respMeds?.items || [];
      setCursorPaginacion(respMeds?.cursor || null);
      setHayMasMediciones(Boolean(respMeds?.cursor));

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

  const cargarMasMediciones = async () => {
    if (!cursorPaginacion || cargandoMas) return;
    setCargandoMas(true);
    try {
      const resp = await getMedicionesRecientes(undefined, 30, cursorPaginacion);
      const lista = Array.isArray(resp) ? resp : resp?.mediciones || resp?.items || [];
      setCursorPaginacion(resp?.cursor || null);
      setHayMasMediciones(Boolean(resp?.cursor));
      if (lista.length) {
        const nuevo = lista
          .map(({ mascaras, ...rest }) => rest)
          .sort((a, z) => new Date(z.timestamp || 0) - new Date(a.timestamp || 0));
        setMediciones((prev) => {
          const ids = new Set(prev.map((m) => m.id_medicion));
          return [...prev, ...nuevo.filter((m) => !ids.has(m.id_medicion))];
        });
      }
    } catch (e) {
      console.log('cargarMasMediciones', e?.message);
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
        setLogged(false);
        setPerfil(null);
        setMediciones([]);
        setBloques([]);
        setBloqueMap({});
        setObsMap({});
        setPass('');
        setNewPass('');
        setNeedsNewPass(false);
        setTab('home');
        setScreen('home');
      },
    });
  };

  // ───────────────────────── flujo de medición ─────────────────────────
  const irANuevaMedicion = async ({ mantenerLote = false } = {}) => {
    if (!mantenerLote) {
      setBloqueSel('');
      setLoteIdActual('');
      setLoteNombreInput('');
    }
    setFoto(null);
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

  const terminarLote = () => {
    setBloqueSel('');
    setLoteIdActual('');
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
          setConfirmModal({
            visible: true,
            title: 'Foto no válida',
            message: err,
            confirmLabel: 'Entendido',
            cancelLabel: '',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
          return;
        }
        setFoto(f);
        setColaFotos([{ ...f, status: 'esperando' }]);
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
          setConfirmModal({
            visible: true,
            title: 'Fotos no válidas',
            message: 'Ninguna de las fotos seleccionadas cumple los requisitos de resolución.',
            confirmLabel: 'Entendido',
            cancelLabel: '',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
          return;
        }
        setFoto(validas[0]);
        setColaFotos(validas);
        setScreen('preview');
      }
    } catch (e) {
      setConfirmModal({
        visible: true,
        title: 'Cámara / Galería',
        message: e.message || 'No se pudo acceder a las fotos.',
        confirmLabel: 'Entendido',
        cancelLabel: '',
        onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const analizar = async () => {
    if (!colaFotos.length || !bloqueSel) return;
    setScreen('analyzing');
    setResultado(null);

    const bloqueElegido = bloquesMap[bloqueSel];
    let gpsUsar = gps;
    if (!gpsUsar) {
      gpsUsar = { lat: bloqueElegido?.lat, lng: bloqueElegido?.lng };
    }

    try {
      const notas = construirNotas(nombreCortoBloque(bloqueElegido, bloqueSel), descripcion);
      const bloqueIdReal = await resolverBloqueId({ bloque: bloqueElegido });
      let idLoteParaSubir = loteIdActual;
      if (!idLoteParaSubir && loteNombreInput) {
        idLoteParaSubir = `lote_${Date.now()}`;
        setLoteIdActual(idLoteParaSubir);
      }

      let ultimaMedicion = null;
      const colaActualizada = [...colaFotos];

      for (let i = 0; i < colaActualizada.length; i++) {
        const itemFoto = colaActualizada[i];
        itemFoto.status = 'subiendo';
        setColaFotos([...colaActualizada]);

        try {
          const { medicion } = await subirMedicion({
            foto: itemFoto,
            gps: gpsUsar,
            bloqueId: bloqueIdReal,
            loteId: idLoteParaSubir || undefined,
            loteNombre: loteNombreInput || undefined,
            notas,
            onEtapa: (e) => setEtapaSubida(e),
          });

          itemFoto.status = 'lista';
          itemFoto.medicion = medicion;
          ultimaMedicion = medicion;
          setColaFotos([...colaActualizada]);

          const nuevoMap = { ...bloqueMap, [medicion.id_medicion]: bloqueIdReal };
          setBloqueMap(nuevoMap);
          saveLocal(APP_CONFIG.storageKeys.bloquePorMedicion, nuevoMap);

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
          itemFoto.status = 'error';
          itemFoto.error = errFoto.message;
          setColaFotos([...colaActualizada]);
        }
      }

      setEtapaSubida('completado');

      if (ultimaMedicion) {
        const { mascaras, ...ligera } = ultimaMedicion;
        setResultado({ ...ligera, url_imagen: ultimaMedicion.url_imagen || colaFotos[0]?.uri, _localUri: colaFotos[0]?.uri });
        setScreen('result');
      } else {
        throw new Error('No se pudo procesar ninguna foto.');
      }
    } catch (e) {
      setConfirmModal({
        visible: true,
        title: 'Error en el análisis',
        message: e.message || 'Error del servidor.',
        confirmLabel: 'Reintentar',
        cancelLabel: 'Volver',
        onConfirm: () => {
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          analizar();
        },
      });
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
          setConfirmModal({
            visible: true,
            title: 'No se pudo renombrar',
            message: e.message || 'Error del servidor.',
            confirmLabel: 'Entendido',
            cancelLabel: '',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const borrar = (m) => {
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
          setConfirmModal({
            visible: true,
            title: 'No se pudo eliminar',
            message: e.message || 'Error del servidor.',
            confirmLabel: 'Entendido',
            cancelLabel: '',
            onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  // ───────────────────────── render ─────────────────────────
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
        onHome={terminarLote}
      />
    );

  if (screen === 'detail' && detalle) {
    const detalleClaveBloque = bloqueDeMedicion(detalle, bloqueMap, listaBloques);
    const rol = (perfil?.rol || '').toLowerCase();
    const esAdminOSuper = rol === 'admin' || rol === 'super_admin';
    const esPropia = Boolean(perfil?.sub) && (detalle?.tomado_por_id === perfil?.sub || detalle?.usuario_id === perfil?.sub);
    const puedeGestionar = esAdminOSuper || (rol === 'tecnico' && esPropia);

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
            onRenameLote={async (items, nuevo) => {
              try {
                await renombrarLote(items, nuevo);
                await cargarTodo(false);
              } catch (e) {
                setConfirmModal({
                  visible: true,
                  title: 'No se pudo renombrar el lote',
                  message: e.message || 'Error del servidor.',
                  confirmLabel: 'Entendido',
                  cancelLabel: '',
                  onConfirm: () => setConfirmModal((prev) => ({ ...prev, visible: false })),
                });
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
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
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
    </Screen>
  );
}

// ═══════════════════════════ LOGIN ═══════════════════════════
function LoginScreen({
  email,
  setEmail,
  pass,
  setPass,
  newPass,
  setNewPass,
  needsNewPass,
  authBusy,
  authError,
  onLogin,
  onNewPassword,
}) {
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: PAD, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ height: 24 }} />
          <Logo size={18} />
        <Text style={{ fontSize: 40, fontWeight: '800', color: TOKENS.colors.text, marginTop: 20 }}>
          PIXELRUST
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral600, marginTop: 8 }}>
          Detección de corrosión
        </Text>

        <View style={{ marginTop: 32, backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: PAD, ...TOKENS.shadow.sm }}>
          {needsNewPass ? (
            <>
              <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral700, marginBottom: 18 }}>
                Define tu nueva contraseña
              </Text>
              <Field
                label="Nueva contraseña"
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
              />
              {!!authError && <ErrorText text={authError} />}
              <Button label="Guardar y entrar" onPress={onNewPassword} loading={authBusy} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: TOKENS.fontSizes.body, color: TOKENS.colors.neutral700, marginBottom: 18 }}>
                Ingresa tu usuario y contraseña
              </Text>
              <Field
                label="Usuario o correo"
                value={email}
                onChangeText={setEmail}
                placeholder="usuario@ejemplo.com"
                keyboardType="email-address"
              />
              <Field
                label="Contraseña"
                value={pass}
                onChangeText={setPass}
                placeholder="••••••••"
                secureTextEntry
              />
              {!!authError && <ErrorText text={authError} />}
              <Button label="Iniciar sesión" onPress={onLogin} loading={authBusy} />
              <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 14 }}>
                ¿Olvidaste tu contraseña? Contacta al administrador de tu organización para restablecer tu acceso.
              </Text>
            </>
          )}
        </View>

        <View style={{ flex: 1 }} />
        <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 40 }}>
          © 2026 PIXELRUST · Inspección asistida por IA
        </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ═══════════════════════════ HOME ═══════════════════════════
function HomeScreen({
  nombre,
  iniciales,
  stats,
  indicadoresServidor,
  mediciones,
  bloqueMap,
  bloquesMap,
  offline,
  loading,
  refreshing,
  esCliente,
  onRefresh,
  onNueva,
  onOpen,
  onSettings,
}) {
  const recientes = mediciones.slice(0, 4);

  // Totales reales del servidor (como la web) o cálculo de las cargadas como fallback
  const totalMediciones = indicadoresServidor?.mediciones_30d != null
    ? indicadoresServidor.mediciones_30d
    : stats.total;
  const totalPuntos = indicadoresServidor?.total_puntos != null
    ? indicadoresServidor.total_puntos
    : Object.keys(bloquesMap).length;
  const puntosSeveros = indicadoresServidor?.por_nivel?.[3] ?? stats.severas;

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>Hola,</Text>
          <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text, marginTop: 2 }}>
            {nombre}
          </Text>
        </View>
        <Pressable
          onPress={onSettings}
          accessibilityRole="button"
          accessibilityLabel="Abrir ajustes"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TOKENS.colors.accent200, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '800', color: TOKENS.colors.accent800 }}>{iniciales}</Text>
        </Pressable>
      </View>

      {offline && (
        <View style={{ marginTop: 14, backgroundColor: TOKENS.colors.warningTint, borderRadius: TOKENS.radius.md, padding: 12 }}>
          <Text style={{ color: TOKENS.colors.warning, fontSize: TOKENS.fontSizes.small, fontWeight: '600' }}>
            Sin conexión — mostrando datos guardados.
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: TOKENS.spacing.sm, marginTop: 18 }}>
        <StatCard value={totalMediciones} label="En 30 días" />
        <StatCard value={puntosSeveros} label="Puntos severos" color={TOKENS.colors.danger} />
        <StatCard value={totalPuntos} label="Puntos activos" color={TOKENS.colors.accent2_800} />
      </View>

      {!esCliente && (
        <View style={{ marginTop: 18 }}>
          <Button label="＋  Nueva medición" onPress={onNueva} accessibilityHint="Abre la cámara para una nueva inspección" />
        </View>
      )}

      <Text style={{ fontSize: TOKENS.fontSizes.h6, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.colors.neutral600, marginTop: 26, marginBottom: 12 }}>
        Mediciones recientes
      </Text>

      {loading && !mediciones.length ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Spinner />
        </View>
      ) : recientes.length ? (
        recientes.map((m) => (
          <MeasurementRow
            key={m.id_medicion}
            medicion={m}
            title={tituloBloque(m, bloqueMap, bloquesMap)}
            subtitle={`${formatDate(m.timestamp)} · ${num(m.area_corroida_pct, 0).toFixed(0)}% corroído`}
            onPress={() => onOpen(m)}
          />
        ))
      ) : (
        <EmptyState title="Aún no hay mediciones" subtitle="Toca “Nueva medición” para analizar tu primera foto de corrosión." />
      )}
    </ScrollView>
  );
}

// ═══════════════════════════ LOTES ═══════════════════════════
function LotesScreen({ mediciones, bloqueMap, bloquesMap, refreshing, onRefresh, onOpen, onRenameLote }) {
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);
  const [renombrandoLote, setRenombrandoLote] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');

  // Agrupar mediciones por lote_id o lote_nombre
  const lotes = useMemo(() => {
    const mapa = {};
    for (const m of mediciones) {
      const loteClave = m.lote_id || m.lote_nombre || 'Sin lote';
      if (!mapa[loteClave]) {
        mapa[loteClave] = {
          id: loteClave,
          nombre: m.lote_nombre || (m.lote_id ? `Lote ${m.lote_id.slice(-6)}` : 'Sin lote'),
          items: [],
          puntoId: m.punto_id || m.id_punto,
          fechaReciente: m.timestamp || 0,
        };
      }
      mapa[loteClave].items.push(m);
      if (new Date(m.timestamp || 0) > new Date(mapa[loteClave].fechaReciente)) {
        mapa[loteClave].fechaReciente = m.timestamp;
      }
    }

    return Object.values(mapa).map((lote) => {
      const pcts = lote.items.map((i) => num(i.area_corroida_pct, 0));
      const maxPct = pcts.length ? Math.max(...pcts) : 0;
      const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
      const primerItem = lote.items[0];
      return {
        ...lote,
        maxPct,
        avgPct,
        maxNivel: primerItem ? severidad({ area_corroida_pct: maxPct }) : null,
        puntoTitulo: tituloBloque(primerItem, bloqueMap, bloquesMap),
      };
    }).sort((a, b) => new Date(b.fechaReciente) - new Date(a.fechaReciente));
  }, [mediciones, bloqueMap, bloquesMap]);

  if (loteSeleccionado) {
    const lote = lotes.find((l) => l.id === loteSeleccionado);
    if (!lote) {
      setLoteSeleccionado(null);
      return null;
    }
    return (
      <ScrollView
        contentContainerStyle={{ padding: PAD, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
      >
        <Pressable
          onPress={() => setLoteSeleccionado(null)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, paddingVertical: 4 }}
        >
          <Text style={{ fontSize: 16, color: TOKENS.colors.accent, fontWeight: '700' }}>← Volver a lotes</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>
              {lote.nombre}
            </Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4 }}>
              {lote.puntoTitulo} · {lote.items.length} {lote.items.length === 1 ? 'foto' : 'fotos'}
            </Text>
          </View>
          {onRenameLote && lote.id !== 'Sin lote' && (
            <Button
              title="Renombrar"
              variant="outline"
              size="sm"
              onPress={() => {
                setNuevoNombre(lote.nombre);
                setRenombrandoLote(lote);
              }}
            />
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 12, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, textTransform: 'uppercase', fontWeight: '700' }}>Promedio</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: TOKENS.colors.text, marginTop: 2 }}>{lote.avgPct.toFixed(1)}%</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: TOKENS.colors.surfaceAlt, padding: 12, borderRadius: TOKENS.radius.md, borderWidth: 1, borderColor: TOKENS.colors.border }}>
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, textTransform: 'uppercase', fontWeight: '700' }}>Máximo</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: lote.maxNivel?.color || TOKENS.colors.text, marginTop: 2 }}>{lote.maxPct.toFixed(1)}%</Text>
          </View>
        </View>

        <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text, marginBottom: 10 }}>
          Fotos del lote
        </Text>
        {lote.items.map((m) => (
          <MeasurementRow
            key={m.id_medicion}
            medicion={m}
            title={formatDate(m.timestamp)}
            subtitle={`${num(m.area_corroida_pct, 0).toFixed(1)}% corroído · Nivel ${m.nivel_corrosion ?? m.nivel ?? '—'}`}
            onPress={() => onOpen(m)}
          />
        ))}

        {renombrandoLote && (
          <PromptModal
            visible={Boolean(renombrandoLote)}
            title="Renombrar lote"
            message={`Ingresa el nuevo nombre para este lote de ${renombrandoLote.items.length} fotos:`}
            value={nuevoNombre}
            onChangeText={setNuevoNombre}
            onCancel={() => setRenombrandoLote(null)}
            onConfirm={async () => {
              const target = renombrandoLote;
              setRenombrandoLote(null);
              if (target && nuevoNombre.trim() && nuevoNombre.trim() !== target.nombre) {
                const itemsPayload = target.items.map((i) => ({
                  id_punto: i.id_punto || i.punto_id,
                  id_medicion: i.id_medicion,
                }));
                await onRenameLote(itemsPayload, nuevoNombre.trim());
              }
            }}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Lotes</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 6, marginBottom: 16 }}>
        Grupos de inspección por fecha o campaña
      </Text>

      {lotes.length === 0 ? (
        <EmptyState title="No hay lotes registrados" subtitle="Las fotos que tomes en grupo aparecerán organizadas aquí." />
      ) : (
        lotes.map((lote) => (
          <Pressable
            key={lote.id}
            onPress={() => setLoteSeleccionado(lote.id)}
            style={({ pressed }) => [
              {
                backgroundColor: TOKENS.colors.surfaceAlt,
                borderRadius: TOKENS.radius.lg,
                padding: 16,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                opacity: pressed ? 0.85 : 1,
                borderWidth: 1,
                borderColor: TOKENS.colors.border,
                ...TOKENS.shadow.sm,
              },
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: lote.maxNivel?.tint || TOKENS.colors.neutral200,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconLotes size={22} color={lote.maxNivel?.color || TOKENS.colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text }}>
                {lote.nombre}
              </Text>
              <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                {lote.puntoTitulo} · {formatDate(lote.fechaReciente)}
              </Text>
              <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: lote.maxNivel?.color || TOKENS.colors.text, marginTop: 2, fontWeight: '600' }}>
                {lote.items.length} {lote.items.length === 1 ? 'foto' : 'fotos'} · Máx {lote.maxPct.toFixed(1)}% (Nivel {lote.maxNivel?.nivel ?? '—'})
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: TOKENS.colors.neutral400 }}>›</Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

// ═══════════════════════════ FOLDERS ═══════════════════════════
function FoldersScreen({ mediciones, bloqueMap, listaBloques, refreshing, onRefresh, onOpen }) {
  const grupos = useMemo(
    () => agruparPorBloque(mediciones, bloqueMap, listaBloques),
    [mediciones, bloqueMap, listaBloques]
  );
  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Carpetas</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 6 }}>
        Organizadas por bloque del campus
      </Text>

      <View style={{ marginTop: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: TOKENS.colors.accent2_100, borderRadius: TOKENS.radius.lg, padding: 16 }}>
        <IconPuntos size={20} color={TOKENS.colors.accent2_900} />
        <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_900, flex: 1 }}>
          {CIUDAD} · {ENTIDAD}
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_800 }}>
          {mediciones.length}
        </Text>
      </View>

      {grupos.map((g) => (
        <Pressable
          key={g.clave}
          onPress={() => onOpen(g.clave)}
          accessibilityRole="button"
          accessibilityLabel={`${g.bloque.nombre}, ${g.items.length} mediciones`}
          style={({ pressed }) => [
            {
              backgroundColor: TOKENS.colors.surfaceAlt,
              borderRadius: TOKENS.radius.lg,
              padding: 16,
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              opacity: pressed ? 0.85 : 1,
              ...TOKENS.shadow.sm,
            },
          ]}
        >
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: severidad({ area_corroida_pct: g.peorPct }).tint, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: severidad({ area_corroida_pct: g.peorPct }).color }}>
              {g.clave === 'SIN_BLOQUE' ? '—' : inicialBloque(g.bloque?.nombre || g.clave)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text }}>{g.bloque.nombre}</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
              {g.items.length} {g.items.length === 1 ? 'medición' : 'mediciones'}
              {g.items.length ? ` · máx ${g.peorPct.toFixed(0)}%` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: TOKENS.colors.neutral500 }}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function FolderScreen({ clave, mediciones, bloqueMap, bloquesMap, listaBloques, onBack, onOpen }) {
  const bloque = bloquesMap[clave] || { nombre: 'Sin bloque' };
  const items = useMemo(
    () =>
      agruparPorBloque(mediciones, bloqueMap, listaBloques).find((g) => g.clave === clave)?.items || [],
    [mediciones, bloqueMap, listaBloques, clave]
  );
  return (
    <Screen>
      <Header title={bloque.nombre} subtitle={`${CIUDAD} · ${ENTIDAD}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}>
        {items.length ? (
          items.map((m) => (
            <MeasurementRow
              key={m.id_medicion}
              medicion={m}
              title={`${num(m.area_corroida_pct, 0).toFixed(0)}% corroído`}
              subtitle={formatDateTime(m.timestamp)}
              onPress={() => onOpen(m)}
            />
          ))
        ) : (
          <EmptyState title="Carpeta vacía" subtitle="Todavía no hay mediciones en este bloque." />
        )}
      </ScrollView>
    </Screen>
  );
}

// ═══════════════════════════ ACTIVITY ═══════════════════════════
function ActivityScreen({
  mediciones,
  bloqueMap,
  bloquesMap,
  refreshing,
  hayMas,
  cargandoMas,
  onCargarMas,
  onRefresh,
  onOpen,
}) {
  const [filtro, setFiltro] = useState('all');

  const filtradas = useMemo(() => {
    if (filtro === 'all') return mediciones;
    return mediciones.filter((m) => severidad(m).short === filtro);
  }, [mediciones, filtro]);

  // Agrupación cronológica por día (como en la web)
  const eventosPorDia = useMemo(() => {
    const grupos = {};
    for (const m of filtradas) {
      const fecha = m.timestamp ? new Date(m.timestamp) : new Date();
      const fechaClave = !isNaN(fecha.getTime())
        ? fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Recientes';
      if (!grupos[fechaClave]) grupos[fechaClave] = [];
      grupos[fechaClave].push(m);
    }
    return Object.entries(grupos);
  }, [filtradas]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Línea de tiempo</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 4, marginBottom: 14 }}>
        Historial cronológico de inspecciones
      </Text>

      <Segmented
        scroll
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'NINGUNA', label: 'Sin corrosión' },
          { value: 'LEVE', label: 'Leve' },
          { value: 'MODERADA', label: 'Moderada' },
          { value: 'SEVERA', label: 'Severa' },
        ]}
      />

      <View style={{ marginTop: 18 }}>
        {eventosPorDia.length ? (
          eventosPorDia.map(([dia, items]) => (
            <View key={dia} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TOKENS.colors.accent }} />
                <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.neutral800, textTransform: 'capitalize' }}>
                  {dia}
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
                  ({items.length} {items.length === 1 ? 'medición' : 'mediciones'})
                </Text>
              </View>

              <View style={{ paddingLeft: 18, borderLeftWidth: 2, borderLeftColor: TOKENS.colors.neutral200, marginLeft: 3 }}>
                {items.map((m) => {
                  const s = severidad(m);
                  const hora = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  const titulo = m.nombre || tituloBloque(m, bloqueMap, bloquesMap);
                  return (
                    <Pressable
                      key={m.id_medicion}
                      onPress={() => onOpen(m)}
                      accessibilityRole="button"
                      style={{
                        backgroundColor: TOKENS.colors.surfaceAlt,
                        borderRadius: TOKENS.radius.md,
                        padding: 12,
                        marginBottom: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        ...TOKENS.shadow.sm,
                      }}
                    >
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '700', color: TOKENS.colors.text }}>
                            {titulo}
                          </Text>
                          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
                            {hora}
                          </Text>
                        </View>
                        <Text style={{ fontSize: TOKENS.fontSizes.small, color: s.color, fontWeight: '600', marginTop: 2 }}>
                          {num(m.area_corroida_pct, 0).toFixed(1)}% · {s.label}
                        </Text>
                        {!!m.lote_nombre && (
                          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 1 }}>
                            Lote: {m.lote_nombre}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 16, color: TOKENS.colors.neutral400 }}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <View style={{ paddingVertical: 30 }}>
            <EmptyState title="Nada por aquí" subtitle="No hay mediciones con ese filtro." />
          </View>
        )}
        {hayMas && (
          <View style={{ marginTop: 12 }}>
            <Button
              variant="secondary"
              label={cargandoMas ? 'Cargando más…' : 'Cargar mediciones anteriores'}
              onPress={onCargarMas}
              loading={cargandoMas}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════ SETTINGS ═══════════════════════════
function SettingsScreen({ perfil, nombre, iniciales, onLogout }) {
  return (
    <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}>
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Ajustes</Text>

      <View style={{ marginTop: 20, backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, ...TOKENS.shadow.sm }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: TOKENS.colors.accent200, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: TOKENS.fontSizes.h4, fontWeight: '800', color: TOKENS.colors.accent800 }}>{iniciales}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text }}>{nombre}</Text>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>{perfil?.email || '—'}</Text>
        </View>
      </View>

      <View style={{ marginTop: 16 }}>
        <KeyValueCard
          rows={[
            { label: 'Rol', value: perfil?.rol || '—' },
            { label: 'Organización', value: perfil?.empresa_nombre || ENTIDAD },
            { label: 'Ciudad', value: perfil?.empresa_ciudad || CIUDAD },
            { label: 'Versión', value: require('./app.json').expo.version || '2.0.0' },
          ]}
        />
      </View>

      <Button variant="danger" label="Cerrar sesión" onPress={onLogout} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

// ═══════════════════════════ CONTEXT ═══════════════════════════
function ContextScreen({ gps, gpsError, lugar, bloques, bloqueSel, setBloqueSel, loteNombre, setLoteNombre, onBack, onNext }) {
  const ciudadDetectada = lugar?.ciudad || CIUDAD;
  return (
    <Screen>
      <Header title="Nueva medición" subtitle="Selecciona el bloque y lote" onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: PAD, flexGrow: 1 }}>
        <View style={{ backgroundColor: TOKENS.colors.accent2_100, borderRadius: TOKENS.radius.lg, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Text style={{ fontSize: 20 }}>🏛️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TOKENS.fontSizes.small, fontWeight: '700', color: TOKENS.colors.accent2_900 }}>Entidad: {ENTIDAD}</Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.accent2_800 }}>
              Ciudad: {ciudadDetectada}
              {lugar?.barrio ? ` · ${lugar.barrio}` : ''}
            </Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.accent2_800 }}>{formatDateTime()}</Text>
          </View>
        </View>

        <Text style={{ fontSize: TOKENS.fontSizes.h6, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.colors.neutral600, marginTop: 20, marginBottom: 8 }}>
          Lote (opcional)
        </Text>
        <Field
          label="Nombre del lote"
          placeholder="Ej. Inspección Noviembre, Estructura A"
          value={loteNombre}
          onChangeText={setLoteNombre}
        />

        <Text style={{ fontSize: TOKENS.fontSizes.h6, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.colors.neutral600, marginTop: 14, marginBottom: 12 }}>
          Puntos disponibles
        </Text>
        {bloques.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {bloques.map((b) => {
              const active = bloqueSel === b.clave;
              return (
                <Pressable
                  key={b.clave}
                  onPress={() => setBloqueSel(b.clave)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${b.nombre}, ${b.detalle}`}
                  style={{
                    width: '47%',
                    minHeight: 64,
                    borderRadius: TOKENS.radius.md,
                    borderWidth: 1.5,
                    borderColor: active ? TOKENS.colors.accent : TOKENS.colors.neutral300,
                    backgroundColor: active ? TOKENS.colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 12,
                  }}
                >
                  <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '800', color: active ? '#fff' : TOKENS.colors.text }}>
                    {b.nombre}
                  </Text>
                  <Text style={{ fontSize: TOKENS.fontSizes.xs, color: active ? 'rgba(255,255,255,0.85)' : TOKENS.colors.neutral600, marginTop: 2 }}>
                    {b.detalle}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={{ padding: 20, backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '600', color: TOKENS.colors.text, textAlign: 'center' }}>
              Tu zona aún no tiene puntos registrados.
            </Text>
            <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, textAlign: 'center', marginTop: 6 }}>
              Pide a un administrador que los cree en la plataforma web para poder asociar tus inspecciones.
            </Text>
          </View>
        )}

        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: gpsError ? TOKENS.colors.warningTint : TOKENS.colors.accent2_100, borderRadius: TOKENS.radius.pill, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 14 }}>{gpsError ? '⚠️' : '📡'}</Text>
          <Text style={{ fontSize: TOKENS.fontSizes.small, color: gpsError ? TOKENS.colors.warning : TOKENS.colors.accent2_800, flex: 1 }}>
            {gpsError
              ? gpsError
              : gps
              ? `GPS activo · ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`
              : 'Obteniendo ubicación…'}
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ paddingTop: 20 }}>
          <Button
            label="Capturar foto"
            onPress={onNext}
            disabled={!bloqueSel}
            accessibilityHint={!bloqueSel ? 'Primero selecciona un bloque' : undefined}
          />
          <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 12 }}>
            {bloqueSel ? 'Tu ubicación se guardará con la medición' : 'Selecciona un bloque para continuar'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ═══════════════════════════ CAMERA ═══════════════════════════
function CameraScreen({ bloqueSel, onBack, onPick }) {
  return (
    <Screen>
      <Header title="Capturar inspección" subtitle={`Bloque ${bloqueSel}`} onBack={onBack} />
      <View style={{ flex: 1, padding: PAD, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <View style={{ width: 220, height: 220, borderRadius: 24, borderWidth: 2, borderColor: TOKENS.colors.neutral300, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>📷</Text>
          <Text style={{ color: TOKENS.colors.neutral600, marginTop: 8, fontSize: TOKENS.fontSizes.small }}>Mín. 800 × 600 px</Text>
        </View>
        <Text style={{ textAlign: 'center', color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small, maxWidth: 280 }}>
          Enfoca la probeta o zona metálica de frente. Podés tomar una foto en campo o elegir varias fotos de la galería en lote.
        </Text>
      </View>
      <View style={{ padding: PAD, gap: 12 }}>
        <Button label="Tomar foto con cámara" onPress={() => onPick(true)} />
        <Button variant="secondary" label="Elegir foto(s) de la galería" onPress={() => onPick(false)} />
        <Button variant="ghost" label="Volver" onPress={onBack} />
      </View>
    </Screen>
  );
}

// ═══════════════════════════ PREVIEW ═══════════════════════════
function PreviewScreen({ foto, bloqueSel, onBack, onConfirm }) {
  return (
    <Screen>
      <Header title="Revisar foto" subtitle={`Bloque ${bloqueSel} · validada`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: PAD }}>
        {foto?.uri ? (
          <Image
            source={{ uri: foto.uri }}
            style={{ width: '100%', height: 260, borderRadius: TOKENS.radius.lg, backgroundColor: TOKENS.colors.neutral200 }}
            resizeMode="cover"
          />
        ) : null}
        <View style={{ marginTop: 14, backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.lg, padding: 16, gap: 10, ...TOKENS.shadow.sm }}>
          <CheckRow text={`Resolución ${foto?.width || '—'} × ${foto?.height || '—'}`} />
          <CheckRow text="Compresión JPEG 0.6" />
          <CheckRow text={`Bloque ${bloqueSel} + GPS adjuntos`} />
        </View>
      </ScrollView>
      <View style={{ padding: PAD, gap: 10 }}>
        <Button label="Usar foto y analizar" onPress={onConfirm} />
        <Button variant="ghost" label="Retomar" onPress={onBack} />
      </View>
    </Screen>
  );
}

// ═══════════════════════════ ANALYZING ═══════════════════════════
function AnalyzingScreen({ etapa, colaFotos, bloqueSel }) {
  let mensaje = 'Procesando inspección…';
  let detalle = 'Conectando con el servidor';
  if (etapa === 'preparando_subida') {
    mensaje = 'Preparando almacenamiento';
    detalle = 'Generando enlace seguro';
  } else if (etapa === 'subiendo_s3') {
    mensaje = 'Subiendo imagen a la nube';
    detalle = 'Cargando foto en alta resolución';
  } else if (etapa === 'analizando_ia') {
    mensaje = 'Analizando corrosión con IA';
    detalle = 'Segmentando áreas y severidad';
  } else if (etapa === 'completado') {
    mensaje = '¡Análisis completado!';
    detalle = 'Sincronizando registros';
  }

  const procesadas = colaFotos.filter((f) => f.status === 'lista' || f.status === 'error').length;
  const total = colaFotos.length || 1;
  const progresoPct = Math.round((procesadas / total) * 100);

  return (
    <Screen center style={{ padding: 40, gap: 26 }}>
      <Spinner size={92} thickness={5} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: TOKENS.fontSizes.h3, fontWeight: '800', color: TOKENS.colors.text, textAlign: 'center' }}>
          {mensaje}
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 6, textAlign: 'center' }}>
          Punto {bloqueSel} · {detalle}
        </Text>
      </View>
      <View style={{ width: '100%', gap: 8 }}>
        <ProgressBar value={total > 1 ? progresoPct : (etapa === 'analizando_ia' ? 75 : 35)} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500 }}>
            {total > 1 ? `Foto ${procesadas + 1} de ${total}` : 'Foto en proceso'}
          </Text>
          <Text style={{ fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.accent, fontWeight: '700' }}>
            {total > 1 ? `${progresoPct}%` : (etapa === 'analizando_ia' ? 'Fase 2/2' : 'Fase 1/2')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

// ═══════════════════════════ RESULT ═══════════════════════════
function ResultScreen({
  medicion,
  bloqueSel,
  loteNombre,
  espesor,
  setEspesor,
  descripcion,
  setDescripcion,
  obsOpen,
  setObsOpen,
  obsSaved,
  onSaveObs,
  onNext,
  onTerminarLote,
  onHome,
}) {
  return (
    <Screen>
      <Header title="Resultado" onBack={onHome} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView contentContainerStyle={{ padding: PAD }} keyboardShouldPersistTaps="handled">
        {medicion._localUri || medicion.url_imagen ? (
          <Image
            source={{ uri: medicion._localUri || medicion.url_imagen }}
            style={{ width: '100%', height: 200, borderRadius: TOKENS.radius.lg, marginBottom: 14, backgroundColor: TOKENS.colors.neutral200 }}
            resizeMode="cover"
          />
        ) : null}

        <ResultCard medicion={medicion} ubicacion={`Bloque ${bloqueSel}`} loteNombre={medicion.lote_nombre || loteNombre} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
          <Text style={{ color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small }}>Sincronizado</Text>
          <Text style={{ color: TOKENS.colors.accent2_800, fontWeight: '700', fontSize: TOKENS.fontSizes.small }}>✓ En la nube</Text>
        </View>

        <Pressable
          onPress={() => setObsOpen((v) => !v)}
          accessibilityRole="button"
          style={{ backgroundColor: TOKENS.colors.surfaceAlt, borderRadius: TOKENS.radius.md, padding: 16, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...TOKENS.shadow.sm }}
        >
          <Text style={{ fontSize: TOKENS.fontSizes.body, fontWeight: '600', color: TOKENS.colors.text }}>
            Observaciones <Text style={{ color: TOKENS.colors.neutral500 }}>(opcional)</Text>
          </Text>
          <Text style={{ fontSize: 18, color: TOKENS.colors.accent700 }}>{obsOpen ? '−' : '＋'}</Text>
        </Pressable>

        {obsOpen && (
          <View style={{ marginTop: 12 }}>
            <Field label="Espesor (mm)" value={espesor} onChangeText={setEspesor} placeholder="Ej. 2.4" keyboardType="decimal-pad" />
            <Field label="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Notas de campo…" multiline autoCapitalize="sentences" />
            <Text style={{ fontSize: TOKENS.fontSizes.tiny, color: TOKENS.colors.neutral500, marginBottom: 8 }}>
              * Las notas y espesor se guardan localmente en este teléfono.
            </Text>
            <Button variant="ghost" label={obsSaved ? 'Guardado en este teléfono ✓' : 'Guardar en este teléfono'} onPress={onSaveObs} />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ padding: PAD, gap: 10 }}>
        <Button label={loteNombre ? "Siguiente foto en este lote" : "Siguiente foto en este punto"} onPress={onNext} />
        {!!loteNombre && (
          <Button variant="secondary" label="Terminar lote" onPress={onTerminarLote} />
        )}
        <Button variant="ghost" label="Volver al inicio" onPress={onHome} />
      </View>
    </Screen>
  );
}

// ═══════════════════════════ DETAIL ═══════════════════════════
function DetailScreen({ medicion, bloque, obs, puedeGestionar, onBack, onShare, onRename, onDelete }) {
  const s = severidad(medicion);
  const uri = medicion._localUri || medicion.url_imagen || medicion.url_thumbnail;
  const lat = medicion.latitud_real ?? medicion.punto_info?.coordenadas?.lat;
  const lng = medicion.longitud_real ?? medicion.punto_info?.coordenadas?.lng;
  const clima = medicion.clima || {};
  const tituloFoto = medicion.nombre || medicion.id_medicion;

  return (
    <Screen>
      <Header
        title={tituloFoto}
        subtitle={bloque ? `Bloque ${bloque} · ${formatDateTime(medicion.timestamp)}` : formatDateTime(medicion.timestamp)}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: 210, borderRadius: TOKENS.radius.lg, backgroundColor: TOKENS.colors.neutral200 }} resizeMode="cover" />
        ) : null}

        <View style={{ marginTop: 16 }}>
          <SeverityBadge medicion={medicion} />
        </View>
        <Text style={{ fontSize: 44, fontWeight: '800', color: TOKENS.colors.text, marginTop: 8 }}>
          {num(medicion.area_corroida_pct, 0).toFixed(1)}%
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>
          {s.label} · confianza {confianzaPct(medicion.confianza_promedio)}%
        </Text>

        <View style={{ marginTop: 18 }}>
          <KeyValueCard
            rows={[
              { label: 'Entidad', value: ENTIDAD },
              { label: 'Lote', value: medicion.lote_nombre || 'Sin lote' },
              { label: 'Ciudad', value: medicion.ciudad || medicion.punto_info?.ciudad || CIUDAD },
              {
                label: 'Coordenadas',
                value: lat != null && lng != null ? `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : '—',
              },
              { label: 'Detecciones', value: String(medicion.detecciones?.length ?? '—') },
              { label: 'Espesor', value: obs?.espesor ? `${obs.espesor} mm` : '—' },
              {
                label: 'Clima',
                value: clima.temperatura_c != null ? `${clima.temperatura_c}°C · ${clima.humedad_pct}% HR` : '—',
              },
              { label: 'Nota', value: obs?.descripcion || medicion.notas || 'Sin observaciones' },
            ]}
          />
        </View>

        <View style={{ gap: 10, marginTop: 16 }}>
          <Button variant="ghost" label="Compartir" onPress={onShare} />
          {puedeGestionar && (
            <Button variant="secondary" label="Renombrar foto" onPress={onRename} />
          )}
          {puedeGestionar && (
            <Button variant="danger" label="Eliminar medición" onPress={onDelete} />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ═══════════════════════════ helpers de UI ═══════════════════════════
function ErrorText({ text }) {
  return (
    <View style={{ backgroundColor: TOKENS.colors.dangerTint, borderRadius: TOKENS.radius.sm, padding: 10, marginBottom: 12 }}>
      <Text style={{ color: TOKENS.colors.danger, fontSize: TOKENS.fontSizes.small, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

function CheckRow({ text }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ color: TOKENS.colors.accent2_700, fontWeight: '800' }}>✓</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.text }}>{text}</Text>
    </View>
  );
}

// bloquesMap: catálogo real cargado del backend (o de respaldo offline), no la
// constante fija BLOQUES_CAMPUS.
function tituloBloque(m, bloqueMap, bloquesMap = {}) {
  // Antes no se pasaba el catálogo real (listaBloques) a bloqueDeMedicion, así
  // que su fallback por notas/GPS usaba siempre el catálogo offline (BLOQUES_
  // CAMPUS) aunque bloquesMap ya tuviera el real cargado. Se deriva el array
  // desde bloquesMap; si está vacío, se deja el default (offline) de la función.
  const listaReal = Object.values(bloquesMap);
  const b = bloqueDeMedicion(m, bloqueMap, listaReal.length ? listaReal : undefined);
  return b ? (bloquesMap[b]?.nombre || `Bloque ${b}`) : 'Sin bloque';
}

// Nombre corto para plantillas tipo "Bloque {x}": si el bloque real ya tiene un
// nombre (p. ej. "Bloque G" o "Torre Norte"), se usa sin duplicar la palabra
// "Bloque"; si no se encontró el bloque, cae al valor crudo (clave/id) recibido.
function nombreCortoBloque(bloqueObj, claveFallback = '') {
  if (!bloqueObj) return claveFallback;
  return String(bloqueObj.nombre || '').replace(/^bloque\s+/i, '').trim() || claveFallback;
}

// Inicial para el avatar de carpetas: antes `clave` era siempre una letra
// (G/J/K/L); con bloques reales `clave` es un id_bloque largo, así que la
// inicial sale del nombre (quitando el prefijo "Bloque " si lo trae, para que
// los bloques de respaldo offline sigan mostrando la misma letra que antes).
function inicialBloque(nombre = '') {
  const sinPrefijo = String(nombre).replace(/^bloque\s+/i, '').trim();
  return (sinPrefijo[0] || String(nombre)[0] || '?').toUpperCase();
}

function traducirAuthError(e) {
  const name = e?.name || '';
  const msg = e?.message || 'No se pudo iniciar sesión.';
  if (name === 'UserNotFoundException' || name === 'NotAuthorizedException')
    return 'Correo o contraseña incorrectos.';
  if (name === 'UserNotConfirmedException') return 'Tu cuenta no está confirmada. Revisa tu correo.';
  if (name === 'PasswordResetRequiredException') return 'Debes restablecer tu contraseña.';
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException')
    return 'Demasiados intentos. Espera un momento.';
  return msg;
}
