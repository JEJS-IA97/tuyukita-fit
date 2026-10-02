import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@/api/errors';
import type {
  ExpensesSummary,
  LatestRates,
  RateDto,
  StockItem,
} from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { useRequest } from '@/hooks/use-request';
import {
  formatBs,
  formatRate,
  formatShortDate,
  formatUsd,
  monthLabel,
} from '@/lib/format';
import { colors } from '@/theme';

const DOT_COLORS = [colors.softGreen, colors.softAmber, colors.softRed];
const DOT_EMOJIS = ['🌿', '🥕', '📦'];

function rateValue(rate: RateDto | null, loading: boolean, error: Error | null) {
  if (loading) {
    return { value: '—', sub: 'Cargando...' };
  }
  if (rate) {
    return {
      value: `Bs ${formatRate(rate.valueVesPerUsd)}`,
      sub: `${rate.source} · ${formatShortDate(rate.effectiveDate)}`,
    };
  }
  if (error && error instanceof ApiError && error.status !== 404) {
    return { value: 'No se pudo cargar', sub: 'Toca Tasas para reintentar' };
  }
  return { value: 'Sin tasa registrada', sub: 'Verifica las tasas del día' };
}

export default function HomeScreen() {
  const { session } = useAuth();
  const rates = useRequest<LatestRates>(() =>
    session.client.get('/exchange-rates/latest'),
  );
  const expenses = useRequest<ExpensesSummary>(() =>
    session.client.get('/expenses/summary'),
  );
  const stock = useRequest<StockItem[]>(() =>
    session.client.get('/inventory/stock'),
  );

  const bcv = rateValue(rates.data?.bcv ?? null, rates.loading, rates.error);
  const usdt = rateValue(
    rates.data?.usdt ?? null,
    rates.loading,
    rates.error,
  );

  const stockItems = stock.data ?? [];
  const outOfStockCount = stockItems.filter(
    (item) => item.availableQuantityMinor === 0,
  ).length;
  const lowestStock = [...stockItems]
    .sort((a, b) => a.availableQuantityMinor - b.availableQuantityMinor)
    .slice(0, 5);
  const maxStock = Math.max(
    1,
    ...lowestStock.map((item) => item.availableQuantityMinor),
  );

  const expenseTotals = expenses.data;
  const gastosValue = expenses.loading
    ? '—'
    : expenseTotals
      ? formatBs(Number(expenseTotals.totalExpenses))
      : 'No se pudo cargar';
  const gastosCount = expenseTotals ? `${expenseTotals.expensesCount} gastos` : '';
  const gastosUsd = expenseTotals
    ? formatUsd(Number(expenseTotals.totalUsdMinor) / 100)
    : '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <View style={styles.chip}>
        <Text style={styles.chipText}>{monthLabel(new Date())}</Text>
        <Text style={styles.chipCaret}>▾</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.label}>Tasa BCV</Text>
          <Text style={styles.value}>{bcv.value}</Text>
          <Text style={styles.sub}>{bcv.sub}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Tasa USDT</Text>
          <Text style={styles.value}>{usdt.value}</Text>
          <Text style={styles.sub}>{usdt.sub}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Gastos del mes</Text>
          <Text style={styles.value}>{gastosValue}</Text>
          <View style={styles.subRow}>
            <Text style={styles.sub}>{gastosCount}</Text>
            <Text style={styles.sub}>{gastosUsd}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Insumos agotados</Text>
          <Text
            style={[
              styles.value,
              !stock.loading && outOfStockCount > 0 && styles.valueDown,
            ]}
          >
            {stock.loading ? '—' : String(outOfStockCount)}
          </Text>
          <Text style={styles.sub}>
            {stock.error ? 'No se pudo cargar' : 'sin existencia'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={styles.btnPrimary}
          onPress={() => router.push('/expenses')}
        >
          <Text style={styles.btnPrimaryText}>+ Gasto</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.btnOutline}
          onPress={() => void rates.run()}
        >
          <Text style={styles.btnOutlineText}>Tasas</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Insumos con menor existencia</Text>

      {stock.loading ? (
        <Text style={styles.empty}>Cargando...</Text>
      ) : stock.error ? (
        <Text style={styles.emptyError}>No se pudo cargar las existencias</Text>
      ) : lowestStock.length === 0 ? (
        <Text style={styles.empty}>Aún no hay ingredientes registrados</Text>
      ) : (
        lowestStock.map((item, index) => {
          const out = item.availableQuantityMinor === 0;
          const ratio = item.availableQuantityMinor / maxStock;
          const barColor = out
            ? '#D96A6A'
            : ratio < 0.25
              ? colors.accent
              : colors.success;
          return (
            <View key={item.ingredientId} style={styles.row}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: DOT_COLORS[index % DOT_COLORS.length] },
                ]}
              >
                <Text style={styles.dotEmoji}>
                  {DOT_EMOJIS[index % DOT_EMOJIS.length]}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={styles.bar}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round(ratio * 100)}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
              <View style={styles.rowQty}>
                {out ? (
                  <Text style={styles.rowOut}>Agotado</Text>
                ) : (
                  <>
                    <Text style={styles.rowQtyValue}>
                      {String(item.availableQuantity)}
                    </Text>
                    <Text style={styles.rowUnit}>{item.unit}</Text>
                  </>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  chipCaret: {
    fontSize: 11,
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  card: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  valueDown: {
    color: colors.down,
  },
  sub: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  btnOutline: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmoji: {
    fontSize: 16,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  rowQty: {
    alignItems: 'flex-end',
  },
  rowQtyValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  rowUnit: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rowOut: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.down,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  emptyError: {
    fontSize: 13,
    color: colors.down,
    paddingVertical: 8,
  },
});
