import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';
import { AWS_CONFIG, APP_CONFIG } from './src/config';

// Config unica desde src/config.js - Fix punto 3 de Jose
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
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Dimensions, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { signIn, signOut, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { subirMedicionReal, decidirUbicacion, getPuntosCercanos, getMedicionesRecientes } from './src/api-real';
import { dist, agruparMedicionesEnCiudades } from './src/utils';

export default function App() {
  // FIX PUNTO 1 JOSE: campos vacios por defecto, nunca hardcodear password en repo publico
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [token, setToken] = useState('');
  const [currentLoc, setCurrentLoc] = useState(null);
  const [region, setRegion] = useState({ latitude: 4.7110, longitude: -74.0721, latitudeDelta: 0.6, longitudeDelta: 0.6 });
  const [ciudades, setCiudades] = useState([]);
  const [puntosBackend, setPuntosBackend] = useState([]);
  const [medicionesBackend, setMedicionesBackend] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [view, setView] = useState('main');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchLoc = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setCurrentLoc(c);
    setRegion({ ...c, latitudeDelta: 0.03, longitudeDelta: 0.03 });
  };

  useEffect(() => { fetchLoc(); }, []);

  const cargarHistorialBackend = async (tk) => {
    try {
      setLoadingHistory(true);
      const [puntos, mediciones] = await Promise.all([
        getPuntosCercanos(tk),
        getMedicionesRecientes(tk), // usa el limite maximo real del backend (100), definido en config.js
      ]);
      setPuntosBackend(puntos);
      setMedicionesBackend(mediciones);

      // FIX PUNTO 2 JOSE: poblar carpetas desde backend, no solo RAM
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

  const handleLogin = async () => {
    try {
      // Fix AlreadyAuthenticated
      try { await signOut(); } catch (e) {}
      console.log('Login con:', user.trim());
      const result = await signIn({
        username: user.trim(),
        password: pass.trim(),
        options: { authFlowType: 'USER_PASSWORD_AUTH' },
      });
      console.log('signIn result:', JSON.stringify(result));
      if (result.nextStep && result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        await confirmSignIn({ challengeResponse: pass.trim() });
      }
      const sess = await fetchAuthSession();
      const tk = sess.tokens.idToken.toString();
      setToken(tk);
      setLogged(true);
      const { puntos, mediciones } = await cargarHistorialBackend(tk);
      Alert.alert('Conectado', `${puntos.length} puntos, ${mediciones.length} mediciones en historial`);
    } catch (e) {
      console.log('ERROR LOGIN:', e.name, e.message);
      if (e.name === 'UserAlreadyAuthenticatedException') {
        try {
          const sess = await fetchAuthSession();
          const tk = sess.tokens.idToken.toString();
          setToken(tk);
          setLogged(true);
          await cargarHistorialBackend(tk);
          return;
        } catch (err) {}
      }
      Alert.alert('Error login', e.name + ': ' + e.message);
    }
  };

  const guardarFotoReal = async (uri) => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      // FIX: reverseGeocode va ANTES de decidirUbicacion (no despues como estaba).
      // decidirUbicacion necesita ciudad+barrio para poder devolver planta_nueva
      // en vez de coordenadas_libres cuando el punto no existe todavia.
      const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const ciudadGeo = rev[0]?.city || rev[0]?.subregion || null;
      const barrioGeo = rev[0]?.district || null;

      const ubicacionDecidida = decidirUbicacion(lat, lng, puntosBackend, ciudadGeo, barrioGeo);

      // FIX: lat/lng explicitos en el body (latitud_real/longitud_real) - en modo
      // planta_existente, ubicacionDecidida NO trae coordenadas propias.
      const res = await subirMedicionReal({ uri, token, ubicacionDecidida, lat, lng });

      // FIX: mostrar confianza_promedio, que el backend siempre devolvio pero nunca se mostraba.
      // OJO: no tengo una respuesta real del backend para confirmar si viene 0-1 o 0-100.
      // Prueba con una foto real y si sale mal formateado avisame para ajustar el *100.
      const confPct = typeof res.confianza_promedio === 'number'
        ? Math.round(res.confianza_promedio <= 1 ? res.confianza_promedio * 100 : res.confianza_promedio)
        : null;
      Alert.alert(
        'IA: ' + res.nivel_corrosion + ' ' + res.area_corroida_pct + '%',
        `ID ${res.id_medicion}` + (confPct !== null ? ` · Confianza: ${confPct}%` : '')
      );

      // Recargar historial real despues de subir, en vez de solo agregar a RAM
      await cargarHistorialBackend(token);

      // Mantener compatibilidad local para UX instantanea
      let nuevas = [...ciudades];
      const ciudadNombre = ciudadGeo || 'Bogota';
      let ciudad = nuevas.find((c) => c.ciudad.toLowerCase() === ciudadNombre.toLowerCase());
      if (!ciudad) { ciudad = { ciudad: ciudadNombre, subcarpetas: [] }; nuevas.push(ciudad); }
      let existente = null;
      for (let i = 0; i < ciudad.subcarpetas.length; i++) {
        if (dist(lat, lng, ciudad.subcarpetas[i].lat, ciudad.subcarpetas[i].lng) < APP_CONFIG.radioAgrupacionMetros) {
          existente = ciudad.subcarpetas[i]; break;
        }
      }
      if (existente) {
        existente.fotos.push({ id: res.id_medicion, uri, pct: res.area_corroida_pct, nivel: res.nivel_corrosion, fecha: new Date().toLocaleDateString(), lat, lng });
      } else {
        ciudad.subcarpetas.push({ id: res.id_punto, nombre: barrioGeo || 'general', direccion: rev[0]?.street || '', lat, lng, fotos: [{ id: res.id_medicion, uri, pct: res.area_corroida_pct, nivel: res.nivel_corrosion, fecha: new Date().toLocaleDateString(), lat, lng }] });
      }
      setCiudades(nuevas);
    } catch (e) { Alert.alert('Error API', e.message); }
  };

  const tomarFoto = async () => {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled) { await guardarFotoReal(r.assets[0].uri); }
  };

  const totalSub = ciudades.reduce((a, c) => a + c.subcarpetas.length, 0);
  const totalFotos = ciudades.reduce((a, c) => a + c.subcarpetas.reduce((b, s) => b + s.fotos.length, 0), 0);
  const previewItems = [];
  ciudades.forEach((c) => { c.subcarpetas.forEach((s) => { if (previewItems.length < 5) previewItems.push({ s, c }); }); });

  if (!logged) {
    return (
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#A855F7']} style={styles.loginContainer}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <View style={styles.logoCircle}><Text style={{ fontSize: 32 }}>⚡</Text></View>
          <Text style={styles.loginTitle}>pf-corrosion</Text>
          <Text style={styles.loginSub}>PF Laura, Camila y Jose - Login usuario final</Text>
          <TextInput style={styles.loginInput} value={user} onChangeText={setUser} placeholder="usuario@corria.app" autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.loginInput} value={pass} onChangeText={setPass} placeholder="Contraseña" secureTextEntry autoCapitalize="none" />
          <Pressable onPress={handleLogin}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.loginBtn}><Text style={styles.loginBtnText}>Entrar</Text></LinearGradient>
          </Pressable>
          <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 12, textAlign: 'center' }}>Cuenta prueba actual: pedir a Jose. Final: registro libre global.</Text>
        </View>
      </LinearGradient>
    );
  }

  if (view === 'folderDetail' && selectedFolder) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: 50 }}>
        <Pressable onPress={() => setView('main')} style={{ padding: 16 }}><Text style={{ color: '#4F46E5', fontWeight: '800' }}>← Volver</Text></Pressable>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.pageTitle}>📁 {selectedCity} / {selectedFolder.nombre}</Text>
          <Text style={styles.pageSub}>{selectedFolder.fotos.length} fotos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, justifyContent: 'space-between' }}>
            {selectedFolder.fotos.map((f) => (
              <Pressable key={f.id} onPress={() => { setSelectedPhoto({ ...f, ciudad: selectedCity, carpeta: selectedFolder.nombre }); setView('photoDetail'); }} style={{ width: '48%', backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                <Image source={{ uri: f.uri }} style={{ width: '100%', height: 120, backgroundColor: '#E5E7EB' }} />
                <View style={{ padding: 8 }}>
                  <Text style={{ fontSize: 10, backgroundColor: '#F97316', color: 'white', alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 6 }}>{f.nivel}</Text>
                  <Text style={{ fontSize: 11 }}>{f.pct}%</Text>
                  {f.fecha ? <Text style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2 }}>{f.fecha}</Text> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (view === 'photoDetail' && selectedPhoto) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', paddingTop: 50 }}>
        <Pressable onPress={() => setView('folderDetail')} style={{ padding: 16 }}><Text style={{ color: '#4F46E5', fontWeight: '800' }}>← Volver</Text></Pressable>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Image source={{ uri: selectedPhoto.uri }} style={{ width: '100%', height: 300, borderRadius: 16 }} />
          <View style={styles.chartCard}><Text style={{ fontWeight: '800' }}>{selectedPhoto.nivel} - {selectedPhoto.pct}%</Text></View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar style="dark" />
      <View style={styles.headerDash}><Text style={styles.headerTitle}>Dashboard Global</Text><Pressable onPress={async () => { try { await signOut(); } catch (e) {} setLogged(false); }}><Text style={{ color: '#EF4444' }}>Salir</Text></Pressable></View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.sectionRow}><Text style={styles.sectionLabel}>INDICADORES {loadingHistory ? '(cargando...)' : ''}</Text><Pressable onPress={tomarFoto} style={styles.blueBtn}><Text style={styles.blueBtnText}>↑ Foto POST /medicion</Text></Pressable></View>
        <View style={{ flexDirection: 'row', paddingLeft: 16 }}>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Local</Text><Text style={styles.metricValue}>{totalSub}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Backend Puntos</Text><Text style={styles.metricValue}>{puntosBackend.length}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Historial</Text><Text style={styles.metricValue}>{medicionesBackend.length}</Text></View>
        </View>
        {loadingHistory && <ActivityIndicator style={{ marginTop: 10 }} />}
        <View style={styles.mapCard}>
          <MapView style={{ height: 260, width: '100%' }} region={region} onRegionChangeComplete={setRegion}>
            {puntosBackend.map((p) => {
              const plat = p.lat || p.latitud || p.coordenadas?.lat;
              const plng = p.lng || p.longitud || p.coordenadas?.lng;
              if (!plat || !plng) return null;
              return <Marker key={'b-' + (p.id_punto || p.id)} coordinate={{ latitude: plat, longitude: plng }} pinColor="green" />;
            })}
            {ciudades.flatMap((c) => c.subcarpetas).map((s) => {
              if (!s.lat || !s.lng) return null;
              return (
                <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} pinColor="blue" onPress={() => { setSelectedFolder(s); const cityObj = ciudades.find((c) => c.subcarpetas.includes(s)); setSelectedCity(cityObj ? cityObj.ciudad : ''); setView('folderDetail'); }} />
              );
            })}
            {currentLoc && <Marker coordinate={currentLoc} pinColor="red" />}
          </MapView>
          <View style={{ padding: 10, backgroundColor: '#EFF6FF' }}><Text style={{ fontSize: 10 }}>Verde=Backend DynamoDB | Azul=Historial real | Rojo=Tu ubicación | Fix: GET /mediciones ahora</Text></View>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
          <View style={[styles.detailCard, { flex: 1, marginRight: 6 }]}><Text style={styles.detailTitle}>HISTORIAL REAL</Text><Text style={styles.empty}>{medicionesBackend.length > 0 ? `${medicionesBackend.length} mediciones cargadas del backend compartido con web` : 'Sin historial aún, toca Foto'}</Text></View>
          <View style={[styles.detailCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.detailTitle}>CARPETAS AUTO (Backend)</Text>
            {previewItems.map((item) => (<Pressable key={item.s.id} onPress={() => { setSelectedFolder(item.s); setSelectedCity(item.c.ciudad); setView('folderDetail'); }} style={styles.ubicRow}><Text style={{ fontSize: 11, fontWeight: '700' }}>📁 {item.c.ciudad}/{item.s.nombre}</Text><Text style={{ fontSize: 10 }}>{item.s.fotos.length} →</Text></Pressable>))}
            {totalSub === 0 && <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Vacío - toma foto en cualquier ciudad</Text>}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomNav}>
        <Pressable onPress={() => setView('main')} style={styles.navItem}><Text style={styles.navActive}>Dashboard</Text></Pressable>
        <Pressable onPress={tomarFoto} style={styles.fotoBtn}><Text style={{ color: 'white', fontWeight: '800' }}>📷</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loginCard: { width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 24, padding: 24, elevation: 10 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  loginTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  loginSub: { textAlign: 'center', color: '#6B7280', marginBottom: 20 },
  loginInput: { backgroundColor: '#F3F4F6', borderRadius: 14, padding: 14, marginBottom: 12 },
  loginBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  loginBtnText: { color: 'white', fontWeight: '700' },
  headerDash: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  sectionLabel: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  blueBtn: { backgroundColor: '#1E40AF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  blueBtnText: { color: 'white', fontSize: 11, fontWeight: '700' },
  metricCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, width: 110, marginRight: 12, borderTopWidth: 3, borderTopColor: '#1E40AF', elevation: 2 },
  metricLabel: { fontSize: 10, color: '#64748B' },
  metricValue: { fontSize: 20, fontWeight: '800', color: '#1E40AF', marginTop: 4 },
  mapCard: { margin: 16, backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', elevation: 3 },
  detailCard: { backgroundColor: 'white', borderRadius: 16, padding: 12, elevation: 2, minHeight: 120 },
  detailTitle: { fontSize: 10, fontWeight: '800', color: '#1E40AF', marginBottom: 8 },
  empty: { fontSize: 11, color: '#9CA3AF' },
  ubicRow: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  pageTitle: { fontSize: 18, fontWeight: '800' },
  pageSub: { fontSize: 12, color: '#64748B' },
  chartCard: { backgroundColor: 'white', borderRadius: 16, padding: 14, elevation: 2, marginTop: 12 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 76, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#E5E7EB' },
  navItem: { alignItems: 'center' },
  navActive: { color: '#4F46E5', fontWeight: '800', fontSize: 11 },
  fotoBtn: { backgroundColor: '#1E40AF', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});