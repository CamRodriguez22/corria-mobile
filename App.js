import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_nirWPCLK5',
      userPoolClientId: '5vp9op8mlq07qbahpna4fjeld0',
      region: 'us-east-1',
      loginWith: { username: true, email: true }
    }
  }
});

import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TextInput, Pressable, Dimensions, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { signIn, signOut, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { subirMedicionReal, decidirUbicacion, getPuntosCercanos } from './src/api-real';

const { width } = Dimensions.get('window');

function dist(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function App() {
  const [logged, setLogged] = useState(false);
  const [user, setUser] = useState('appbogota@corria.app');
  const [pass, setPass] = useState('Corrosion2026');
  const [token, setToken] = useState('');
  const [currentLoc, setCurrentLoc] = useState(null);
  const [region, setRegion] = useState({ latitude: 4.7110, longitude: -74.0721, latitudeDelta: 0.6, longitudeDelta: 0.6 });
  const [ciudades, setCiudades] = useState([]);
  const [puntosBackend, setPuntosBackend] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [view, setView] = useState('main');

  const fetchLoc = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status!== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    const c = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setCurrentLoc(c);
    setRegion({...c, latitudeDelta: 0.03, longitudeDelta: 0.03 });
  };

  useEffect(() => { fetchLoc(); }, []);

  const handleLogin = async () => {
    try {
      try { await signOut(); } catch(e) {}
      console.log('Login con:', user);
      const result = await signIn({ username: user.trim(), password: pass.trim(), options: { authFlowType: 'USER_PASSWORD_AUTH' } });
      console.log('signIn result:', JSON.stringify(result));
      if (result.nextStep && result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        await confirmSignIn({ challengeResponse: 'Corrosion2026!' });
      }
      const sess = await fetchAuthSession();
      const tk = sess.tokens.idToken.toString();
      setToken(tk);
      setLogged(true);
      const puntos = await getPuntosCercanos(tk);
      setPuntosBackend(puntos);
      Alert.alert('Conectado a API real', puntos.length + ' puntos en DynamoDB');
    } catch (e) {
      console.log('ERROR LOGIN:', e.name, e.message);
      if (e.name === 'UserAlreadyAuthenticatedException') {
        try {
          const sess = await fetchAuthSession();
          const tk = sess.tokens.idToken.toString();
          setToken(tk);
          setLogged(true);
          const puntos = await getPuntosCercanos(tk);
          setPuntosBackend(puntos);
          Alert.alert('Ya estabas logueado', puntos.length + ' puntos');
          return;
        } catch(err) {}
      }
      Alert.alert('Error login', e.name + ': ' + e.message);
    }
  };

  const guardarFotoReal = async (uri) => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const ubicacionDecidida = decidirUbicacion(loc.coords.latitude, loc.coords.longitude, puntosBackend);
      const res = await subirMedicionReal({ uri, token, ubicacionDecidida });
      Alert.alert('IA: ' + res.nivel_corrosion + ' ' + res.area_corroida_pct + '%', 'ID ' + res.id_medicion);
      let nuevas = [...ciudades];
      let rev = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const ciudadNombre = rev[0]?.city || rev[0]?.subregion || 'Bogota';
      let ciudad = nuevas.find(function (c) { return c.ciudad.toLowerCase() === ciudadNombre.toLowerCase(); });
      if (!ciudad) { ciudad = { ciudad: ciudadNombre, subcarpetas: [] }; nuevas.push(ciudad); }
      let existente = null;
      for (let i = 0; i < ciudad.subcarpetas.length; i++) { if (dist(loc.coords.latitude, loc.coords.longitude, ciudad.subcarpetas[i].lat, ciudad.subcarpetas[i].lng) < 100) { existente = ciudad.subcarpetas[i]; break; } }
      if (existente) { existente.fotos.push({ id: res.id_medicion, uri: uri, pct: res.area_corroida_pct, nivel: res.nivel_corrosion, fecha: new Date().toLocaleDateString(), lat: loc.coords.latitude, lng: loc.coords.longitude }); }
      else { ciudad.subcarpetas.push({ id: res.id_punto, nombre: rev[0]?.district || 'general', direccion: rev[0]?.street || '', lat: loc.coords.latitude, lng: loc.coords.longitude, fotos: [{ id: res.id_medicion, uri: uri, pct: res.area_corroida_pct, nivel: res.nivel_corrosion, fecha: new Date().toLocaleDateString(), lat: loc.coords.latitude, lng: loc.coords.longitude }] }); }
      setCiudades(nuevas);
    } catch (e) { Alert.alert('Error API', e.message); }
  };

  const tomarFoto = async () => {
    const r = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!r.canceled) { await guardarFotoReal(r.assets[0].uri); }
  };

  const totalSub = ciudades.reduce(function (a, c) { return a + c.subcarpetas.length; }, 0);
  const totalFotos = ciudades.reduce(function (a, c) { return a + c.subcarpetas.reduce(function (b, s) { return b + s.fotos.length; }, 0); }, 0);
  const previewItems = [];
  ciudades.forEach(function (c) { c.subcarpetas.forEach(function (s) { if (previewItems.length < 5) { previewItems.push({ s: s, c: c }); } }); });

  if (!logged) {
    return (
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#A855F7']} style={styles.loginContainer}>
        <StatusBar style="light" />
        <View style={styles.loginCard}>
          <View style={styles.logoCircle}><Text style={{ fontSize: 32 }}>⚡</Text></View>
          <Text style={styles.loginTitle}>pf-corrosion</Text>
          <Text style={styles.loginSub}>appbogota@corria.app CONFIRMED</Text>
          <TextInput style={styles.loginInput} value={user} onChangeText={setUser} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.loginInput} value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" />
          <Pressable onPress={handleLogin}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.loginBtn}><Text style={styles.loginBtnText}>Entrar a API real</Text></LinearGradient>
          </Pressable>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
            {selectedFolder.fotos.map(function (f) {
              return (
                <Pressable key={f.id} onPress={() => { setSelectedPhoto({...f, ciudad: selectedCity, carpeta: selectedFolder.nombre }); setView('photoDetail'); }} style={{ width: (width - 44) / 2, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 12, marginRight: 8 }}>
                  <Image source={{ uri: f.uri }} style={{ height: 120, backgroundColor: '#E5E7EB' }} />
                  <View style={{ padding: 8 }}><Text style={{ fontSize: 10, backgroundColor: '#F97316', color: 'white', alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 6 }}>{f.nivel}</Text><Text style={{ fontSize: 11 }}>{f.pct}%</Text></View>
                </Pressable>
              );
            })}
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
      <View style={styles.headerDash}><Text style={styles.headerTitle}>Dashboard API real</Text><Pressable onPress={async () => { try{ await signOut(); }catch(e){} setLogged(false); }}><Text style={{ color: '#EF4444' }}>Salir</Text></Pressable></View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.sectionRow}><Text style={styles.sectionLabel}>INDICADORES</Text><Pressable onPress={tomarFoto} style={styles.blueBtn}><Text style={styles.blueBtnText}>↑ Foto POST /medicion</Text></Pressable></View>
        <View style={{ flexDirection: 'row', paddingLeft: 16 }}>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Local</Text><Text style={styles.metricValue}>{totalSub}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Backend</Text><Text style={styles.metricValue}>{puntosBackend.length}</Text></View>
          <View style={styles.metricCard}><Text style={styles.metricLabel}>Fotos</Text><Text style={styles.metricValue}>{totalFotos}</Text></View>
        </View>
        <View style={styles.mapCard}>
          <MapView style={{ height: 260, width: '100%' }} region={region} onRegionChangeComplete={setRegion}>
            {puntosBackend.map(function (p) {
              const plat = p.lat || p.latitud || p.coordenadas?.lat;
              const plng = p.lng || p.longitud || p.coordenadas?.lng;
              if (!plat ||!plng) return null;
              return <Marker key={'b-'+(p.id_punto||p.id)} coordinate={{ latitude: plat, longitude: plng }} pinColor="green" />;
            })}
            {ciudades.flatMap(function (c) { return c.subcarpetas; }).map(function (s) {
              return <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} pinColor="blue" onPress={() => { setSelectedFolder(s); const cityObj = ciudades.find(function (c) { return c.subcarpetas.includes(s); }); setSelectedCity(cityObj? cityObj.ciudad : ''); }} />;
            })}
            {currentLoc && <Marker coordinate={currentLoc} pinColor="red" />}
          </MapView>
          <View style={{ padding: 10, backgroundColor: '#EFF6FF' }}><Text style={{ fontSize: 10 }}>Verde=Backend | Azul=Local 100m | appbogota@corria.app</Text></View>
        </View>
        <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
          <View style={[styles.detailCard, { flex: 1, marginRight: 6 }]}><Text style={styles.detailTitle}>DETALLE</Text><Text style={styles.empty}>Toca un pin para ver</Text></View>
          <View style={[styles.detailCard, { flex: 1, marginLeft: 6 }]}>
            <Text style={styles.detailTitle}>CARPETAS AUTO</Text>
            {previewItems.map(function (item) { return <Pressable key={item.s.id} onPress={() => { setSelectedFolder(item.s); setSelectedCity(item.c.ciudad); setView('folderDetail'); }} style={styles.ubicRow}><Text style={{ fontSize: 11, fontWeight: '700' }}>📁 {item.c.ciudad}/{item.s.nombre}</Text><Text style={{ fontSize: 10 }}>{item.s.fotos.length} →</Text></Pressable>; })}
            {totalSub === 0 && <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Vacío - toma foto en Fontibón</Text>}
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
  fotoBtn: { backgroundColor: '#1E40AF', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }
});