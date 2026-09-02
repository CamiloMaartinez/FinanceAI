import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useCards } from '../../src/hooks/useCards';
import { CardItem } from '../../src/components/CardItem';
import { CardForm } from '../../src/components/CardForm';
import { InvestmentCard } from '../../src/components/InvestmentCard';
import { INVESTMENT_OPTIONS } from '../../src/data/investmentOptions';
import { useColors, spacing, typography, radius } from '../../src/constants/theme';
import type { Card } from '../../src/models/types';

type Segment = 'cards' | 'investments';

export default function CardsScreen() {
  const c = useColors();
  const styles = useMemo(() => createStyles(c), [c]);
  const data = useCards();
  const [formVisible, setFormVisible] = useState(false);
  const [segment, setSegment] = useState<Segment>('cards');

  const handleSave = async (
    name: string, bank: string, annualFee: number,
    cashbackPercent: number, interestRate: number,
    benefits: string[], colorHex: string
  ) => {
    await data.addCard(name, bank, annualFee, cashbackPercent, interestRate, benefits, colorHex);
  };

  const handleToggleFavorite = async (card: Card) => {
    await data.toggleFavorite(card.id, !card.isFavorite);
  };

  const handleLongPress = (card: Card) => {
    Alert.alert(card.name, '¿Qué deseas hacer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => data.removeCard(card.id) },
    ]);
  };

  if (data.isLoading && data.cards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={c.textTertiary} />
      </View>
    );
  }

  const favorites    = data.cards.filter((c) => c.isFavorite);
  const nonFavorites = data.cards.filter((c) => !c.isFavorite);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView entering={FadeIn.duration(350)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={c.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>COMPARADOR</Text>
            <Text style={styles.count}>
              {segment === 'cards'
                ? `${data.cards.length} tarjeta${data.cards.length !== 1 ? 's' : ''}`
                : `${INVESTMENT_OPTIONS.length} opciones`}
            </Text>
          </View>
          {segment === 'cards' && (
            <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
              <Ionicons name="add" size={20} color={c.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, segment === 'cards' && styles.segmentButtonActive]}
            onPress={() => setSegment('cards')}
          >
            <Text style={[styles.segmentText, segment === 'cards' && styles.segmentTextActive]}>
              Tarjetas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, segment === 'investments' && styles.segmentButtonActive]}
            onPress={() => setSegment('investments')}
          >
            <Text style={[styles.segmentText, segment === 'investments' && styles.segmentTextActive]}>
              Inversiones
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {segment === 'investments' ? (
          <>
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle-outline" size={15} color={c.textTertiary} />
              <Text style={styles.disclaimerText}>
                Rangos de referencia según comportamiento histórico típico del mercado. Las tasas reales cambian constantemente — verifica siempre con la entidad antes de invertir. Esto no es asesoría financiera.
              </Text>
            </View>
            {INVESTMENT_OPTIONS.map((option) => (
              <InvestmentCard key={option.id} option={option} />
            ))}
          </>
        ) : data.cards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Sin tarjetas</Text>
            <Text style={styles.emptySubtitle}>
              Agrega tus tarjetas para comparar cuotas, cashback e intereses
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
            >
              <Text style={styles.emptyButtonText}>+ Nueva tarjeta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {favorites.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>FAVORITAS</Text>
                {favorites.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onToggleFavorite={handleToggleFavorite}
                    onLongPress={handleLongPress}
                  />
                ))}
              </View>
            )}

            {nonFavorites.length > 0 && (
              <View style={styles.section}>
                {favorites.length > 0 && (
                  <Text style={styles.sectionLabel}>TODAS</Text>
                )}
                {nonFavorites.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onToggleFavorite={handleToggleFavorite}
                    onLongPress={handleLongPress}
                  />
                ))}
              </View>
            )}

            <Text style={styles.hint}>
              Toca ⭐ para marcar favorita · Mantén presionada para eliminar
            </Text>
          </>
        )}
      </Animated.ScrollView>

      <CardForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: c.textTertiary, marginBottom: spacing.xs },
  count: { fontSize: 24, fontWeight: '200', color: c.textPrimary, letterSpacing: -0.5 },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: c.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: c.borderStrong, marginBottom: spacing.xl },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: c.surfaceSecondary,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: c.surface,
  },
  segmentText: { fontSize: 13, fontWeight: '500', color: c.textTertiary },
  segmentTextActive: { color: c.textPrimary, fontWeight: '600' },
  disclaimerBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  disclaimerText: { flex: 1, fontSize: 11.5, color: c.textTertiary, lineHeight: 16 },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: c.textPrimary },
  emptySubtitle: {
    fontSize: 13, fontWeight: '300', color: c.textTertiary,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl, borderWidth: 0.5,
    borderColor: c.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: c.textPrimary, letterSpacing: 0.3 },
  section: { marginBottom: spacing.lg },
  sectionLabel: { ...typography.label, color: c.textTertiary, marginBottom: spacing.md },
  hint: {
    fontSize: 11, color: c.textTertiary,
    textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3,
  },
});