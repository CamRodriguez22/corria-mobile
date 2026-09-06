# PIXELRUST

Detección de corrosión con IA (YOLOv8) — app móvil de inspección para el campus de Uninorte.
Expo SDK 57 · React Native 0.86 · AWS Amplify (Cognito) + API Gateway + Lambda + DynamoDB + S3.

## Cómo demostrarla el lunes

### Opción A — APK independiente (recomendada, sin laptop)

Se generó un APK con EAS Build (perfil `preview`). Instálalo directo en un Android:

1. Abre el link del build en https://expo.dev/accounts/camrodriguez22/projects/corria-mobile/builds
2. Descarga el `.apk` en el teléfono y ábrelo (permite "instalar apps desconocidas").
3. Abre PIXELRUST, inicia sesión con tu usuario Cognito.

Para regenerar el APK tras cambios:

```
npx eas-cli build --profile preview --platform android
```

### Opción B — Expo dev (con laptop y cable/wifi)

Requiere un **dev client** (Expo Go no sirve: la app usa módulos nativos de Amplify).

```
npx expo install expo-dev-client
npx eas-cli build --profile development --platform android   # una vez
npx expo start --dev-client                                  # cada vez que desarrolles
```

## Flujo de la app

Login → Inicio (dashboard + recientes) → **Nueva medición** → elegir Bloque (G/J/K/L) →
Cámara/Galería → Revisar foto → Analizar (POST a Lambda, corre YOLO) → Resultado
(+ observaciones) → se guarda en el backend y en carpeta local.
Pestañas: Inicio · Carpetas (por bloque) · Actividad (timeline) · Ajustes.

## Arquitectura (nota importante)

El backend **no conoce "bloques"**: trabaja con puntos geolocalizados por GPS. La app usa
"Bloque G/J/K/L" como etiqueta visual mapeada a coordenadas fijas de Uninorte
(`src/config.js`), pero **toda llamada de red usa el contrato real verificado**:

| | |
|---|---|
| Auth | `Authorization: <ID token>` de Cognito, **sin** `Bearer` |
| Subir | `POST /medicion` con `imagen_base64` (raw), `ubicacion:{modo}`, `latitud_real/longitud_real` |
| Historial | `GET /mediciones/recientes?limit=N` → `{ total, mediciones[] }` |
| Borrar | `DELETE /mediciones/{id_punto}?id_medicion={id_medicion}` |
| Severidad | `nivel_corrosion` numérico: 0 ninguna · 1 leve · 2 moderada · 3 severa · 4 crítica |

## Estructura

```
App.js                  — navegación + todas las pantallas
src/config.js           — endpoints, Cognito, bloques del campus, claves de AsyncStorage
src/api-real.js         — cliente del backend (contrato verificado en vivo)
src/utils.js            — GPS, cámara, geocoding, fechas, estadísticas, caché local, agrupación
src/DesignTokens.js     — colores, tipografía accesible, mapeo de severidad
src/DesignComponents.js — Button, Field, Spinner, TabBar, MeasurementRow, Screen, etc.
```

## Pendientes / mejoras futuras

- `expo-dev-client` no está instalado (por eso el APK es `preview`, no dev build).
- `react-native-safe-area-context` no se usa: hay un `<Screen>` propio con insets manuales.
- Sin cola offline con reintentos: solo caché de lectura en AsyncStorage.
- Las observaciones (espesor/nota) se guardan localmente; el backend no expone PATCH de medición.
