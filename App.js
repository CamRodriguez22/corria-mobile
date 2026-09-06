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
} from './src/DesignComponents';
import {
  AWS_CONFIG,
  APP_CONFIG,
  BLOQUES_CAMPUS,
  LISTA_BLOQUES,
  ENTIDAD,
  CIUDAD,
} from './src/config';
import {
  getMiPerfil,
  getMedicionesRecientes,
  subirMedicion,
  eliminarMedicion,
} from './src/api-real';
import {
  getCurrentLocation,
  reverseGeocode,
  pickPhoto,
  validarFoto,
  formatDate,
  formatDateTime,
  relativeDate,
  calcularEstadisticas,
  saveLocal,
  loadLocal,
  guardarFotoLocal,
  bloqueDeMedicion,
  agruparPorBloque,
  construirNotas,
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
  { key: 'folders', label: 'Carpetas' },
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
  const [mediciones, setMediciones] = useState([]);
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
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [foto, setFoto] = useState(null);
  const [lugar, setLugar] = useState(null); // { ciudad, barrio, direccion } del reverse-geocode
  const [progress, setProgress] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [espesor, setEspesor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [obsOpen, setObsOpen] = useState(false);
  const [obsSaved, setObsSaved] = useState(false);

  const nombre = perfil?.nombre || (perfil?.email || email).split('@')[0] || 'Usuario';
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
  const esAdmin = (perfil?.rol || '').toLowerCase() === 'admin';
  const stats = useMemo(() => calcularEstadisticas(mediciones), [mediciones]);

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
      const [p, meds] = await Promise.all([
        getMiPerfil().catch(() => null),
        getMedicionesRecientes(undefined, APP_CONFIG.limiteHistorialMovil),
      ]);
      if (p) setPerfil(p);
      // Sin las máscaras (cientos de KB c/u): no se usan en el móvil y saturan memoria/AsyncStorage.
      const limpio = (meds || [])
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

  const onRefresh = () => {
    setRefreshing(true);
    cargarTodo(false);
  };

  // ───────────────────────── auth handlers ─────────────────────────
  const handleLogin = async () => {
    setAuthError('');
    if (!email.trim() || !pass) {
      setAuthError('Escribe tu correo y contraseña.');
      return;
    }
    setAuthBusy(true);
    try {
      const res = await signIn({ username: email.trim(), password: pass });
      if (res.isSignedIn) {
        setLogged(true);
      } else if (res.nextStep?.signInStep === 'DONE') {
        setLogged(true);
      } else if (
        res.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      ) {
        setNeedsNewPass(true);
        setAuthError('Tu contraseña es temporal. Define una nueva.');
      } else {
        setAuthError(`Paso adicional requerido: ${res.nextStep?.signInStep || 'desconocido'}`);
      }
    } catch (e) {
      if (e?.name === 'UserAlreadyAuthenticatedException') {
        setLogged(true);
      } else {
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
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {}
          setLogged(false);
          setPerfil(null);
          setMediciones([]);
          setPass('');
          setNewPass('');
          setNeedsNewPass(false);
          setTab('home');
          setScreen('home');
        },
      },
    ]);
  };

  // ───────────────────────── flujo de medición ─────────────────────────
  const irANuevaMedicion = async () => {
    setBloqueSel('');
    setFoto(null);
    setGps(null);
    setGpsError('');
    setResultado(null);
    setEspesor('');
    setDescripcion('');
    setObsOpen(false);
    setObsSaved(false);
    setLugar(null);
    setScreen('context');
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

  const capturar = async (fromCamera) => {
    try {
      const f = await pickPhoto({ fromCamera });
      if (!f) return; // cancelado
      const err = validarFoto(f);
      if (err) {
        Alert.alert('Foto no válida', err);
        return;
      }
      setFoto(f);
      setScreen('preview');
    } catch (e) {
      Alert.alert('Cámara', e.message || 'No se pudo abrir la cámara.');
    }
  };

  const analizar = async () => {
    if (!foto || !bloqueSel) return;
    setScreen('analyzing');
    setProgress(6);
    setResultado(null);

    const timer = setInterval(() => {
      setProgress((p) => (p >= 92 ? 92 : p + Math.random() * 12));
    }, 350);

    let gpsUsar = gps;
    if (!gpsUsar) {
      const b = BLOQUES_CAMPUS[bloqueSel];
      gpsUsar = { lat: b.lat, lng: b.lng };
    }

    try {
      const notas = construirNotas(bloqueSel, descripcion);
      const { medicion } = await subirMedicion({
        foto,
        gps: gpsUsar,
        bloqueClave: bloqueSel,
        ciudad: CIUDAD,
        notas,
      });
      clearInterval(timer);
      setProgress(100);

      // etiquetar bloque + guardar foto local + refrescar lista
      const nuevoMap = { ...bloqueMap, [medicion.id_medicion]: bloqueSel };
      setBloqueMap(nuevoMap);
      saveLocal(APP_CONFIG.storageKeys.bloquePorMedicion, nuevoMap);
      guardarFotoLocal({
        uri: foto.uri,
        base64: foto.base64,
        bloque: bloqueSel,
        id: medicion.id_medicion,
        ts: medicion.timestamp,
        meta: {
          nivel_corrosion: medicion.nivel_corrosion,
          area_corroida_pct: medicion.area_corroida_pct,
          confianza_promedio: medicion.confianza_promedio,
        },
      });

      const { mascaras, ...ligera } = medicion;
      const medConFoto = { ...ligera, url_imagen: medicion.url_imagen || foto.uri, _localUri: foto.uri };
      setResultado(medConFoto);
      setMediciones((prev) => [medConFoto, ...prev.filter((m) => m.id_medicion !== medicion.id_medicion)]);
      setScreen('result');
    } catch (e) {
      clearInterval(timer);
      console.log('analizar', e?.message);
      Alert.alert('No se pudo analizar', e.message || 'Error del servidor.', [
        { text: 'Reintentar', onPress: analizar },
        { text: 'Volver', style: 'cancel', onPress: () => setScreen('preview') },
      ]);
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
          `Corrosión: ${s.label} (${num(m.area_corroida_pct, 0).toFixed(0)}%)\n` +
          `Confianza: ${confianzaPct(m.confianza_promedio)}%\n` +
          `Fecha: ${formatDateTime(m.timestamp)}`,
      });
    } catch {}
  };

  const borrar = (m) => {
    Alert.alert('Eliminar medición', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarMedicion(m.id_punto, m.id_medicion);
            setMediciones((prev) => prev.filter((x) => x.id_medicion !== m.id_medicion));
            setDetalle(null);
            setScreen(folderClave ? 'folder' : tab);
          } catch (e) {
            Alert.alert('No se pudo eliminar', e.message || 'Error del servidor.');
          }
        },
      },
    ]);
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
        bloqueSel={bloqueSel}
        setBloqueSel={setBloqueSel}
        onBack={() => setScreen('home')}
        onNext={() => setScreen('camera')}
      />
    );

  if (screen === 'camera')
    return (
      <CameraScreen
        bloqueSel={bloqueSel}
        onBack={() => setScreen('context')}
        onPick={capturar}
      />
    );

  if (screen === 'preview')
    return (
      <PreviewScreen
        foto={foto}
        bloqueSel={bloqueSel}
        onBack={() => setScreen('camera')}
        onConfirm={analizar}
      />
    );

  if (screen === 'analyzing')
    return <AnalyzingScreen progress={progress} bloqueSel={bloqueSel} />;

  if (screen === 'result' && resultado)
    return (
      <ResultScreen
        medicion={resultado}
        bloqueSel={bloqueSel}
        espesor={espesor}
        setEspesor={setEspesor}
        descripcion={descripcion}
        setDescripcion={setDescripcion}
        obsOpen={obsOpen}
        setObsOpen={setObsOpen}
        obsSaved={obsSaved}
        onSaveObs={guardarObs}
        onNext={irANuevaMedicion}
        onHome={() => {
          setScreen('home');
          setTab('home');
        }}
      />
    );

  if (screen === 'detail' && detalle)
    return (
      <DetailScreen
        medicion={detalle}
        bloque={bloqueDeMedicion(detalle, bloqueMap)}
        obs={obsMap[detalle.id_medicion]}
        esAdmin={esAdmin}
        onBack={() => setScreen(folderClave ? 'folder' : tab)}
        onShare={() => compartir(detalle)}
        onDelete={() => borrar(detalle)}
      />
    );

  if (screen === 'folder' && folderClave)
    return (
      <FolderScreen
        clave={folderClave}
        mediciones={mediciones}
        bloqueMap={bloqueMap}
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
            mediciones={mediciones}
            bloqueMap={bloqueMap}
            offline={offline}
            loading={loadingData}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onNueva={irANuevaMedicion}
            onOpen={abrirDetalle}
            onSettings={() => setTabAndScreen('settings')}
          />
        )}
        {tab === 'folders' && (
          <FoldersScreen
            mediciones={mediciones}
            bloqueMap={bloqueMap}
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
            refreshing={refreshing}
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
                label="Usuario"
                value={email}
                onChangeText={setEmail}
                placeholder="correo@uninorte.edu.co"
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
            </>
          )}
        </View>

        <View style={{ flex: 1 }} />
        <Text style={{ textAlign: 'center', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 40 }}>
          © 2026 Universidad del Norte
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
  mediciones,
  bloqueMap,
  offline,
  loading,
  refreshing,
  onRefresh,
  onNueva,
  onOpen,
  onSettings,
}) {
  const recientes = mediciones.slice(0, 4);
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
        <StatCard value={stats.total} label="Mediciones" />
        <StatCard value={stats.severas} label="Severas" color={TOKENS.colors.danger} />
        <StatCard value={stats.total ? `${stats.promedioPct}%` : '—'} label="Promedio" color={TOKENS.colors.accent2_800} />
      </View>

      <View style={{ marginTop: 18 }}>
        <Button label="＋  Nueva medición" onPress={onNueva} accessibilityHint="Abre la cámara para una nueva inspección" />
      </View>

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
            title={tituloBloque(m, bloqueMap)}
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

// ═══════════════════════════ FOLDERS ═══════════════════════════
function FoldersScreen({ mediciones, bloqueMap, refreshing, onRefresh, onOpen }) {
  const grupos = useMemo(() => agruparPorBloque(mediciones, bloqueMap), [mediciones, bloqueMap]);
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
        <Text style={{ fontSize: 18 }}>📍</Text>
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
              {g.clave === 'SIN_BLOQUE' ? '—' : g.clave}
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

function FolderScreen({ clave, mediciones, bloqueMap, onBack, onOpen }) {
  const bloque = BLOQUES_CAMPUS[clave] || { nombre: 'Sin bloque' };
  const items = useMemo(
    () =>
      agruparPorBloque(mediciones, bloqueMap).find((g) => g.clave === clave)?.items || [],
    [mediciones, bloqueMap, clave]
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
function ActivityScreen({ mediciones, bloqueMap, refreshing, onRefresh, onOpen }) {
  const [filtro, setFiltro] = useState('all');
  const filtradas = useMemo(() => {
    if (filtro === 'all') return mediciones;
    return mediciones.filter((m) => severidad(m).short === filtro);
  }, [mediciones, filtro]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: PAD, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.colors.accent} />}
    >
      <Text style={{ fontSize: TOKENS.fontSizes.h2, fontWeight: '800', color: TOKENS.colors.text }}>Actividad</Text>
      <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 6, marginBottom: 14 }}>
        Línea de tiempo del equipo
      </Text>

      <Segmented
        scroll
        value={filtro}
        onChange={setFiltro}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'LEVE', label: 'Leve' },
          { value: 'MODERADA', label: 'Moderada' },
          { value: 'SEVERA', label: 'Severa' },
          { value: 'CRÍTICA', label: 'Crítica' },
        ]}
      />

      <View style={{ marginTop: 18, paddingLeft: 22 }}>
        <View style={{ position: 'absolute', left: 5, top: 6, bottom: 6, width: 2, backgroundColor: TOKENS.colors.neutral200 }} />
        {filtradas.length ? (
          filtradas.map((m) => {
            const s = severidad(m);
            return (
              <Pressable
                key={m.id_medicion}
                onPress={() => onOpen(m)}
                accessibilityRole="button"
                style={{ marginBottom: 20 }}
              >
                <View style={{ position: 'absolute', left: -22, top: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: s.color, borderWidth: 3, borderColor: TOKENS.colors.bg }} />
                <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral500 }}>{relativeDate(m.timestamp)}</Text>
                <Text style={{ fontSize: TOKENS.fontSizes.h5, fontWeight: '700', color: TOKENS.colors.text, marginTop: 3 }}>
                  {tituloBloque(m, bloqueMap)} · {num(m.area_corroida_pct, 0).toFixed(0)}%
                </Text>
                <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                  {s.label} · confianza {confianzaPct(m.confianza_promedio)}%
                </Text>
              </Pressable>
            );
          })
        ) : (
          <View style={{ paddingVertical: 30 }}>
            <EmptyState title="Nada por aquí" subtitle="No hay mediciones con ese filtro." />
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
            { label: 'Entidad', value: ENTIDAD },
            { label: 'Ciudad', value: CIUDAD },
            { label: 'Sincronización', value: 'Automática' },
            { label: 'Versión', value: '2.0.0' },
          ]}
        />
      </View>

      <Button variant="danger" label="Cerrar sesión" onPress={onLogout} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

