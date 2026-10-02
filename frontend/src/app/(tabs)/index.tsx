import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Yukita Fit</Text>
      <Text style={styles.subtitle}>Resumen del negocio</Text>
      <View style={styles.accentBar} />
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
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.textMuted,
  },
  accentBar: {
    marginTop: 16,
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
});
