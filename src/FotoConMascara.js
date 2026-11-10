// FotoConMascara.js — Foto a ancho completo con esquinas redondeadas y, opcionalmente, la máscara de corrosión
// dibujada encima (polígonos normalizados del backend; ver src/mascara.js). La foto llena la caja (cover) y la
// máscara usa el mismo rectángulo, así que no se desalinea aunque se recorte.
import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { FotoProgresiva } from './DesignComponents';
import { TOKENS, NIVELES } from './DesignTokens';
import { poligonosMascara, contornoPlaca, rectDeFoto, puntosAPixeles } from './mascara';

const COLOR_CORROSION = NIVELES[3].color; // el mismo rojo de la web (#dc2626) para las manchas
const COLOR_PLACA = NIVELES[0].color; // contorno de la placa: verde, solo línea (como la web)

export default function FotoConMascara({ uri, uriMini = null, medicion, ancho, alto, aspecto, mostrarMascara = false, radio = 20, onCargada, onFallo }) {
  const rect = rectDeFoto(ancho, alto, aspecto, 'cover');
  const poligonos = mostrarMascara ? poligonosMascara(medicion) : [];
  const placa = mostrarMascara ? contornoPlaca(medicion) : null;
  return (
    <View style={{ width: ancho, height: alto, borderRadius: radio, overflow: 'hidden' }}>
      <FotoProgresiva uri={uri} uriMini={uriMini} style={{ width: ancho, height: alto }} resizeMode="cover" iconSize={48} onCargada={onCargada} onFallo={onFallo} />
      {mostrarMascara && (
        <Svg width={ancho} height={alto} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none" aria-hidden>
          {poligonos.map((ps, i) => (
            <Polygon key={i} points={puntosAPixeles(ps, rect)} fill={COLOR_CORROSION} fillOpacity={0.45} stroke={COLOR_CORROSION} strokeWidth={1.5} strokeLinejoin="round" />
          ))}
          {placa && <Polygon points={puntosAPixeles(placa, rect)} fill="none" stroke={COLOR_PLACA} strokeWidth={2.5} strokeLinejoin="round" />}
        </Svg>
      )}
    </View>
  );
}
