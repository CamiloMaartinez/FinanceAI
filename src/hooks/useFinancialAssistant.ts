import { useState, useCallback } from 'react';
import { askFinancialAssistant } from '../services/ai';
import {
  getTotalBalance,
  getMonthlyTotals,
  getCategoryBreakdown,
  getAllGoals,
} from '../database/db';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface UseFinancialAssistantResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (question: string) => Promise<void>;
}

export function useFinancialAssistant(): UseFinancialAssistantResult {
  const [messages,  setMessages]  = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente financiero. Pregúntame sobre tus gastos, ingresos o metas. Por ejemplo: "¿Estoy gastando demasiado en restaurantes?"',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setError(null);

    // Agregar el mensaje del usuario inmediatamente
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Armar el contexto financiero real desde la base de datos
      const now = new Date();
      const month = now.getMonth() + 1;
      const year  = now.getFullYear();

      const [balance, totals, breakdown, goals] = await Promise.all([
        getTotalBalance(),
        getMonthlyTotals(month, year),
        getCategoryBreakdown(month, year),
        getAllGoals(),
      ]);

      const topCategories = breakdown
        .slice(0, 3)
        .map((c: any) => ({ name: c.categoryName, amount: c.total }));

      const activeGoals = goals.map((g: any) => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
      }));

      const answer = await askFinancialAssistant(question, {
        totalBalance: balance,
        monthlyIncome: totals.income,
        monthlyExpenses: totals.expense,
        topCategories,
        activeGoals,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: answer,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.log('ERROR COMPLETO DEL ASISTENTE:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error consultando al asistente';
      setError(errorMsg);
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text: `Error: ${errorMsg}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, isLoading, error, sendMessage };
}