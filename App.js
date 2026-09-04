import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';
import { AWS_CONFIG, BLOQUES_CAMPUS } from './src/config';

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
import {
  StyleSheet, Text, View, ScrollView, TextInput, Pressable,
  Dimensions, Image, Alert, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth';

import { TOKENS, styles } from './src/DesignTokens';
import {
  ButtonPrimary, ButtonSecondary, Card, CardTitle, CardBody,
  ResultCard, Header, Divider
} from './src/DesignComponents';

const { width, height } = Dimensions.get('window');

export default function App() {
  // ════════════════════════════════════════════════════════════
  // ESTADOS
  // ════════════════════════════════════════════════════════════
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [token, setToken] = useState('');
  const [view, setView] = useState('login');
  const [userName, setUserName] = useState('Juan Medina');
  
  // Nueva medición (contexto)
  const [contexto, setContexto] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState(null);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 12,
    severas: 3,
    avg: 'MODERADA',
  });

  // Mediciones recientes
  const [reciente, setReciente] = useState([
    {
      id: 1,
      block: 'K',
      date: '23 ago',
      pct: 42,
      pctLabel: '42% corroído',
      sev: 'MODERADA',
      color: '#c25f2a',
      tint: '#ffe1d0',
    },
    {
      id: 2,
      block: 'J',
      date: '22 ago',
      pct: 18,
      pctLabel: '18% corroído',
      sev: 'LEVE',
      color: '#5f6d47',
      tint: '#e1eecc',
    },
    {
      id: 3,
      block: 'G',
      date: '20 ago',
      pct: 67,
      pctLabel: '67% corroído',
      sev: 'SEVERA',
      color: '#8c3524',
      tint: '#ffe1d0',
    },
  ]);

  // ════════════════════════════════════════════════════════════
  // ESTADOS DE OBSERVACIONES Y CONTEXTO (movidos del nivel de pantalla)
  // ════════════════════════════════════════════════════════════
  const [espesor, setEspesor] = useState('');
  const [obs, setObs] = useState('');
  const [expandObs, setExpandObs] = useState(false);
  const [bloqueSelected, setBloqueSelected] = useState('');

  // ════════════════════════════════════════════════════════════
  // AUTO-LOGOUT AL INICIAR (para limpiar sesiones previas)
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    const cleanup = async () => {
      try {
        await signOut();
      } catch (e) {
        console.log('No hay sesión activa');
      }
    };
    cleanup();
  }, []);

  // ════════════════════════════════════════════════════════════
  // LOGIN
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
      setView('home');
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
      setView('login');
    } catch (e) {
      Alert.alert('Error', e.message);
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
      guardarFoto(result.assets[0].uri);
    }
  };

  const guardarFoto = async (uri) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResultado({
        nivel_corrosion: 'MODERADA',
        area_corroida_pct: 42,
        confianza_promedio: 78,
        bloque: contexto.bloque,
      });
      setView('result');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ════════════════════════════════════════════════════════════
  // PANTALLA: LOGIN
  // ════════════════════════════════════════════════════════════
  if (view === 'login') {
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
                }}
                placeholderTextColor={TOKENS.colors.neutral500}
              />
            </View>
          </View>

          <ButtonPrimary label="Iniciar sesión" onPress={handleLogin} />
          
          <View style={{ flex: 1 }} />
          <Text style={{ textAlign: 'center', fontSize: 12, color: TOKENS.colors.neutral500, marginTop: 50 }}>
            © 2026 Universidad del Norte
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: HOME
  // ════════════════════════════════════════════════════════════
  if (view === 'home' && logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <View style={{ paddingHorizontal: TOKENS.spacing.lg, paddingTop: TOKENS.spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontSize: 14, color: TOKENS.colors.neutral600 }}>Buenos días,</Text>
              <Text style={{ fontSize: 29, fontWeight: '700', marginTop: 2, color: TOKENS.colors.text }}>
                {userName}
              </Text>
            </View>
            <Pressable
              onPress={() => setView('settings')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: TOKENS.colors.accent100,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: TOKENS.colors.accent700 }}>JM</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg, paddingTop: TOKENS.spacing.base }}>
          {/* Estadísticas */}
          <View style={{ flexDirection: 'row', gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.lg }}>
            <View style={{ flex: 1, backgroundColor: TOKENS.colors.neutral100, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.md }}>
              <Text style={{ fontSize: 27, fontWeight: '700', color: TOKENS.colors.text }}>
                {stats.total}
              </Text>
              <Text style={{ fontSize: 12, color: TOKENS.colors.neutral600, marginTop: 3 }}>Mediciones</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: TOKENS.colors.neutral100, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.md }}>
              <Text style={{ fontSize: 27, fontWeight: '700', color: '#8c3524' }}>
                {stats.severas}
              </Text>
              <Text style={{ fontSize: 12, color: TOKENS.colors.neutral600, marginTop: 3 }}>Severas</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: TOKENS.colors.neutral100, borderRadius: TOKENS.radius.lg, padding: TOKENS.spacing.md }}>
              <Text style={{ fontSize: 27, fontWeight: '700', color: TOKENS.colors.accent2 }}>
                {stats.avg[0]}
              </Text>
              <Text style={{ fontSize: 12, color: TOKENS.colors.neutral600, marginTop: 3 }}>Promedio</Text>
            </View>
          </View>

          {/* Botón Nueva medición */}
          <ButtonPrimary
            label="+ Nueva medición"
            onPress={() => setView('context')}
            style={{ marginBottom: TOKENS.spacing.lg }}
          />

          {/* Mediciones recientes */}
          <Text style={{ fontSize: 13, fontWeight: '700', textTransform: 'uppercase', color: TOKENS.colors.neutral600, marginBottom: TOKENS.spacing.md, letterSpacing: 0.5 }}>
            Mediciones recientes
          </Text>

          {reciente.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => { setView('detail'); }}
              style={{
                backgroundColor: TOKENS.colors.neutral100,
                borderRadius: TOKENS.radius.lg,
                padding: TOKENS.spacing.md,
                marginBottom: TOKENS.spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
                gap: TOKENS.spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: '#5c4133',
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TOKENS.colors.text }}>
                  Bloque {m.block}
                </Text>
                <Text style={{ fontSize: 12.5, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                  {m.date} · {m.pctLabel}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: m.tint,
                  borderRadius: 999,
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: m.color, textTransform: 'uppercase' }}>
                  {m.sev}
                </Text>
              </View>
            </Pressable>
          ))}

          <Divider />

          {/* Botón Cerrar sesión */}
          <ButtonSecondary
            label="Cerrar sesión"
            onPress={handleLogout}
            style={{ marginTop: TOKENS.spacing.lg }}
          />
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: CONTEXT (Seleccionar bloque)
  // ════════════════════════════════════════════════════════════
  if (view === 'context' && logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Nueva medición"
          subtitle="Selecciona bloque"
          onBack={() => setView('home')}
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
                  backgroundColor: bloqueSelected === key ? TOKENS.colors.accent : TOKENS.colors.surface,
                  padding: TOKENS.spacing.md,
                  borderRadius: TOKENS.radius.md,
                  marginBottom: TOKENS.spacing.sm,
                }}
              >
                <Text style={{
                  color: bloqueSelected === key ? '#fff' : TOKENS.colors.text,
                  fontWeight: '600',
                  fontSize: TOKENS.fontSizes.body,
                }}>
                  {bloque.nombre}
                </Text>
              </Pressable>
            ))}
          </Card>

          <ButtonPrimary
            label="Capturar foto"
            onPress={() => {
              if (bloqueSelected) {
                setContexto({ bloque: bloqueSelected, entidad: 'Uninorte', ciudad: 'Barranquilla' });
                setView('camera');
              }
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
  if (view === 'camera' && logged) {
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
          <ButtonSecondary label="Cancelar" onPress={() => setView('context')} />
        </View>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: RESULT
  // ════════════════════════════════════════════════════════════
  if (view === 'result' && logged && resultado) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header title="Resultado" onBack={() => setView('home')} />

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
                <View style={{
                  backgroundColor: TOKENS.colors.neutral100,
                  borderWidth: 2,
                  borderColor: TOKENS.colors.divider,
                  borderRadius: TOKENS.radius.md,
                  paddingHorizontal: TOKENS.spacing.md,
                  paddingVertical: TOKENS.spacing.sm,
                }}>
                  <TextInput
                    placeholder="2.5"
                    value={espesor}
                    onChangeText={setEspesor}
                    keyboardType="decimal-pad"
                    style={{
                      fontSize: TOKENS.fontSizes.body,
                      color: TOKENS.colors.text,
                    }}
                    placeholderTextColor={TOKENS.colors.neutral500}
                  />
                </View>
              </View>

              <View style={{ marginBottom: TOKENS.spacing.md }}>
                <Text style={styles.smallText}>Descripción</Text>
                <View style={{
                  backgroundColor: TOKENS.colors.neutral100,
                  borderWidth: 2,
                  borderColor: TOKENS.colors.divider,
                  borderRadius: TOKENS.radius.md,
                  paddingHorizontal: TOKENS.spacing.md,
                  paddingVertical: TOKENS.spacing.sm,
                  minHeight: 80,
                }}>
                  <TextInput
                    placeholder="Óxido en esquina, causas observadas..."
                    value={obs}
                    onChangeText={setObs}
                    multiline
                    numberOfLines={4}
                    style={{
                      fontSize: TOKENS.fontSizes.body,
                      color: TOKENS.colors.text,
                    }}
                    placeholderTextColor={TOKENS.colors.neutral500}
                  />
                </View>
              </View>

              <ButtonPrimary
                label="Guardar observaciones"
                onPress={() => {
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
                setEspesor('');
                setObs('');
                setExpandObs(false);
                setView('context');
              }}
            />
            <ButtonSecondary
              label="Volver al inicio"
              onPress={() => {
                setResultado(null);
                setEspesor('');
                setObs('');
                setExpandObs(false);
                setView('home');
              }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: FOLDERS
  // ════════════════════════════════════════════════════════════
  if (view === 'folders' && logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Carpetas"
          subtitle="Organizadas por ciudad y bloque"
          onBack={() => setView('home')}
        />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <Card style={{ backgroundColor: TOKENS.colors.accent2_100 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TOKENS.colors.accent2_900 }}>
              📍 Barranquilla · Uninorte
            </Text>
            <Text style={{ fontSize: 13, color: TOKENS.colors.accent2_800, marginTop: 4 }}>
              {stats.total} mediciones
            </Text>
          </Card>

          <Divider />

          {/* Placeholder para bloques */}
          {['G', 'J', 'K', 'L'].map((bloque) => (
            <Pressable
              key={bloque}
              style={{
                backgroundColor: TOKENS.colors.neutral100,
                borderRadius: TOKENS.radius.lg,
                padding: TOKENS.spacing.md,
                marginBottom: TOKENS.spacing.sm,
              }}
              onPress={() => setView('home')}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: TOKENS.colors.text }}>
                Bloque {bloque}
              </Text>
              <Text style={{ fontSize: 12, color: TOKENS.colors.neutral600, marginTop: 2 }}>
                3 mediciones
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PANTALLA: SETTINGS
  // ════════════════════════════════════════════════════════════
  if (view === 'settings' && logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Configuración"
          subtitle="Tu perfil"
          onBack={() => setView('home')}
        />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <Card>
            <CardTitle text={userName} />
            <CardBody text="appbogota@corria.app" />
          </Card>

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

  // ════════════════════════════════════════════════════════════
  // PANTALLA: DETAIL
  // ════════════════════════════════════════════════════════════
  if (view === 'detail' && logged) {
    return (
      <View style={{ flex: 1, backgroundColor: TOKENS.colors.bg }}>
        <Header
          title="Medición"
          subtitle="23 de agosto"
          onBack={() => setView('home')}
        />

        <ScrollView contentContainerStyle={{ padding: TOKENS.spacing.lg }}>
          <ResultCard
            nivel="MODERADA"
            percentage={42}
            confidence={78}
            ubicacion="Bloque K"
          />

          <Card>
            <CardTitle text="Observaciones" />
            <CardBody text="Óxido en esquina superior derecha" />
          </Card>

          <Card>
            <CardTitle text="Espesor" />
            <CardBody text="2.5 mm" />
          </Card>

          <Divider />

          <ButtonSecondary
            label="Volver"
            onPress={() => setView('home')}
            style={{ marginTop: TOKENS.spacing.lg }}
          />
        </ScrollView>
      </View>
    );
  }

  // Fallback
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Cargando...</Text>
    </View>
  );
}