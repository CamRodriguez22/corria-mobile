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
| Historial | `GET /mediciones/recientes?limit=30&cursor=...` | Mediciones con paginación real |
| Puntos | `GET /bloques` | Puntos de inspección asociados a la empresa |
| Subida directa | `POST /medicion/upload-url` | Obtención de URL prefirmada S3 para imágenes grandes |
| Análisis IA | `POST /medicion` | Procesamiento del modelo de segmentación |
| Renombrar | `PATCH /mediciones/{id_punto}` / `POST /mediciones/lote/renombrar` | Actualización de etiquetas |
| Eliminar | `DELETE /mediciones/{id_punto}?id_medicion=...` | Eliminación de mediciones |