// ═══════════════════════════ CONTEXT ═══════════════════════════
function ContextScreen({ gps, gpsError, lugar, bloqueSel, setBloqueSel, onBack, onNext }) {
  const ciudadDetectada = lugar?.ciudad || CIUDAD;
  return (
    <Screen>
      <Header title="Nueva medición" subtitle="Selecciona el bloque" onBack={onBack} />
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

        <Text style={{ fontSize: TOKENS.fontSizes.h6, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: TOKENS.colors.neutral600, marginTop: 24, marginBottom: 12 }}>
          Bloques disponibles
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {LISTA_BLOQUES.map((b) => {
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
      <Header title="Capturar" subtitle={`Bloque ${bloqueSel}`} onBack={onBack} />
      <View style={{ flex: 1, padding: PAD, justifyContent: 'center', alignItems: 'center', gap: 26 }}>
        <View style={{ width: 220, height: 220, borderRadius: 24, borderWidth: 2, borderColor: TOKENS.colors.neutral300, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>📷</Text>
          <Text style={{ color: TOKENS.colors.neutral600, marginTop: 8, fontSize: TOKENS.fontSizes.small }}>Mín. 800 × 600 px</Text>
        </View>
        <Text style={{ textAlign: 'center', color: TOKENS.colors.neutral600, fontSize: TOKENS.fontSizes.small }}>
          Enfoca la zona con óxido y toma la foto de frente, con buena luz.
        </Text>
      </View>
      <View style={{ padding: PAD, gap: 12 }}>
        <Button label="Abrir cámara" onPress={() => onPick(true)} />
        <Button variant="ghost" label="Elegir de la galería" onPress={() => onPick(false)} />
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
function AnalyzingScreen({ progress, bloqueSel }) {
  const phase = progress < 45 ? 'Subiendo foto' : 'Analizando corrosión';
  return (
    <Screen center style={{ padding: 40, gap: 26 }}>
      <Spinner size={92} thickness={5} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: TOKENS.fontSizes.h3, fontWeight: '800', color: TOKENS.colors.text }}>{phase}</Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600, marginTop: 6 }}>
          Bloque {bloqueSel} · {progress < 45 ? 'envío a la nube' : 'detección de óxido (YOLO)'}
        </Text>
      </View>
      <View style={{ width: '100%' }}>
        <ProgressBar value={progress} />
        <Text style={{ textAlign: 'right', fontSize: TOKENS.fontSizes.xs, color: TOKENS.colors.neutral500, marginTop: 8 }}>
          {Math.round(progress)}%
        </Text>
      </View>
    </Screen>
  );
}

// ═══════════════════════════ RESULT ═══════════════════════════
function ResultScreen({
  medicion,
  bloqueSel,
  espesor,
  setEspesor,
  descripcion,
  setDescripcion,
  obsOpen,
  setObsOpen,
  obsSaved,
  onSaveObs,
  onNext,
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

        <ResultCard medicion={medicion} ubicacion={`Bloque ${bloqueSel}`} />

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
            <Button variant="ghost" label={obsSaved ? 'Guardado ✓' : 'Guardar observaciones'} onPress={onSaveObs} />
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ padding: PAD, gap: 10 }}>
        <Button label="Siguiente medición" onPress={onNext} />
        <Button variant="ghost" label="Volver al inicio" onPress={onHome} />
      </View>
    </Screen>
  );
}

// ═══════════════════════════ DETAIL ═══════════════════════════
function DetailScreen({ medicion, bloque, obs, esAdmin, onBack, onShare, onDelete }) {
  const s = severidad(medicion);
  const uri = medicion._localUri || medicion.url_imagen || medicion.url_thumbnail;
  const lat = medicion.latitud_real ?? medicion.punto_info?.coordenadas?.lat;
  const lng = medicion.longitud_real ?? medicion.punto_info?.coordenadas?.lng;
  const clima = medicion.clima || {};
  return (
    <Screen>
      <Header
        title={bloque ? `Bloque ${bloque}` : 'Medición'}
        subtitle={formatDateTime(medicion.timestamp)}
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
          {num(medicion.area_corroida_pct, 0).toFixed(0)}%
        </Text>
        <Text style={{ fontSize: TOKENS.fontSizes.small, color: TOKENS.colors.neutral600 }}>
          {s.label} · confianza {confianzaPct(medicion.confianza_promedio)}%
        </Text>

        <View style={{ marginTop: 18 }}>
          <KeyValueCard
            rows={[
              { label: 'Entidad', value: ENTIDAD },
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

        <Button variant="ghost" label="Compartir" onPress={onShare} />
        {esAdmin && (
          <Button variant="danger" label="Eliminar medición" onPress={onDelete} style={{ marginTop: 10 }} />
        )}
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

function tituloBloque(m, bloqueMap) {
  const b = bloqueDeMedicion(m, bloqueMap);
  return b ? (BLOQUES_CAMPUS[b]?.nombre || `Bloque ${b}`) : 'Sin bloque';
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
