// src/utils.js - Funciones compartidas, no duplicar

export function dist(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function agruparMedicionesEnCiudades(mediciones) {
  // mediciones viene de GET /mediciones/recientes del backend.
  // Forma REAL confirmada (misma forma que la respuesta de POST /medicion, contrato de API):
  // {
  //   id_medicion, id_punto, timestamp, nivel_corrosion, area_corroida_pct,
  //   url_imagen,                        <- OJO: no es imagen_url ni uri ni s3_url
  //   punto_info: { ciudad, sede, coordenadas: { lat, lng }, clave_logica }
  // }
  // ciudad y coordenadas van ANIDADOS en punto_info, no en el nivel superior del objeto.
  // El backend no devuelve "barrio" en ningun lado - eso es un concepto solo del cliente
  // (reverseGeocode local al momento de tomar la foto), asi que el historial que viene del
  // backend siempre cae en una sola subcarpeta "general" por ciudad, salvo que se agregue
  // reverse geocoding client-side sobre punto_info.coordenadas para cada item del historial.
  const ciudadesMap = {};

  for (const m of mediciones) {
    const puntoInfo = m.punto_info || {};
    const ciudadNombre = puntoInfo.ciudad || m.ciudad || m.ciudadNombre || 'Desconocido';
    const barrioNombre = m.barrio || m.subcarpeta || m.district || 'general';
    const lat = puntoInfo.coordenadas?.lat ?? m.lat ?? m.latitud ?? m.coordenadas?.lat;
    const lng = puntoInfo.coordenadas?.lng ?? m.lng ?? m.longitud ?? m.coordenadas?.lng;

    if (!ciudadesMap[ciudadNombre]) {
      ciudadesMap[ciudadNombre] = { ciudad: ciudadNombre, subcarpetas: {} };
    }
    if (!ciudadesMap[ciudadNombre].subcarpetas[barrioNombre]) {
      ciudadesMap[ciudadNombre].subcarpetas[barrioNombre] = {
        id: `${ciudadNombre}-${barrioNombre}`,
        nombre: barrioNombre,
        direccion: '',
        lat,
        lng,
        fotos: [],
      };
    }

    // fecha: el campo real del backend es "timestamp", no "createdAt" (ese no existe en el contrato).
    // Guardamos el timestamp crudo aparte (_ts) para poder ordenar por fecha real,
    // ademas de la version ya formateada para mostrar en pantalla.
    const tsRaw = m.timestamp || m.fecha || null;
    const fecha = m.fecha
      ? m.fecha
      : m.timestamp
      ? new Date(m.timestamp).toLocaleDateString()
      : new Date().toLocaleDateString();

    ciudadesMap[ciudadNombre].subcarpetas[barrioNombre].fotos.push({
      id: m.id_medicion || m.id,
      uri: m.url_imagen || m.imagen_url || m.uri || m.s3_url,
      // ?? en vez de || : area_corroida_pct=0 es un resultado real (sin corrosion),
      // no un valor "vacio" que deba caer al siguiente fallback.
      pct: m.area_corroida_pct ?? m.pct ?? 0,
      nivel: m.nivel_corrosion ?? m.nivel ?? 'DESCONOCIDO',
      fecha,
      _ts: tsRaw,
      lat,
      lng,
    });
  }

  // Convertir mapa a array esperado por App.js.
  // Fotos ordenadas por fecha real, mas reciente primero (no por orden de llegada del backend).
  // Ciudades y subcarpetas ordenadas alfabeticamente para que la lista no salte de orden
  // cada vez que se recarga el historial.
  return Object.values(ciudadesMap)
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad))
    .map((c) => ({
      ciudad: c.ciudad,
      subcarpetas: Object.values(c.subcarpetas)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((s) => ({
          ...s,
          fotos: [...s.fotos].sort((a, b) => new Date(b._ts || 0) - new Date(a._ts || 0)),
        })),
    }));
}