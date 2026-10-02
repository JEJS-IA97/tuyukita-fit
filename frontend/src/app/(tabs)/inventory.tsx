import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export default function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventario</Text>
      <Text style={styles.hint}>Ingredientes y existencias</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  hint: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
  },
});
