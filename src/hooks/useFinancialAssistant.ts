import { useState, useCallback } from 'react';
import { askFinancialAssistant, evaluatePurchase as evaluatePurchaseAI } from '../services/ai';
import {
  getTotalBalance,
  getMonthlyTotals,
  getCategoryBreakdown,
  getAllGoals,
} from '../database/db';

export type PurchaseVerdict = 'si' | 'con_cuidado' | 'mejor_espera';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  verdict?: PurchaseVerdict; // solo presente en respuestas del evaluador de compras
}

interface UseFinancialAssistantResult {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (question: string) => Promise<void>;
  evaluatePurchase: (itemDescription: string, price: number) => Promise<void>;
}

// Arma el "contexto financiero" real desde la base de datos, compartido
// tanto por el chat normal como por el evaluador de compras.
async function buildFinancialContext() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [balance, totals, breakdown, goals] = await Promise.all([
    getTotalBalance(),
    getMonthlyTotals(month, year),
    getCategoryBreakdown(month, year),
    getAllGoals(),
  ]);

  const topCategories = breakdown
    .slice(0, 3)
    .map((c) => ({ name: c.categoryName, amount: c.total }));

  const activeGoals = goals.map((g) => ({
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
    targetDate: g.targetDate,
  }));

  return {
    totalBalance: balance,
    monthlyIncome: totals.income,
    monthlyExpenses: totals.expense,
    topCategories,
    activeGoals,
  };
}

export function useFinancialAssistant(): UseFinancialAssistantResult {
  const [messages,  setMessages]  = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '¡Hola! Soy tu asistente financiero. Pregúntame sobre tus gastos, ingresos o metas, o usa "¿Puedo comprarlo?" para evaluar una compra. Por ejemplo: "¿Estoy gastando demasiado en restaurantes?"',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const context = await buildFinancialContext();
      const answer = await askFinancialAssistant(question, context);

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: answer,
      }]);
    } catch (err) {
      if (__DEV__) {
        console.log('Error del asistente financiero:', err);
      }
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

  const evaluatePurchase = useCallback(async (itemDescription: string, price: number) => {
    setError(null);

    const label = itemDescription.trim()
      ? `¿Puedo comprar "${itemDescription.trim()}" por $${Math.round(price).toLocaleString('es-CO')}?`
      : `¿Puedo comprar algo de $${Math.round(price).toLocaleString('es-CO')}?`;

    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', text: label }]);
    setIsLoading(true);

    try {
      const context = await buildFinancialContext();
      const result = await evaluatePurchaseAI(itemDescription.trim(), price, context);

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.reasoning,
        verdict: result.verdict,
      }]);
    } catch (err) {
      if (__DEV__) {
        console.log('Error del evaluador de compras:', err);
      }
      const errorMsg = err instanceof Error ? err.message : 'Error evaluando la compra';
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

  return { messages, isLoading, error, sendMessage, evaluatePurchase };
}
