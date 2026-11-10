# PIXELRUST Móvil

Aplicación móvil para inspección y monitoreo de corrosión en campo con análisis asistido por inteligencia artificial.
Construida con Expo SDK 57, React Native 0.86 y backend serverless en AWS (Cognito, API Gateway, Lambda, DynamoDB y S3).

## Propósito

La aplicación móvil está diseñada como herramienta ágil para inspectores y técnicos en campo:
- Subir mediciones individuales o por lotes de inspección a puntos existentes.
- Analizar el porcentaje y severidad de corrosión mediante el modelo de segmentación en la nube.
- Vigilar y consultar el historial reciente de mediciones e indicadores en tiempo real.
- Operar de forma liviana y accesible, complementando la plataforma web sin duplicar funciones administrativas (sin gestión de usuarios, zonas ni puntos).

## Desarrollo y pruebas locales

### Opción 1 — Simulador Web con vista móvil (recomendada para pruebas rápidas)

1. Iniciar el servidor web de Expo:
   ```bash
   npx expo start --web --port 8082
   ```
2. Servir y abrir el simulador responsivo en el navegador:
   ```bash
   python3 -m http.server 3005
   ```
   Abrir en el navegador: `http://localhost:3005/preview.html`

### Modo demo (solo desarrollo, sin red)

`npm run demo` inicia la web en el puerto 8082 con `EXPO_PUBLIC_DEMO=1`: omite el login de Cognito y sirve datos **sintéticos** (usuario técnico, 5 puntos, ~60 mediciones de 4 meses, lotes y fotos sueltas) desde `src/demo/`, sin llamar al backend real. Subir, renombrar y eliminar operan sobre datos en memoria (se reinician al recargar). Un aviso "Modo demo · datos de ejemplo" queda visible. Sin la variable el código demo no se carga.

- Las fotos se piden a `http://localhost:3006` (`foto01..14.jpg`, `thumb01..14.jpg`); cambiar con `EXPO_PUBLIC_DEMO_IMG_BASE`. Sírvelas con `python3 -m http.server 3006` desde la carpeta que las contiene (no están en el repo).
- Parámetros de URL para capturas: `?offline=1` (simula sin conexión) y `?vacio=1` (sin mediciones).
- Cámara, galería y GPS están simulados en demo.

### Opción 2 — Dispositivo Android (Dev Client)

Debido a los módulos nativos de autenticación de AWS Amplify, se utiliza Expo Dev Client:

```bash
npx expo start --android
```

## Contrato de Backend (pf-corrosion-api)

La aplicación consume directamente los endpoints verificados del backend:

| Operación | Método y Ruta | Descripción |
|---|---|---|
| Autenticación | AWS Cognito | Token JWT ID sin prefijo Bearer |
| Perfil | `GET /usuarios/me` | Datos de usuario, rol y empresa |
| Indicadores | `GET /indicadores` | Resumen de mediciones a 30 días y puntos activos |
| Historial | `GET /mediciones/recientes?limit=N&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&resumen=1` | Mediciones recientes; se pagina moviendo `hasta` (sin cursor) |
| Puntos | `GET /bloques` | Puntos de inspección asociados a la empresa |
| Subida directa | `POST /medicion/upload-url` | Obtención de URL prefirmada S3 para imágenes grandes |
| Análisis IA | `POST /medicion` | Procesamiento del modelo de segmentación |
| Renombrar | `PATCH /mediciones/{id_punto}` / `POST /mediciones/lote/renombrar` | Actualización de etiquetas |
| Eliminar | `DELETE /mediciones/{id_punto}?id_medicion=...` | Eliminación de mediciones |
