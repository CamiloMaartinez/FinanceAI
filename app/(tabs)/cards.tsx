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
import { colors, spacing, radius } from '../../src/constants/theme';
import type { Card } from '../../src/models/types';

export default function CardsScreen() {
  const data = useCards();
  const [formVisible, setFormVisible] = useState(false);

  const handleSave = async (
    name: string,
    bank: string,
    annualFee: number,
    cashbackPercent: number,
    interestRate: number,
    benefits: string[],
    colorHex: string
  ) => {
    await data.addCard(name, bank, annualFee, cashbackPercent, interestRate, benefits, colorHex);
  };

  const handleToggleFavorite = async (card: Card) => {
    await data.toggleFavorite(card.id, !card.isFavorite);
  };

  const handleLongPress = (card: Card) => {
    Alert.alert(
      card.name,
      '¿Qué deseas hacer?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => data.removeCard(card.id),
        },
      ]
    );
  };

  if (data.isLoading && data.cards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.blue} />
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
            tintColor={colors.textPrimary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Comparador</Text>
            <Text style={styles.subtitle}>
              {data.cards.length} tarjeta{data.cards.length !== 1 ? 's' : ''} guardadas
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setFormVisible(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {data.error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {data.error}</Text>
          </View>
        )}

        {data.cards.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin tarjetas todavía</Text>
            <Text style={styles.emptySubtitle}>
              Agrega tus tarjetas para comparar cuotas, cashback e intereses
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setFormVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Agregar tarjeta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Favoritas */}
            {favorites.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star" size={14} color="#FF9500" />
                  <Text style={styles.sectionTitle}>Favoritas</Text>
                </View>
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

            {/* Todas las demás */}
            {nonFavorites.length > 0 && (
              <View style={styles.section}>
                {favorites.length > 0 && (
                  <Text style={styles.sectionTitle}>Todas las tarjetas</Text>
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
          </>
        )}

        {data.cards.length > 0 && (
          <Text style={styles.hint}>
            💡 Toca ⭐ para marcar tu favorita · Mantén presionada para eliminar
          </Text>
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.expense },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});