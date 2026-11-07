import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StatusBar,
  Share,
  BackHandler,
  AppState,
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
  Snackbar,
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
  PAGINA_PUNTO,
  LIMITE_PUNTO_MAX,
  paginaAnterior,
  mezclarMediciones,
  hayMasMediciones as calcularHayMas,
  resumirCola,
  listaDeRespuesta,
  esSesionVencida,
  conAutor,
  navegarAtras,
  pendientesAlSalir,
  datosEmpresa,
  clasificarErrorSubida,
} from './src/helpers';
import { tituloPunto } from './src/galeria';
import { marcarCarga, limpiarVencidas, necesitaRefresco, envolverCache, leerCache } from './src/miniaturas';
import {
  AWS_CONFIG,
  APP_CONFIG,
  LISTA_BLOQUES,
} from './src/config';
import {
  getMiPerfil,
  getIndicadores,
  getMedicionesRecientes,
  getMedicionesPunto,
  getResumenDiario,
  getMedicionCompleta,
  getBloques,
  resolverBloqueId,
  subirMedicion,
  renombrarMedicion,
  renombrarLote,
  eliminarMedicion,
} from './src/api';
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

// Modo demo (solo `npm run demo`): sin login real ni red. Comparación literal para que Metro
// elimine la rama (y src/demo/) del bundle de producción.
const DemoBanner = process.env.EXPO_PUBLIC_DEMO === '1' ? require('./src/demo/DemoBanner').default : null;

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
      {DemoBanner ? <DemoBanner /> : null}
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
  const [errorBloques, setErrorBloques] = useState(false); // GET /bloques falló (distinto de "sin puntos")
  const [cargandoBloques, setCargandoBloques] = useState(false);
  const sesionVencidaAvisada = useRef(false);
  const medicionesRef = useRef([]); // copia de `mediciones` para el reloj de URL vencidas
  // Historial real de cada punto: { [id_punto]: { lista, hayMas, estado: 'cargando'|'mas'|'ok'|'error', error } }.
  // Va aparte de `mediciones` (la lista continua de Inicio/Actividad, que pagina por fecha).
  const [porPunto, setPorPunto] = useState({});
  const porPuntoRef = useRef({});
  // Fotos traídas por rango de fechas (día del mapa de calor, 7/30/90 días): van aparte de
  // `mediciones` para no romper su paginación por fecha. Actividad ve la unión de las dos.
  const [extras, setExtras] = useState([]);
  const rangosCargados = useRef(new Set());
  // Resumen por día de cada año: { [anio]: { estado: 'cargando'|'ok'|'error', dias, truncado, error } }.
  const [resumenes, setResumenes] = useState({});
  const resumenesRef = useRef({});

  // navegación
  const [tab, setTab] = useState('home');
  const [screen, setScreen] = useState('home'); // home | folders | folder | activity | settings | context | camera | preview | analyzing | result | detail
  const [folderClave, setFolderClave] = useState(null);
  const [loteSel, setLoteSel] = useState(null); // lote abierto en la pestaña Lotes (sobrevive al detalle)
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

  // Aviso breve y pasajero (Snackbar de Material 3) para confirmar acciones que salieron bien.
  const [aviso, setAviso] = useState('');
  const cerrarAviso = useCallback(() => setAviso(''), []);

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
  // Sesión vencida (401): un solo aviso; al confirmar se cierra la sesión local.
  const avisarSesionVencida = () => {
    if (sesionVencidaAvisada.current) return;
    sesionVencidaAvisada.current = true;
    setConfirmModal({
      visible: true,
      title: 'Tu sesión expiró',
      message: 'Inicia sesión de nuevo para continuar. Tus datos del servidor no se perdieron.',
      confirmLabel: 'Iniciar sesión',
      cancelLabel: '',
      onConfirm: () => {
        cerrarConfirm();
        cerrarSesionLocal();
      },
      // Cerrar el aviso por otra vía (botón atrás de Android) también cierra la sesión:
      // si no, el candado quedaría puesto y los siguientes 401 se ignorarían.
      onCancel: () => {
        cerrarSesionLocal();
      },
    });
  };
  // Error de una acción contra el backend: 401 → sesión vencida; si no, aviso con el mensaje.
  const avisarError = (titulo, e, porDefecto = 'Error del servidor.') => {
    if (esSesionVencida(e)) avisarSesionVencida();
    else avisar(titulo, e?.message || porDefecto);
  };

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

  medicionesRef.current = mediciones;
  porPuntoRef.current = porPunto;
  resumenesRef.current = resumenes;

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
  const empresa = useMemo(() => datosEmpresa(perfil), [perfil]);
  const stats = useMemo(() => calcularEstadisticas(mediciones), [mediciones]);
  const medicionesTodas = useMemo(() => mezclarMediciones(mediciones, extras).lista, [mediciones, extras]);

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
    if (process.env.EXPO_PUBLIC_DEMO === '1') {
      setLogged(true);
      setBooting(false);
      return;
    }
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

  // Las URL de las fotos vencen a la hora: al volver a la app (o cada 5 min con la app abierta) se
  // recarga la lista si ya pasó el umbral, para que las miniaturas no se queden en blanco.
  useEffect(() => {
    if (!logged) return undefined;
    const revisar = () => {
      if (necesitaRefresco(medicionesRef.current)) cargarTodo(false);
    };
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') revisar();
    });
    const reloj = setInterval(revisar, 5 * 60 * 1000);
    return () => {
      sub.remove();
      clearInterval(reloj);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged]);

  const aplicarNavegacion = (cambios) => {
    if ('tab' in cambios) setTab(cambios.tab);
    if ('screen' in cambios) setScreen(cambios.screen);
    if ('folderClave' in cambios) setFolderClave(cambios.folderClave);
    if ('loteSel' in cambios) setLoteSel(cambios.loteSel);
  };
  const volver = () => {
    const atras = navegarAtras({ screen, tab, folderClave, loteSel });
    if (atras) aplicarNavegacion(atras);
  };

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
        salirDelResultado(irAInicioConservandoLote);
        return true;
      }
      const atras = navegarAtras({ screen, tab, folderClave, loteSel });
      if (atras) {
        aplicarNavegacion(atras);
        return true;
      }
      return false; // permite salir de la app en la pantalla inicial
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [screen, tab, folderClave, loteSel, confirmModal, promptModal, espesor, descripcion, obsMap, resultado, colaFotos]);

  const cargarTodo = useCallback(async (first = false) => {
    const sesion = sesionRef.current;
    if (first) setLoadingData(true);
    // cache local primero (para pintar algo sin red)
    const [cache, bmap, omap, perfilCache, bloquesCache, indicadoresCache] = await Promise.all([
      loadLocal(APP_CONFIG.storageKeys.historialCache, []),
      loadLocal(APP_CONFIG.storageKeys.bloquePorMedicion, {}),
      loadLocal(APP_CONFIG.storageKeys.obsPorMedicion, {}),
      loadLocal(APP_CONFIG.storageKeys.perfilCache, null),
      loadLocal(APP_CONFIG.storageKeys.bloquesCache, null),
      loadLocal(APP_CONFIG.storageKeys.indicadoresCache, null),
    ]);
    if (sesion !== sesionRef.current) return;
    setBloqueMap(bmap || {});
    setObsMap(omap || {});
    // Perfil y puntos guardados: sin red el nombre y el punto de cada foto siguen visibles.
    const perfilGuardado = leerCache(perfilCache);
    if (perfilGuardado) setPerfil((prev) => prev || perfilGuardado);
    const indicadoresGuardados = leerCache(indicadoresCache, perfilGuardado?.cognito_sub);
    if (indicadoresGuardados) setIndicadoresServidor((prev) => prev || indicadoresGuardados);
    const bloquesGuardados = leerCache(bloquesCache, perfilGuardado?.cognito_sub);
    if (Array.isArray(bloquesGuardados) && bloquesGuardados.length) setBloques((prev) => (prev.length ? prev : bloquesGuardados));
    // Las URL firmadas de la caché pueden haber vencido (1 h): no se pintan.
    if (Array.isArray(cache) && cache.length) setMediciones(limpiarVencidas(cache));

    try {
      // allSettled: un fallo de red NO es una lista vacía. Si /mediciones/recientes
      // falla se conserva la lista en caché (no se sobrescribe) y se avisa "Sin conexión".
      const [rPerfil, rMeds, rBloques, rInds] = await Promise.allSettled([
        getMiPerfil(),
        getMedicionesRecientes(undefined, PAGINA_MEDICIONES),
        getBloques(),
        getIndicadores(),
      ]);
      if (sesion !== sesionRef.current) return;
      const fallos = [rPerfil, rMeds, rBloques, rInds].filter((r) => r.status === 'rejected').map((r) => r.reason);
      if (fallos.some(esSesionVencida)) {
        avisarSesionVencida();
        setOffline(true);
        return;
      }
      if (rPerfil.status === 'fulfilled' && rPerfil.value) {
        setPerfil(rPerfil.value);
        saveLocal(APP_CONFIG.storageKeys.perfilCache, envolverCache(rPerfil.value.cognito_sub, rPerfil.value));
      }
      if (rInds.status === 'fulfilled' && rInds.value) {
        setIndicadoresServidor(rInds.value);
        saveLocal(
          APP_CONFIG.storageKeys.indicadoresCache,
          envolverCache(rPerfil.status === 'fulfilled' ? rPerfil.value?.cognito_sub : perfilGuardado?.cognito_sub, rInds.value)
        );
      }
      if (rBloques.status === 'fulfilled' && Array.isArray(rBloques.value)) {
        const adaptados = rBloques.value.map(adaptarBloque);
        setBloques(adaptados);
        setErrorBloques(false);
        const subPerfil = rPerfil.status === 'fulfilled' ? rPerfil.value?.cognito_sub : perfilGuardado?.cognito_sub;
        saveLocal(APP_CONFIG.storageKeys.bloquesCache, envolverCache(subPerfil, adaptados));
      } else {
        setErrorBloques(true);
      }

      if (rMeds.status === 'rejected') {
        console.log('cargarTodo mediciones', rMeds.reason?.message);
        setOffline(true);
        return;
      }
      const respMeds = rMeds.value;
      const lista = listaDeRespuesta(respMeds);
      setHayMasMediciones(calcularHayMas(respMeds, PAGINA_MEDICIONES));

      const limpio = marcarCarga(lista.map(({ mascaras, ...rest }) => rest)).sort(
        (a, z) => new Date(z.timestamp || 0) - new Date(a.timestamp || 0)
      );
      setMediciones(limpio);
      // El detalle abierto recibe las URL nuevas (las que tenía pueden estar por vencer).
      setDetalle((prev) => {
        const fresca = prev && limpio.find((m) => m.id_medicion === prev.id_medicion);
        return fresca ? { ...prev, url_thumbnail: fresca.url_thumbnail, url_imagen: fresca.url_imagen, _urlTs: fresca._urlTs } : prev;
      });
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
      const lista = listaDeRespuesta(resp);
      const nuevas = marcarCarga(lista.map(({ mascaras, ...rest }) => rest));
      const { agregadas } = mezclarMediciones(mediciones, nuevas);
      // Actualización funcional: no pisa una medición subida mientras se esperaba.
      setMediciones((prev) => mezclarMediciones(prev, nuevas).lista);
      setHayMasMediciones(calcularHayMas(resp, pagina.limit, agregadas));
    } catch (e) {
      console.log('cargarMasMediciones', e?.message);
      // La lista ya cargada no se toca: solo se avisa.
      avisarError('No se pudieron cargar más mediciones', e, 'Revisa tu conexión e intenta de nuevo.');
    } finally {
      setCargandoMas(false);
    }
  };

  // Aplica un cambio (renombrar, borrar...) a la lista general y a los historiales por punto.
  const mapearTodo = (fn) => {
    setMediciones((prev) => fn(prev));
    setExtras((prev) => fn(prev));
    setPorPunto((prev) =>
      Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, { ...v, lista: fn(v.lista || []) }]))
    );
  };

  // Historial real de un punto: GET /mediciones/{id_punto}?resumen=1. La primera vez trae
  // PAGINA_PUNTO; con `mas` pide hasta el día de la foto más antigua cargada (como /recientes).
  const cargarHistorialPunto = async (idPunto, { mas = false } = {}) => {
    const previo = porPuntoRef.current[idPunto];
    if (!idPunto || previo?.estado === 'cargando' || previo?.estado === 'mas') return;
    const sesion = sesionRef.current;
    let params = { limite: PAGINA_PUNTO };
    if (mas) {
      const pag = paginaAnterior(previo?.lista || [], PAGINA_PUNTO, LIMITE_PUNTO_MAX);
      if (!pag) return;
      params = { limite: pag.limit, hasta: pag.hasta };
    }
    setPorPunto((p) => ({
      ...p,
      [idPunto]: { lista: previo?.lista || [], hayMas: previo?.hayMas ?? false, estado: mas ? 'mas' : 'cargando', error: '' },
    }));
    try {
      const resp = await getMedicionesPunto(idPunto, params);
      if (sesion !== sesionRef.current) return;
      const nuevas = marcarCarga(listaDeRespuesta(resp).map(({ mascaras, ...rest }) => rest));
      const { agregadas } = mezclarMediciones(previo?.lista || [], nuevas);
      setPorPunto((p) => ({
        ...p,
        [idPunto]: {
          lista: mezclarMediciones(p[idPunto]?.lista || [], nuevas).lista,
          hayMas: calcularHayMas(resp, params.limite, mas ? agregadas : 1),
          estado: 'ok',
          error: '',
        },
      }));
    } catch (e) {
      if (sesion !== sesionRef.current) return;
      if (esSesionVencida(e)) avisarSesionVencida();
      setPorPunto((p) => ({
        ...p,
        [idPunto]: {
          lista: p[idPunto]?.lista || [],
          hayMas: p[idPunto]?.hayMas ?? false,
          estado: 'error',
          error: e?.message || 'No se pudo cargar el historial del punto.',
        },
      }));
    }
  };

  // Mapa de calor: GET /mediciones/resumen-diario?anio=. Se guarda por año; `forzar` ignora lo guardado.
  const cargarResumen = async (anio, { forzar = false, idPunto = null } = {}) => {
    const clave = idPunto ? `${idPunto}|${anio}` : anio;
    const previo = resumenesRef.current[clave];
    if (!forzar && previo && (previo.estado === 'ok' || previo.estado === 'cargando')) return;
    const sesion = sesionRef.current;
    setResumenes((r) => ({ ...r, [clave]: { ...(previo || { dias: [] }), estado: 'cargando', error: '' } }));
    try {
      const resp = await getResumenDiario(anio, idPunto);
      if (sesion !== sesionRef.current) return;
      setResumenes((r) => ({ ...r, [clave]: { estado: 'ok', dias: resp?.dias || [], truncado: Boolean(resp?.truncado), error: '' } }));
    } catch (e) {
      if (sesion !== sesionRef.current) return;
      if (esSesionVencida(e)) avisarSesionVencida();
      setResumenes((r) => ({
        ...r,
        [clave]: { estado: 'error', dias: r[clave]?.dias || [], truncado: false, error: e?.message || 'No se pudo cargar el resumen por día.' },
      }));
    }
  };

  // Trae TODAS las fotos de un rango de días (inclusivo, UTC-5) y las suma a `extras`.
  const cargarRango = async ({ desde, hasta }) => {
    if (!desde && !hasta) return { truncado: false };
    const clave = `${desde || ''}|${hasta || ''}`;
    if (rangosCargados.current.has(clave)) return { truncado: false };
    rangosCargados.current.add(clave);
    const sesion = sesionRef.current;
    try {
      const resp = await getMedicionesRecientes(undefined, 500, { desde, hasta });
      if (sesion !== sesionRef.current) return { truncado: false };
      const nuevas = marcarCarga(listaDeRespuesta(resp).map(({ mascaras, ...rest }) => rest));
      setExtras((prev) => mezclarMediciones(prev, nuevas).lista);
      return { truncado: Boolean(resp?.truncado) };
    } catch (e) {
      rangosCargados.current.delete(clave); // se podrá reintentar
      if (sesion === sesionRef.current && esSesionVencida(e)) avisarSesionVencida();
      return { truncado: false, error: e?.message || 'No se pudieron cargar las fotos de ese rango.' };
    }
  };

  // Reintento puntual de GET /bloques (sin recargar todo lo demás). Si falla, se conserva
  // el catálogo que ya hubiera y se muestra el error: nunca "tu zona no tiene puntos".
  const recargarBloques = async () => {
    const sesion = sesionRef.current;
    setCargandoBloques(true);
    try {
      const blqs = await getBloques();
      if (sesion !== sesionRef.current) return;
      setBloques(blqs.map(adaptarBloque));
      setErrorBloques(false);
    } catch (e) {
      if (sesion !== sesionRef.current) return;
      if (esSesionVencida(e)) avisarSesionVencida();
      setErrorBloques(true);
    } finally {
      setCargandoBloques(false);
    }
  };

  // Los KPI del inicio vienen del servidor: se refrescan tras subir o borrar. Si falla,
  // se conservan los últimos (el siguiente pull-to-refresh los vuelve a pedir).
  const refrescarIndicadores = () => {
    const sesion = sesionRef.current;
    getIndicadores()
      .then((inds) => {
        if (inds && sesion === sesionRef.current) setIndicadoresServidor(inds);
      })
      .catch(() => {});
  };

  const onRefresh = () => {
    setRefreshing(true);
    setResumenes({});
    setExtras([]);
    rangosCargados.current = new Set();
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
    if (process.env.EXPO_PUBLIC_DEMO === '1') {
      setLogged(true); // demo: cualquier credencial entra
      return;
    }
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
    setPorPunto({});
    setExtras([]);
    rangosCargados.current = new Set();
    setResumenes({});
    setBloques([]);
    setBloqueMap({});
    setObsMap({});
    setLoadingData(false);
    setRefreshing(false);
    setOffline(false);
    setErrorBloques(false);
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
    setLoteSel(null);
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

  const cerrarSesionLocal = async () => {
    // Invalida la sesión ANTES de esperar: las respuestas tardías ya se descartan.
    sesionRef.current += 1;
    try {
      await signOut();
    } catch {}
    await clearLocalData();
    sesionVencidaAvisada.current = false;
    reiniciarEstadoSesion();
  };

  const handleLogout = async () => {
    setConfirmModal({
      visible: true,
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres salir de tu cuenta?',
      confirmLabel: 'Cerrar sesión',
      variant: 'danger',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        cerrarSesionLocal();
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

  // Salir del resultado descartaría las fotos fallidas y las observaciones sin guardar:
  // se pregunta antes. "Quedarme aquí" es la opción segura (también la del botón atrás).
  const salirDelResultado = (continuar) => {
    const pend = pendientesAlSalir({
      cola: colaRef.current,
      espesor,
      descripcion,
      guardada: obsMap[resultado?.id_medicion],
    });
    if (!pend.hay) {
      continuar();
      return;
    }
    const partes = [];
    if (pend.fallidas) partes.push(`${pend.fallidas} ${pend.fallidas === 1 ? 'foto no se analizó' : 'fotos no se analizaron'}`);
    if (pend.obsSinGuardar) partes.push('tienes observaciones sin guardar');
    const mensaje = `${partes.join(' y ')}. Si continúas, se perderán.`;
    // Solo fallidas definitivas (410) y sin notas: no hay nada que reintentar ni guardar.
    const soloDescartar = !pend.reintentables && !pend.obsSinGuardar;
    setConfirmModal({
      visible: true,
      title: 'Hay cambios sin resolver',
      message: mensaje.charAt(0).toUpperCase() + mensaje.slice(1),
      confirmLabel: soloDescartar ? 'Descartar y continuar' : pend.reintentables ? 'Reintentar las fallidas' : 'Guardar notas y continuar',
      variant: soloDescartar ? 'danger' : 'primary',
      extraLabel: soloDescartar ? '' : 'Descartar y continuar',
      cancelLabel: 'Quedarme aquí',
      onConfirm: async () => {
        cerrarConfirm();
        if (soloDescartar) {
          continuar();
        } else if (pend.reintentables) {
          analizar();
        } else {
          await guardarObs();
          continuar();
        }
      },
      onExtra: () => {
        cerrarConfirm();
        continuar();
      },
    });
  };

  // En el resultado de una tanda, elegir otra foto cambia la lectura que se muestra. Las notas
  // escritas para la foto anterior se guardan antes de cambiar (no se pierden).
  const seleccionarResultado = async (m) => {
    if (!m || m.id_medicion === resultado?.id_medicion) return;
    if (resultado && (espesor.trim() || descripcion.trim())) await guardarObs();
    const guardada = obsMap[m.id_medicion];
    setEspesor(guardada?.espesor || '');
    setDescripcion(guardada?.descripcion || '');
    setObsSaved(Boolean(guardada));
    const { mascaras, ...ligera } = m;
    setResultado(ligera);
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
    const sesion = sesionRef.current;
    const vigente = () => sesion === sesionRef.current;
    setScreen('analyzing');
    setResultado(null);
    setEtapaSubida('');

    const bloqueElegido = bloquesMap[bloqueSel];
    const gpsUsar = gps || { lat: bloqueElegido?.lat, lng: bloqueElegido?.lng };
    const bloquesNuevos = {};

    try {
      const notas = construirNotas(nombreCortoBloque(bloqueElegido, bloqueSel), descripcion);
      const bloqueIdReal = await resolverBloqueId({ bloque: bloqueElegido });
      if (!vigente()) return;
      if (!loteIdRef.current && loteNombreInput) fijarLoteId(`lote_${Date.now()}`);

      for (let i = 0; i < colaRef.current.length; i++) {
        if (!vigente()) return;
        const itemFoto = colaRef.current[i];
        if (itemFoto.status === 'lista' || itemFoto.definitivo) continue;
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
            onImagenKey: (k) => vigente() && actualizarFoto(i, { imagenKey: k }),
            onEtapa: (e) => vigente() && setEtapaSubida(e),
          });
          if (!vigente()) return;

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

          const { mascaras, ...ligera } = conAutor(medicion, perfil);
          const medConFoto = { ...ligera, url_imagen: medicion.url_imagen || itemFoto.uri, _localUri: itemFoto.uri };
          setMediciones((prev) => [medConFoto, ...prev.filter((m) => m.id_medicion !== medicion.id_medicion)]);
        } catch (errFoto) {
          if (!vigente()) return;
          const { mensaje, reintentable } = clasificarErrorSubida(errFoto);
          actualizarFoto(i, { status: 'error', error: mensaje, definitivo: !reintentable });
          if (esSesionVencida(errFoto)) avisarSesionVencida();
        }
      }

      // Se persiste una sola vez, mezclando con lo ya guardado (no con un estado capturado).
      if (Object.keys(bloquesNuevos).length) {
        const guardado = await loadLocal(APP_CONFIG.storageKeys.bloquePorMedicion, {});
        if (!vigente()) return;
        await saveLocal(APP_CONFIG.storageKeys.bloquePorMedicion, { ...guardado, ...bloquesNuevos });
      }

      setEtapaSubida('completado');
      if (Object.keys(bloquesNuevos).length) refrescarIndicadores();

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
      if (!vigente()) return;
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
      // Si la sesión cambió, reiniciarEstadoSesion ya liberó el candado (y puede haber otro análisis).
      if (vigente()) analizandoRef.current = false;
    }
  };

  const guardarObs = async () => {
    if (!resultado) return;
    const nuevo = { ...obsMap, [resultado.id_medicion]: { espesor, descripcion } };
    setObsMap(nuevo);
    await saveLocal(APP_CONFIG.storageKeys.obsPorMedicion, nuevo);
    setObsSaved(true);
  };

  // La lista viene en modo resumen (sin detecciones ni clima): se muestra el detalle de
  // inmediato y se completa con GET /mediciones/{id_punto}?id_medicion=... en segundo plano.
  // Si falla, el detalle sigue con lo que ya hay (esos campos muestran "—").
  const abrirDetalle = (m) => {
    setDetalle(m);
    setScreen('detail');
    if (m.detecciones || !m.id_punto) return;
    const sesion = sesionRef.current;
    getMedicionCompleta(m.id_punto, m.id_medicion)
      .then((completa) => {
        if (!completa || sesion !== sesionRef.current) return;
        // Conserva lo local (_localUri, nombre renombrado, etc.) y evita pisar otra pantalla.
        setDetalle((prev) => (prev && prev.id_medicion === m.id_medicion ? { ...completa, ...prev, detecciones: completa.detecciones, clima: completa.clima } : prev));
      })
      .catch((e) => {
        if (esSesionVencida(e)) avisarSesionVencida();
      });
  };

  // Ficha de lote (Actividad / Punto): abre el lote en la pestaña Lotes.
  const abrirLote = (claveLote) => {
    setTab('lotes');
    setScreen('lotes');
    setFolderClave(null);
    setLoteSel(claveLote);
  };

  const compartir = async (m) => {
    try {
      const s = severidad(m);
      // Nombre legible del punto (no el id crudo); si no se conoce, solo "Medición".
      const claveBloque = bloqueDeMedicion(m, bloqueMap, listaBloques);
      const nombrePunto = claveBloque ? nombreCortoBloque(bloquesMap[claveBloque], '') : '';
      await Share.share({
        message:
          `PIXELRUST — ${nombrePunto ? 'Punto ' + nombrePunto : 'Medición'}\n` +
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
          setAviso('Foto renombrada');
          mapearTodo((lista) => lista.map((x) => (x.id_medicion === m.id_medicion ? act : x)));
        } catch (e) {
          avisarError('No se pudo renombrar', e);
        }
      },
    });
  };

  const borrar = (m) => {
    if (!puedeGestionarMedicion(perfil, m)) return;
    setConfirmModal({
      visible: true,
      title: 'Eliminar medición',
      message: 'Esta acción no se puede deshacer. Se borrará la foto y su resultado.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        try {
          await eliminarMedicion(m.id_punto, m.id_medicion);
          mapearTodo((lista) => lista.filter((x) => x.id_medicion !== m.id_medicion));
          refrescarIndicadores();
          setDetalle(null);
          setScreen(folderClave ? 'folder' : tab);
          setAviso('Foto eliminada');
        } catch (e) {
          avisarError('No se pudo eliminar', e);
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
        extraLabel={confirmModal.extraLabel}
        onExtra={confirmModal.onExtra}
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
          empresa={empresa}
          bloques={listaBloques}
          estadoBloques={cargandoBloques || loadingData ? 'cargando' : errorBloques ? 'error' : 'ok'}
          onReintentarBloques={recargarBloques}
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
          cola={colaFotos}
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
          cola={colaFotos}
          onSeleccionar={seleccionarResultado}
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
          onNext={() => salirDelResultado(() => irANuevaMedicion({ mantenerLote: true }))}
          onTerminarLote={() => salirDelResultado(terminarLote)}
          resumenLote={resumirCola(colaFotos)}
          onReintentar={analizar}
          onBack={() => salirDelResultado(irAInicioConservandoLote)}
          onHome={() => salirDelResultado(terminarLote)}
        />
      );

    if (screen === 'detail' && detalle) {
      const detalleClaveBloque = bloqueDeMedicion(detalle, bloqueMap, listaBloques);
      const puedeGestionar = puedeGestionarMedicion(perfil, detalle);

      return (
        <DetailScreen
          medicion={detalle}
          empresa={empresa}
          puntoNombre={detalleClaveBloque ? tituloPunto(bloquesMap[detalleClaveBloque]?.nombre) : null}
          obs={obsMap[detalle.id_medicion]}
          puedeGestionar={puedeGestionar}
          onBack={volver}
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
          empresaLinea={empresa.linea}
          resumenes={resumenes}
          onCargarResumen={cargarResumen}
          historial={porPunto[folderClave]}
          onCargarHistorial={(opts) => cargarHistorialPunto(folderClave, opts)}
          onBack={volver}
          onOpen={abrirDetalle}
          onAbrirLote={abrirLote}
        />
      );

    // pantallas con tab bar
    const setTabAndScreen = (k) => {
      setTab(k);
      setScreen(k);
      setFolderClave(null);
      setLoteSel(null);
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
            onVerTodas={() => setTabAndScreen('activity')}
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
            loteSeleccionado={loteSel}
            setLoteSeleccionado={setLoteSel}
            hayMas={hayMasMediciones}
            cargandoMas={cargandoMas}
            onCargarMas={cargarMasMediciones}
            puedeRenombrarLote={(items) => puedeGestionarLote(perfil, items)}
            onRenameLote={async (items, nuevo) => {
              // Se actualiza el estado local (sin recargar: cargarTodo reiniciaría las páginas ya cargadas).
              const aplicar = (ids) =>
                mapearTodo((lista) => lista.map((x) => (ids.includes(x.id_medicion) ? { ...x, lote_nombre: nuevo } : x)));
              try {
                const { idsRenombrados } = await renombrarLote(items, nuevo);
                aplicar(idsRenombrados);
                setAviso('Lote renombrado');
              } catch (e) {
                if (e.idsRenombrados?.length) aplicar(e.idsRenombrados);
                avisarError('No se pudo renombrar el lote', e);
              }
            }}
          />
        )}
        {tab === 'folders' && (
          <FoldersScreen
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            listaBloques={listaBloques}
            empresaLinea={empresa.linea}
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
            mediciones={medicionesTodas}
            resumenes={resumenes}
            onCargarResumen={cargarResumen}
            onCargarRango={cargarRango}
            bloqueMap={bloqueMap}
            bloquesMap={bloquesMap}
            refreshing={refreshing}
            hayMas={hayMasMediciones}
            cargandoMas={cargandoMas}
            onCargarMas={cargarMasMediciones}
            onRefresh={onRefresh}
            onOpen={abrirDetalle}
            onAbrirLote={abrirLote}
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
      <Snackbar visible={Boolean(aviso)} message={aviso} onDismiss={cerrarAviso} />
      {modales}
    </>
  );
}
