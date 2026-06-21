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
import { colors, spacing, radius } from '../../src/constants/theme';

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
        <Text style={styles.title}>Asistente IA</Text>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text style={[
                styles.bubbleText,
                msg.role === 'user' && styles.bubbleTextUser,
              ]}>
                {msg.text}
              </Text>
            </View>
          ))}

          {isLoading && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}

          {/* Preguntas sugeridas — solo si no hay conversación todavía */}
          {messages.length === 1 && (
            <View style={styles.suggestions}>
              {SUGGESTED_QUESTIONS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(q)}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Pregunta sobre tus finanzas..."
            placeholderTextColor={colors.textTertiary}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chatArea: { flex: 1 },
  chatContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  bubbleUser: {
    backgroundColor: colors.blue,
    alignSelf: 'flex-end',
  },
  bubbleText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  suggestions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontSize: 13,
    color: colors.blue,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
});