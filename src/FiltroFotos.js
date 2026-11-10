// FiltroFotos.js — Filtro común para toda pantalla que muestra muchas fotos (punto, lote, actividad).
// Busca por nombre (foto, lote o punto), filtra por rango de fechas y por nivel de corrosión. Es controlado:
// el estado vive en la pantalla (forma de FILTROS_VACIOS) y el filtrado lo hace `filtrarMediciones` (linea.js).
// `children` son chips extra propios de la pantalla (p. ej. el filtro por punto en Actividad).
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from './Typography';
import { Chip, HojaOpciones } from './DesignComponents';
import { TOKENS, NIVELES } from './DesignTokens';
import { IconNivel, IconClose } from './Icons';
import { alternarNivel, PRESETS_RANGO, FILTROS_VACIOS, hayFiltros, textoResultados } from './linea';
import { fechaValida } from './criteriosFiltro';
import { fechaMedia } from './fechas';

const PAD = TOKENS.spacing.lg;

function CampoFecha({ etiqueta, valor, onChange }) {
  const texto = String(valor || '').trim();
  const mal = texto.length > 0 && !fechaValida(texto);
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...TOKENS.type.labelSmall, color: TOKENS.colors.neutral600, marginBottom: 4 }}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
        placeholderTextColor={TOKENS.colors.neutral500}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={`${etiqueta} (año-mes-día)`}
        style={{
          minHeight: TOKENS.tapTarget,
          backgroundColor: '#fff',
          borderWidth: 1.5,
          borderColor: mal ? TOKENS.colors.danger : TOKENS.colors.neutral300,
          borderRadius: TOKENS.radius.md,
          paddingHorizontal: 12,
          fontSize: TOKENS.fontSizes.body,
          color: TOKENS.colors.text,
        }}
      />
      {mal && <Text style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.danger, marginTop: 2 }}>Fecha no válida</Text>}
    </View>
  );
}

export default function FiltroFotos({ filtros, onChange, total, nota = '', children = null, mostrarFechas = true, paddingHorizontal = PAD }) {
  const [hoja, setHoja] = useState(false);
  const set = (cambio) => onChange({ ...filtros, ...cambio });
  const presetSel = PRESETS_RANGO.find((p) => p.id === filtros.preset);
  const personalizado = filtros.preset === 'personalizado';
  const filtrado = hayFiltros(filtros);
  const opcionesFechas = [
    ...PRESETS_RANGO.map((p) => ({ value: p.id, label: p.id === 'todo' ? 'Todas las fechas' : `Últimos ${p.label}` })),
    { value: 'personalizado', label: 'Elegir fechas…' },
  ];
  const rotuloFechas = personalizado ? 'Fechas elegidas' : filtros.preset === 'todo' ? 'Fechas' : `Últimos ${presetSel?.label}`;

  return (
    <View>
      <View style={{ paddingHorizontal, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={filtros.texto || ''}
            onChangeText={(texto) => set({ texto })}
            placeholder="Buscar por nombre de foto, lote o punto"
            placeholderTextColor={TOKENS.colors.neutral500}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar por nombre de foto, lote o punto"
            style={{
              flex: 1,
              minHeight: TOKENS.tapTarget,
              backgroundColor: '#fff',
              borderWidth: 1.5,
              borderColor: TOKENS.colors.neutral300,
              borderRadius: TOKENS.radius.md,
              paddingLeft: 14,
              paddingRight: filtros.texto ? 48 : 14,
              fontSize: TOKENS.fontSizes.body,
              color: TOKENS.colors.text,
            }}
          />
          {!!filtros.texto && (
            <Pressable
              onPress={() => set({ texto: '' })}
              accessibilityRole="button"
              accessibilityLabel="Borrar la búsqueda"
              style={{ position: 'absolute', right: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              <IconClose size={18} color={TOKENS.colors.neutral700} />
            </Pressable>
          )}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: paddingHorizontal, paddingRight: paddingHorizontal + 32, gap: 8, alignItems: 'center' }}
        >
          {NIVELES.map((n) => {
            const activo = (filtros.niveles || []).includes(n.i);
            return (
              <Chip
                key={n.i}
                label={n.label}
                selected={activo}
                icon={<IconNivel nivel={n.i} size={16} color={activo ? TOKENS.colors.piedra_900 : n.texto} />}
                onPress={() => set({ niveles: alternarNivel(filtros.niveles || [], n.i) })}
              />
            );
          })}
          {mostrarFechas &&
            (filtros.dia ? (
              <Chip label={`Día: ${fechaMedia(filtros.dia)}`} selected onPress={() => {}} onQuitar={() => set({ dia: null })} />
            ) : (
              <Chip
                label={rotuloFechas}
                selected={filtros.preset !== 'todo'}
                menu
                onPress={() => setHoja(true)}
                accessibilityLabel="Filtrar por fechas"
                onQuitar={filtros.preset !== 'todo' ? () => set({ preset: 'todo', desde: '', hasta: '' }) : undefined}
              />
            ))}
          {children}
        </ScrollView>
        {/* Degradado a la derecha: indica que la fila sigue y no corta chips a media palabra. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(245,234,216,0)', TOKENS.colors.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 36 }}
        />
      </View>

      {mostrarFechas && personalizado && !filtros.dia && (
        <View style={{ paddingHorizontal, flexDirection: 'row', gap: 10, paddingBottom: 4 }}>
          <CampoFecha etiqueta="Desde" valor={filtros.desde} onChange={(desde) => set({ desde })} />
          <CampoFecha etiqueta="Hasta" valor={filtros.hasta} onChange={(hasta) => set({ hasta })} />
        </View>
      )}

      <View style={{ paddingHorizontal, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text accessibilityLiveRegion="polite" style={{ ...TOKENS.type.bodyMedium, color: TOKENS.colors.neutral600, flex: 1 }}>
          {textoResultados(total, filtrado)}
          {nota ? ` · ${nota}` : ''}
        </Text>
        {filtrado && (
          <Pressable
            onPress={() => onChange(FILTROS_VACIOS)}
            accessibilityRole="button"
            accessibilityLabel="Limpiar todos los filtros"
            style={{ minHeight: 48, justifyContent: 'center', paddingLeft: 12 }}
          >
            <Text style={{ ...TOKENS.type.labelLarge, color: TOKENS.colors.accentText }}>Limpiar filtros</Text>
          </Pressable>
        )}
      </View>

      <HojaOpciones
        visible={hoja}
        titulo="Filtrar por fechas"
        opciones={opcionesFechas}
        valor={filtros.preset}
        onElegir={(v) => {
          set({ preset: v, ...(v !== 'personalizado' ? { desde: '', hasta: '' } : {}) });
          setHoja(false);
        }}
        onCerrar={() => setHoja(false)}
      />
    </View>
  );
}
