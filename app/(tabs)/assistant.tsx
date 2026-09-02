import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialAssistant } from '../../src/hooks/useFinancialAssistant';
import { PurchaseEvaluatorModal } from '../../src/components/PurchaseEvaluatorModal';
import { useColors, spacing, typography } from '../../src/constants/theme';

const VERDICT_CONFIG = {
  si:            { label: 'Sí puedes comprarlo',  color: '#34C759', icon: 'checkmark-circle' as const },
  con_cuidado:   { label: 'Con cuidado',           color: '#FF9500', icon: 'alert-circle' as const },
  mejor_espera:  { label: 'Mejor espera',          color: '#FF3B30', icon: 'close-circle' as const },
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
          <View>
            <Text style={styles.label}>ASISTENTE</Text>
            <Text style={styles.title}>FinanceAI</Text>
          </View>
          <TouchableOpacity
            style={styles.evaluatorButton}
            onPress={() => setEvaluatorVisible(true)}
          >
            <Ionicons name="calculator-outline" size={16} color={c.textPrimary} />
            <Text style={styles.evaluatorButtonText}>¿Puedo comprarlo?</Text>
          </TouchableOpacity>
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
                <View style={[styles.verdictBadge, { backgroundColor: VERDICT_CONFIG[msg.verdict].color + '20' }]}>
                  <Ionicons
                    name={VERDICT_CONFIG[msg.verdict].icon}
                    size={14}
                    color={VERDICT_CONFIG[msg.verdict].color}
                  />
                  <Text style={[styles.verdictBadgeText, { color: VERDICT_CONFIG[msg.verdict].color }]}>
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
                <TouchableOpacity
                  key={q}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                  <Ionicons
                    name="arrow-forward-outline"
                    size={12}
                    color={c.textTertiary}
                  />
                </TouchableOpacity>
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
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!input.trim() || isLoading}
            >
              <Ionicons
                name="arrow-up-outline"
                size={16}
                color={input.trim() ? c.background : c.textTertiary}
              />
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
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
    backgroundColor: 'rgba(0,122,255,0.12)',
    marginBottom: spacing.sm,
  },
  summaryBadgeText: { fontSize: 12, fontWeight: '700', color: c.blue },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  title: { fontSize: 22, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.5 },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginHorizontal: spacing.xl },
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
  inputArea: { paddingBottom: spacing.xl },
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