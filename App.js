import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';
import { AWS_CONFIG, APP_CONFIG, BLOQUES_CAMPUS } from './src/config';

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

import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, ScrollView, TextInput, Pressable,
  Dimensions, Image, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

import { TOKENS, styles } from './src/DesignTokens';
import {
  ButtonPrimary, ButtonSecondary, Card, CardTitle, CardBody,
  ResultCard, Header, Divider, StatusBadge
} from './src/DesignComponents';

import { subirMedicionReal, decidirUbicacion, getPuntosCercanos, getMedicionesRecientes } from './src/api-real';
import { dist, agruparMedicionesEnCiudades } from './src/utils';

const { width, height } = Dimensions.get('window');

export default function App() {
  // ════════════════════════════════════════════════════════════
  // ESTADOS PRINCIPALES
  // ════════════════════════════════════════════════════════════
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [token, setToken] = useState('');
  const [currentLoc, setCurrentLoc] = useState(null);
  const [region, setRegion] = useState({
    latitude: 4.7110,
    longitude: -74.0721,
    latitudeDelta: 0.6,
    longitudeDelta: 0.6,
  });
  const [ciudades, setCiudades] = useState([]);
  const [puntosBackend, setPuntosBackend] = useState([]);
  const [medicionesBackend, setMedicionesBackend] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ════════════════════════════════════════════════════════════
  // NUEVOS ESTADOS PARA PIXELRUST
  // ════════════════════════════════════════════════════════════
  const [view, setView] = useState('main'); // main, context, camera, resultado
  const [contexto, setContexto] = useState(null); // {bloque, entidad, ciudad}
  const [resultado, setResultado] = useState(null); // datos del modelo
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);

  // ════════════════════════════════════════════════════════════
  // FUNCIONES DE UBICACIÓN
  // ════════════════════════════════════════════════════════════
  const fetchLoc = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    const c = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    setCurrentLoc(c);
    setRegion({ ...c, latitudeDelta: 0.03, longitudeDelta: 0.03 });
  };

  const detectarBloqueAutomatico = (currentLoc) => {
    if (!currentLoc) return '';
    for (const [key, bloque] of Object.entries(BLOQUES_CAMPUS)) {
      const d = dist(
        currentLoc.latitude,
        currentLoc.longitude,
        bloque.lat,
        bloque.lng
      );
      if (d < bloque.radio) return key;
    }
    return '';
  };

  useEffect(() => {
    fetchLoc();
  }, []);

  // ════════════════════════════════════════════════════════════
  // AUTENTICACIÓN
  // ════════════════════════════════════════════════════════════
  const handleLogin = async () => {
    if (!user || !pass) {
      Alert.alert('Error', 'Usuario y contraseña requeridos');
      return;
    }
    try {
      await signIn({ username: user, password: pass });
      const session = await fetchAuthSession();
      const tk = session?.tokens?.accessToken?.toString() || '';
      setToken(tk);
      setLogged(true);
      cargarHistorialBackend(tk);
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar sesión: ' + e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setLogged(false);
      setUser('');
      setPass('');
      setToken('');
      setCiudades([]);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ════════════════════════════════════════════════════════════
  // CARGAR HISTORIAL
  // ════════════════════════════════════════════════════════════
  const cargarHistorialBackend = async (tk) => {
    try {
      setLoadingHistory(true);
      const [puntos, mediciones] = await Promise.all([
        getPuntosCercanos(tk),
        getMedicionesRecientes(tk),
      ]);
      setPuntosBackend(puntos);
      setMedicionesBackend(mediciones);
      if (mediciones && mediciones.length > 0) {
        const ciudadesDesdeBackend = agruparMedicionesEnCiudades(mediciones);
        setCiudades(ciudadesDesdeBackend);
      }
      return { puntos, mediciones };
    } catch (e) {
      console.log('Error cargando historial:', e.message);
      return { puntos: [], mediciones: [] };
    } finally {
      setLoadingHistory(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // CAPTURAR FOTO
  // ════════════════════════════════════════════════════════════
  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Necesitamos acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedPhotoUri(result.assets[0].uri);
      guardarFotoReal(result.assets[0].uri);
    }
  };

  // ════════════════════════════════════════════════════════════
  // GUARDAR FOTO (DUMMY DATA PARA PRESENTACIÓN)
  // ════════════════════════════════════════════════════════════
  const guardarFotoReal = async (uri) => {
    try {
      // Simular delay de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Datos ficticios del modelo (como si viniera del backend)
      const resultado = {
        nivel_corrosion: 'MODERADA',
        area_corroida_pct: 42,
        confianza_promedio: 78,
        detecciones: [],
        mascaras: [],
      };

      console.log('Medición simulada guardada:', {
        bloque: contexto.bloque,
        entidad: contexto.entidad,
        ciudad: contexto.ciudad,
        resultado,
        timestamp: new Date().toISOString(),
      });

      setResultado({
        ...resultado,
        bloque: contexto.bloque,
        confianza_promedio: Math.round(resultado.confianza_promedio),
      });
      setView('resultado');

    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ════════════════════════════════════════════════════════════
  // PANTALLA: LOGIN
  // ════════════════════════════════════════════════════════════
  if (!logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header title="PIXELRUST" subtitle="Detección de corrosión" />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <Card>
            <CardBody text="Ingresa tu usuario y contraseña" />
          </Card>

          <View style={{ marginBottom: TOKENS.spacing.md }}>
            <Text style={styles.smallText}>Usuario</Text>
            <View style={{
              backgroundColor: TOKENS.colors.neutral100,
              borderWidth: 2,
              borderColor: TOKENS.colors.divider,
              borderRadius: TOKENS.radius.md,
              paddingHorizontal: TOKENS.spacing.md,
              paddingVertical: TOKENS.spacing.sm,
            }}>
              <TextInput
                placeholder="tu@email.com"
                value={user}
                onChangeText={setUser}
                style={{
                  fontSize: TOKENS.fontSizes.body,
                  color: TOKENS.colors.text,
                  padding: 0,
                }}
                placeholderTextColor={TOKENS.colors.neutral500}
              />
            </View>
          </View>

          <View style={{ marginBottom: TOKENS.spacing.lg }}>
            <Text style={styles.smallText}>Contraseña</Text>
            <View style={{
              backgroundColor: TOKENS.colors.neutral100,
              borderWidth: 2,
              borderColor: TOKENS.colors.divider,
              borderRadius: TOKENS.radius.md,
              paddingHorizontal: TOKENS.spacing.md,
              paddingVertical: TOKENS.spacing.sm,
            }}>
              <TextInput
                placeholder="••••••"
                value={pass}
                onChangeText={setPass}
                secureTextEntry
                style={{
                  fontSize: TOKENS.fontSizes.body,
                  color: TOKENS.colors.text,
                  padding: 0,
                }}
                placeholderTextColor={TOKENS.colors.neutral500}
              />
            </View>
          </View>

          <ButtonPrimary
            label="Iniciar sesión"
            onPress={handleLogin}
            style={{ marginBottom: TOKENS.spacing.lg }}
          />
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: CONTEXT SELECTION (Nueva medición)
  // ════════════════════════════════════════════════════════════
  if (view === 'context') {
    const [bloqueSelected, setBloqueSelected] = useState(contexto?.bloque || '');

    useEffect(() => {
      if (currentLoc && !bloqueSelected) {
        const b = detectarBloqueAutomatico(currentLoc);
        if (b) setBloqueSelected(b);
      }
    }, [currentLoc]);

    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Nueva medición"
          subtitle="Selecciona bloque"
          onBack={() => setView('main')}
        />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <Card>
            <CardTitle text="Ubicación" />
            <CardBody text="Entidad: Uninorte | Ciudad: Barranquilla" />
          </Card>

          <Card>
            <CardTitle text="Bloques disponibles" />
            {Object.entries(BLOQUES_CAMPUS).map(([key, bloque]) => (
              <Pressable
                key={key}
                onPress={() => setBloqueSelected(key)}
                style={{
                  backgroundColor:
                    bloqueSelected === key
                      ? TOKENS.colors.accent
                      : TOKENS.colors.surface,
                  padding: TOKENS.spacing.md,
                  borderRadius: TOKENS.radius.md,
                  marginBottom: TOKENS.spacing.sm,
                }}
              >
                <Text
                  style={{
                    color:
                      bloqueSelected === key
                        ? '#fff'
                        : TOKENS.colors.text,
                    fontWeight: '600',
                    fontSize: TOKENS.fontSizes.body,
                  }}
                >
                  {bloque.nombre}
                </Text>
              </Pressable>
            ))}
          </Card>

          <ButtonPrimary
            label="Capturar foto"
            onPress={() => {
              setContexto({
                bloque: bloqueSelected,
                entidad: 'Uninorte',
                ciudad: 'Barranquilla',
              });
              setView('camera');
            }}
            disabled={!bloqueSelected}
            style={{ marginTop: TOKENS.spacing.lg }}
          />
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: CAMERA
  // ════════════════════════════════════════════════════════════
  if (view === 'camera') {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Cámara"
          subtitle={`Bloque ${contexto?.bloque}`}
          onBack={() => setView('context')}
        />

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View
            style={{
              width: width - 2 * TOKENS.spacing.lg,
              height: height * 0.5,
              backgroundColor: TOKENS.colors.neutral300,
              borderRadius: TOKENS.radius.lg,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={styles.bodyText}>Vista de cámara</Text>
          </View>
        </View>

        <View style={{ padding: TOKENS.spacing.lg, gap: TOKENS.spacing.base }}>
          <ButtonPrimary label="Capturar foto" onPress={openCamera} />
          <ButtonSecondary
            label="Cancelar"
            onPress={() => setView('context')}
          />
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: RESULTADO
  // ════════════════════════════════════════════════════════════
  if (view === 'resultado' && resultado) {
    const [espesor, setEspesor] = useState('');
    const [obs, setObs] = useState('');
    const [expandObs, setExpandObs] = useState(false);

    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header title="Resultado" onBack={() => setView('main')} />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <ResultCard
            nivel={resultado.nivel_corrosion}
            percentage={resultado.area_corroida_pct}
            confidence={resultado.confianza_promedio}
            ubicacion={`Bloque ${resultado.bloque}`}
          />

          <Divider />

          <Pressable
            onPress={() => setExpandObs(!expandObs)}
            style={{
              backgroundColor: TOKENS.colors.surface,
              padding: TOKENS.spacing.md,
              borderRadius: TOKENS.radius.md,
              marginBottom: TOKENS.spacing.base,
            }}
          >
            <Text style={styles.h4}>
              {expandObs ? '−' : '+'} Observaciones (opcional)
            </Text>
          </Pressable>

          {expandObs && (
            <Card>
              <View style={{ marginBottom: TOKENS.spacing.md }}>
                <Text style={styles.smallText}>Espesor (mm)</Text>
                <View
                  style={{
                    backgroundColor: TOKENS.colors.neutral100,
                    borderWidth: 2,
                    borderColor: TOKENS.colors.divider,
                    borderRadius: TOKENS.radius.md,
                    paddingHorizontal: TOKENS.spacing.md,
                    paddingVertical: TOKENS.spacing.sm,
                  }}
                >
                  <TextInput
                    placeholder="2.5"
                    value={espesor}
                    onChangeText={setEspesor}
                    keyboardType="decimal-pad"
                    style={{
                      fontSize: TOKENS.fontSizes.body,
                      color: TOKENS.colors.text,
                      padding: 0,
                    }}
                    placeholderTextColor={TOKENS.colors.neutral500}
                  />
                </View>
              </View>

              <View style={{ marginBottom: TOKENS.spacing.md }}>
                <Text style={styles.smallText}>Descripción</Text>
                <View
                  style={{
                    backgroundColor: TOKENS.colors.neutral100,
                    borderWidth: 2,
                    borderColor: TOKENS.colors.divider,
                    borderRadius: TOKENS.radius.md,
                    paddingHorizontal: TOKENS.spacing.md,
                    paddingVertical: TOKENS.spacing.sm,
                    minHeight: 80,
                  }}
                >
                  <TextInput
                    placeholder="Óxido en esquina, causas observadas..."
                    value={obs}
                    onChangeText={setObs}
                    multiline
                    numberOfLines={4}
                    style={{
                      fontSize: TOKENS.fontSizes.body,
                      color: TOKENS.colors.text,
                      padding: 0,
                    }}
                    placeholderTextColor={TOKENS.colors.neutral500}
                  />
                </View>
              </View>

              <ButtonPrimary
                label="Guardar observaciones"
                onPress={() => {
                  console.log('Observaciones guardadas:', { espesor, obs });
                  Alert.alert('Guardado', 'Observaciones guardadas correctamente');
                }}
                style={{ marginTop: TOKENS.spacing.md }}
              />
            </Card>
          )}

          <View style={{ gap: TOKENS.spacing.base, marginTop: TOKENS.spacing.lg }}>
            <ButtonPrimary
              label="Siguiente medición"
              onPress={() => {
                setResultado(null);
                setSelectedPhotoUri(null);
                setView('context');
              }}
            />
            <ButtonSecondary
              label="Volver al inicio"
              onPress={() => {
                setResultado(null);
                setSelectedPhotoUri(null);
                setView('main');
              }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: MAIN (Historial/Dashboard)
  // ════════════════════════════════════════════════════════════
  return (
    <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
      <Header
        title="PIXELRUST"
        subtitle="Tus mediciones"
      />

      <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
        <ButtonPrimary
          label="Nueva medición"
          onPress={() => setView('context')}
          style={{ marginBottom: TOKENS.spacing.lg }}
        />

        {loadingHistory ? (
          <ActivityIndicator
            size="large"
            color={TOKENS.colors.accent}
            style={{ marginTop: 50 }}
          />
        ) : ciudades && ciudades.length > 0 ? (
          ciudades.map((ciudad, idx) => (
            <Card key={idx}>
              <CardTitle text={`${ciudad.nombre}`} />
              <CardBody
                text={`${ciudad.mediciones?.length || 0} mediciones`}
              />
            </Card>
          ))
        ) : (
          <Card>
            <CardBody text="Sin mediciones aún. Comienza capturando una foto." />
          </Card>
        )}

        <Divider />

        <ButtonSecondary
          label="Cerrar sesión"
          onPress={handleLogout}
          style={{ marginTop: TOKENS.spacing.lg }}
        />
      </ScrollView>
    </View>
  );
}