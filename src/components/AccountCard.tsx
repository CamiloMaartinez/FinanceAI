import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { formatCurrency } from '../utils/currency';
import type { Account } from '../models/types';

interface AccountCardProps {
  account: Account;
  onPress: (account: Account) => void;
  onLongPress: (account: Account) => void;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking:   'Cuenta corriente',
  savings:    'Ahorros',
  cash:       'Efectivo',
  digital:    'Billetera digital',
  investment: 'Inversiones',
  credit:     'Tarjeta crédito',
};

export function AccountCard({ account, onPress, onLongPress }: AccountCardProps) {
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const cardColor = account.colorHex ?? colors.blue;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(account)}
      onLongPress={() => onLongPress(account)}
      activeOpacity={0.85}
    >
      {/* Fondo de color de la cuenta */}
      <View style={[styles.colorBar, { backgroundColor: cardColor }]} />

      {/* Círculo decorativo */}
      <View style={[styles.circle, { backgroundColor: cardColor + '30' }]} />

      <View style={styles.content}>
        {/* Fila superior: ícono + nombre */}
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: cardColor + '25' }]}>
            <Ionicons
              name="wallet-outline"
              size={20}
              color={cardColor}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.accountName}>{account.name}</Text>
            <Text style={styles.accountType}>{typeLabel}</Text>
          </View>
        </View>

        {/* Saldo */}
        <Text style={styles.balance}>
          {formatCurrency(account.balance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    overflow:        'hidden',
    marginBottom:    spacing.md,
  },
  colorBar: {
    position: 'absolute',
    left:     0,
    top:      0,
    bottom:   0,
    width:    4,
  },
  circle: {
    position:     'absolute',
    right:        -20,
    top:          -20,
    width:        100,
    height:       100,
    borderRadius: 50,
  },
  content: {
    padding:    spacing.lg,
    paddingLeft: spacing.lg + 4, // compensar la barra de color
    gap:        spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  iconCircle: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  accountName: {
    fontSize:   15,
    fontWeight: '600',
    color:      colors.textPrimary,
  },
  accountType: {
    fontSize:  12,
    color:     colors.textSecondary,
    marginTop: 2,
  },
  balance: {
    fontSize:   24,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
});