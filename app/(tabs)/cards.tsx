import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCards } from '../../src/hooks/useCards';
import { CardItem } from '../../src/components/CardItem';
import { CardForm } from '../../src/components/CardForm';
import { colors, spacing, typography } from '../../src/constants/theme';
import type { Card } from '../../src/models/types';

export default function CardsScreen() {
  const data = useCards();
  const [formVisible, setFormVisible] = useState(false);

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
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  const favorites    = data.cards.filter((c) => c.isFavorite);
  const nonFavorites = data.cards.filter((c) => !c.isFavorite);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={data.refresh}
            tintColor={colors.textTertiary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>COMPARADOR</Text>
            <Text style={styles.count}>
              {data.cards.length} tarjeta{data.cards.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setFormVisible(true)}>
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {data.cards.length === 0 ? (
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
      </ScrollView>

      <CardForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.lg,
  },
  label: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.xs },
  count: { fontSize: 24, fontWeight: '200', color: colors.textPrimary, letterSpacing: -0.5 },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: 0.5, backgroundColor: colors.borderStrong, marginBottom: spacing.xl },
  empty: { paddingVertical: spacing.xxl * 2, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '300', color: colors.textPrimary },
  emptySubtitle: {
    fontSize: 13, fontWeight: '300', color: colors.textTertiary,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    marginTop: spacing.lg, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl, borderWidth: 0.5,
    borderColor: colors.borderStrong, borderRadius: 6,
  },
  emptyButtonText: { fontSize: 13, fontWeight: '300', color: colors.textPrimary, letterSpacing: 0.3 },
  section: { marginBottom: spacing.lg },
  sectionLabel: { ...typography.label, color: colors.textTertiary, marginBottom: spacing.md },
  hint: {
    fontSize: 11, color: colors.textTertiary,
    textAlign: 'center', marginTop: spacing.xl, letterSpacing: 0.3,
  },
});