import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { TextInput } from '../../src/components/ui/TextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialAssistant } from '../../src/hooks/useFinancialAssistant';
import { PurchaseEvaluatorModal } from '../../src/components/PurchaseEvaluatorModal';
import { useColors, spacing, typography, fonts } from '../../src/constants/theme';
import { TAB_BAR_HEIGHT } from '../../src/constants/layout';
import { AnimatedPressable } from '../../src/components/ui/AnimatedPressable';
import { BackButton } from '../../src/components/ui/BackButton';
import { hapticSave, hapticToggle } from '../../src/utils/haptics';

const VERDICT_CONFIG = {
  si:            { label: 'Sí puedes comprarlo',  tone: 'income' as const,  icon: 'checkmark-circle' as const },
  con_cuidado:   { label: 'Con cuidado',           tone: 'orange' as const,  icon: 'alert-circle' as const },
  mejor_espera:  { label: 'Mejor espera',          tone: 'expense' as const, icon: 'close-circle' as const },
};

const SUGGESTED_QUESTIONS = [
  '¿Estoy gastando demasiado?',
  '¿Cómo puedo ahorrar más?',
  '¿Cuál es mi categoría con más gasto?',
];

export default function AssistantScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const { messages, isLoading, sendMessage, evaluatePurchase } = useFinancialAssistant();
  const [input, setInput] = useState('');
  const [evaluatorVisible, setEvaluatorVisible] = useState(false);
  const scrollRef = useRef<Animated.ScrollView>(null);

  const handleEvaluate = async (itemDescription: string, price: number) => {
    await evaluatePurchase(itemDescription, price);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async (text?: string) => {
    const question = text ?? input;
    if (!question.trim() || isLoading) return;
    setInput('');
    await sendMessage(question);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ASISTENTE</Text>
            <Text style={styles.title}>FinanceAI</Text>
          </View>
          <AnimatedPressable
            style={styles.evaluatorButton}
            onPress={() => setEvaluatorVisible(true)}
            onPressFeedback={hapticSave}
          >
            <Ionicons name="calculator-outline" size={16} color={c.textPrimary} />
            <Text style={styles.evaluatorButtonText}>¿Puedo comprarlo?</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.divider} />

        {/* Chat */}
        <Animated.ScrollView
          entering={FadeIn.duration(350)}
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === 'user'
                  ? styles.bubbleUser
                  : styles.bubbleAssistant,
              ]}
            >
              {msg.role === 'assistant' && (
                <Text style={styles.bubbleRole}>AI</Text>
              )}
              {msg.isSummary && (
                <View style={styles.summaryBadge}>
                  <Ionicons name="calendar-outline" size={13} color={c.blue} />
                  <Text style={styles.summaryBadgeText}>Resumen de la semana</Text>
                </View>
              )}
              {msg.verdict && (
                <View style={[styles.verdictBadge, { backgroundColor: c[VERDICT_CONFIG[msg.verdict].tone] + '22' }]}>
                  <Ionicons
                    name={VERDICT_CONFIG[msg.verdict].icon}
                    size={14}
                    color={c[VERDICT_CONFIG[msg.verdict].tone]}
                  />
                  <Text style={[styles.verdictBadgeText, { color: c[VERDICT_CONFIG[msg.verdict].tone] }]}>
                    {VERDICT_CONFIG[msg.verdict].label}
                  </Text>
                </View>
              )}
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' && styles.bubbleTextUser,
              ]}>
                {msg.text}
              </Text>
            </View>
          ))}

          {isLoading && (
            <View style={styles.bubbleAssistant}>
              <Text style={styles.bubbleRole}>AI</Text>
              <ActivityIndicator size="small" color={c.textTertiary} />
            </View>
          )}

          {/* Sugerencias */}
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>SUGERENCIAS</Text>
              {SUGGESTED_QUESTIONS.map((q) => (
                <AnimatedPressable
                  key={q}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(q)}
                  onPressFeedback={hapticToggle}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={12}
                    color={c.textTertiary}
                  />
                </AnimatedPressable>
              ))}
            </View>
          )}
        </Animated.ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Pregunta sobre tus finanzas..."
              placeholderTextColor={c.textTertiary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
              editable={!isLoading}
              multiline
            />
            <AnimatedPressable accessibilityRole="button" accessibilityLabel="Enviar pregunta"
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              onPressFeedback={hapticSave}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={input.trim() ? c.background : c.textTertiary}
              />
            </AnimatedPressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <PurchaseEvaluatorModal
        visible={evaluatorVisible}
        onClose={() => setEvaluatorVisible(false)}
        onEvaluate={handleEvaluate}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  evaluatorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: c.borderStrong,
  },
  evaluatorButtonText: { fontSize: 12, fontWeight: '500', color: c.textPrimary },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  verdictBadgeText: { fontSize: 12.5, fontWeight: '700' },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: c.accent + '20',
    marginBottom: spacing.sm,
  },
  summaryBadgeText: { fontSize: 12, fontWeight: '700', color: c.blue },
  label: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: c.textSecondary, marginBottom: 2 },
  title: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: c.textPrimary },
  divider: { height: spacing.sm },
  chatArea: { flex: 1 },
  chatContent: { padding: spacing.xl, gap: spacing.lg },
  bubble: { maxWidth: '85%' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleRole: {
    ...typography.label,
    color: c.textTertiary,
    marginBottom: spacing.xs,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '300',
    color: c.textPrimary,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bubbleTextUser: {
    color: c.textPrimary,
    borderBottomWidth: 0.5,
    borderBottomColor: c.borderStrong,
    paddingBottom: spacing.sm,
  },
  suggestions: { marginTop: spacing.xl, gap: spacing.sm },
  suggestionsLabel: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  suggestionText: { fontSize: 13, fontWeight: '300', color: c.textSecondary },
  inputArea: { paddingBottom: TAB_BAR_HEIGHT + spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    color: c.textPrimary,
    maxHeight: 100,
    letterSpacing: 0.1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: c.surfaceTertiary },
});