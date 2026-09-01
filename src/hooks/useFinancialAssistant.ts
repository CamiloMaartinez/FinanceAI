import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  askFinancialAssistant,
  evaluatePurchase as evaluatePurchaseAI,
  generateWeeklySummary,
} from '../services/ai';
import {
  getTotalBalance,
  getMonthlyTotals,
  getCategoryBreakdown,
  getAllGoals,
  getTotalsInRange,
  getCategoryBreakdownInRange,
} from '../database/db';

const WEEKLY_SUMMARY_KEY = 'weekly-summary-last-shown';

export type PurchaseVerdict = 'si' | 'con_cuidado' | 'mejor_espera';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  verdict?: PurchaseVerdict; // solo presente en respuestas del evaluador de compras
  isSummary?: boolean;       // solo presente en el resumen financiero semanal
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
  const summaryCheckedRef = useRef(false);

  // Resumen financiero semanal: cada lunes, si no se ha mostrado ya el de
  // esta semana, la IA genera un análisis breve de la semana que acaba de
  // terminar (lunes a domingo) y lo inserta como mensaje del asistente.
  useEffect(() => {
    if (summaryCheckedRef.current) return;
    summaryCheckedRef.current = true;

    const checkWeeklySummary = async () => {
      const now = new Date();
      if (now.getDay() !== 1) return; // 1 = lunes

      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - 1); // domingo pasado
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6); // lunes de esa semana
      weekStart.setHours(0, 0, 0, 0);

      const weekKey = weekStart.toISOString().slice(0, 10);

      try {
        const lastShown = await AsyncStorage.getItem(WEEKLY_SUMMARY_KEY);
        if (lastShown === weekKey) return; // ya se mostró el de esta semana

        const prevWeekEnd = new Date(weekStart);
        prevWeekEnd.setMilliseconds(-1); // justo antes del lunes de esta semana
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(weekStart.getDate() - 7);

        const [totals, breakdown, prevTotals] = await Promise.all([
          getTotalsInRange(weekStart.toISOString(), new Date(weekEnd.getTime() + 1).toISOString()),
          getCategoryBreakdownInRange(weekStart.toISOString(), new Date(weekEnd.getTime() + 1).toISOString()),
          getTotalsInRange(prevWeekStart.toISOString(), weekStart.toISOString()),
        ]);

        // Si no hubo ningún movimiento esta semana, no molestamos con un resumen vacío
        if (totals.income === 0 && totals.expense === 0) {
          await AsyncStorage.setItem(WEEKLY_SUMMARY_KEY, weekKey);
          return;
        }

        const dateFmt = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

        const text = await generateWeeklySummary({
          weekStartLabel: dateFmt(weekStart),
          weekEndLabel: dateFmt(weekEnd),
          totalSpent: totals.expense,
          totalIncome: totals.income,
          topCategories: breakdown.slice(0, 3).map((c) => ({ name: c.categoryName, amount: c.total })),
          previousWeekSpent: prevTotals.expense > 0 ? prevTotals.expense : null,
        });

        setMessages((prev) => [...prev, {
          id: `summary-${Date.now()}`,
          role: 'assistant',
          text,
          isSummary: true,
        }]);

        await AsyncStorage.setItem(WEEKLY_SUMMARY_KEY, weekKey);
      } catch (err) {
        if (__DEV__) {
          console.log('Error generando el resumen semanal:', err);
        }
        // Silencioso: es una función adicional, no debe interrumpir el chat normal
      }
    };

    checkWeeklySummary();
  }, []);

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
