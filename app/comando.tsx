import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../src/components/ui/Text';
import { Button } from '../src/components/ui/Button';
import { useVoiceCommand } from '../src/hooks/useVoiceCommand';
import { isQuestion, transactionParams } from '../src/utils/voiceCommand';
import { useColors, spacing, typography } from '../src/constants/theme';

/**
 * Puerta de entrada de los comandos de voz:
 *
 *   financeai://comando?texto=gasté 25 mil en almuerzo con Nequi
 *
 * Un atajo de iPhone ("Dictar texto" → "Abrir URL") o el asistente envían
 * aquí la frase. Si se entiende, se reemplaza esta pantalla por la acción
 * (formulario precargado o el módulo pedido). Nada se guarda sin que el
 * usuario lo confirme en el formulario.
 */
export default function VoiceCommandScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const { texto } = useLocalSearchParams<{ texto?: string }>();
  const { command } = useVoiceCommand(texto);

  useEffect(() => {
    if (!command) return;
    if (command.kind === 'transaction') {
      router.replace({ pathname: '/transactions', params: transactionParams(command) });
    } else if (command.kind === 'navigate') {
      router.replace(command.route as Href);
    } else if (texto && isQuestion(texto)) {
      // "¿Cuánto gasté este mes?" no es una orden: la responde el asistente
      router.replace({ pathname: '/assistant', params: { pregunta: texto } });
    }
  }, [command, texto]);

  const goesToAssistant = command?.kind === 'unknown' && !!texto && isQuestion(texto);
  if (!command || command.kind !== 'unknown' || goesToAssistant) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const phrase = texto?.trim();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="mic-outline" size={40} color={c.textSecondary} />
        <Text style={styles.title}>No entendí la orden</Text>
        {!!phrase && <Text style={styles.phrase}>“{phrase}”</Text>}
        <Text style={styles.hint}>
          Prueba con “gasté 25 mil en almuerzo”, “recibí 2 millones de salario”,
          “transfiere 100 mil de Bancolombia a Nequi” o “abre presupuestos”.
        </Text>
        <View style={styles.actions}>
          {!!phrase && (
            <Button
              label="Preguntar al asistente"
              onPress={() => router.replace({ pathname: '/assistant', params: { pregunta: phrase } })}
            />
          )}
          <Button label="Ir al inicio" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  title: { ...typography.title, color: c.textPrimary, textAlign: 'center' },
  phrase: { ...typography.body, color: c.textPrimary, textAlign: 'center', fontStyle: 'italic' },
  hint: { ...typography.body, color: c.textSecondary, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
});
