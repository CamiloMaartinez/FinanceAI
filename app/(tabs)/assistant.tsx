import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialAssistant } from '../../src/hooks/useFinancialAssistant';
import { colors, spacing, typography } from '../../src/constants/theme';

const SUGGESTED_QUESTIONS = [
  '¿Estoy gastando demasiado?',
  '¿Cómo puedo ahorrar más?',
  '¿Cuál es mi categoría con más gasto?',
];

export default function AssistantScreen() {
  const { messages, isLoading, sendMessage } = useFinancialAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

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
          <Text style={styles.label}>ASISTENTE</Text>
          <Text style={styles.title}>FinanceAI</Text>
        </View>
        <View style={styles.divider} />

        {/* Chat */}
        <ScrollView
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
              <ActivityIndicator size="small" color={colors.textTertiary} />
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
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Pregunta sobre tus finanzas..."
              placeholderTextColor={colors.textTertiary}
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
                color={input.trim() ? colors.background : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  label: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  title: { fontSize: 22, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.5 },
  divider: { height: 0.5, backgroundColor: colors.borderStrong, marginHorizontal: spacing.xl },
  chatArea: { flex: 1 },
  chatContent: { padding: spacing.xl, gap: spacing.lg },
  bubble: { maxWidth: '85%' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleRole: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '300',
    color: colors.textPrimary,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bubbleTextUser: {
    color: colors.textPrimary,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderStrong,
    paddingBottom: spacing.sm,
  },
  suggestions: { marginTop: spacing.xl, gap: spacing.sm },
  suggestionsLabel: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 13, fontWeight: '300', color: colors.textSecondary },
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
    color: colors.textPrimary,
    maxHeight: 100,
    letterSpacing: 0.1,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.surfaceTertiary },
});