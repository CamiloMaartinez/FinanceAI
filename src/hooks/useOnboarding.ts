import { useCallback, useMemo, useState } from 'react';
import { buildTour, cleanName, type Feature, type InterestId } from '../utils/onboardingPlan';
import { markOnboardingSeen, saveOnboardingAnswers } from '../services/onboarding';

/**
 * Pasos de la bienvenida. Los de servicios dependen de lo que el usuario
 * elija, por eso la lista se arma en cada render.
 */
export type OnboardingStep =
  | { kind: 'welcome' }
  | { kind: 'name' }
  | { kind: 'interests' }
  | { kind: 'feature'; feature: Feature }
  | { kind: 'ready' };

/** ViewModel de la bienvenida: la pantalla solo dibuja lo que esto expone. */
export function useOnboarding(profileId: string, onFinish: () => void) {
  const [index, setIndex] = useState(0);
  const [name, setName] = useState('');
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const tour = useMemo(() => buildTour(interests), [interests]);
  const steps = useMemo<OnboardingStep[]>(
    () => [
      { kind: 'welcome' },
      { kind: 'name' },
      { kind: 'interests' },
      ...tour.map((feature) => ({ kind: 'feature' as const, feature })),
      { kind: 'ready' },
    ],
    [tour],
  );

  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = index >= steps.length - 1;

  const toggleInterest = useCallback((id: InterestId) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  /** Guarda lo que haya contestado (aunque salte) y da la bienvenida por vista. */
  const finish = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveOnboardingAnswers(profileId, { name: cleanName(name), interests });
    } catch {
      // Si no se pudo guardar el nombre, igual dejamos entrar: se cambia en Perfil
    }
    await markOnboardingSeen(profileId);
    onFinish();
  }, [isSaving, profileId, name, interests, onFinish]);

  const next = useCallback(() => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  }, [isLast, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goTo = useCallback((i: number) => setIndex(Math.max(0, Math.min(i, steps.length - 1))), [steps.length]);

  return {
    steps,
    step,
    index,
    isFirst,
    isLast,
    isSaving,
    name,
    setName,
    interests,
    toggleInterest,
    tour,
    next,
    back,
    goTo,
    finish,
  };
}
