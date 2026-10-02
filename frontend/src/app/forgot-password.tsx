import { router } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme';
import YukitaLogo from '../../assets/yukita-02.svg';

export default function ForgotPasswordScreen() {
  return (
    <LinearGradient
      colors={[colors.primary, colors.success]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <YukitaLogo style={styles.logo} />

            <Ionicons
              name="lock-open-outline"
              size={48}
              color={colors.onPrimary}
              style={styles.icon}
            />

            <Text style={styles.title}>
              ¿Olvidaste tu contraseña?
            </Text>

            <Text style={styles.description}>
              La recuperación de acceso en Yukita se gestiona de forma
              segura con un administrador.
            </Text>

            <Text style={styles.helpText}>
              Contacta a un administrador para solicitar el restablecimiento
              de tu contraseña.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                Volver al inicio de sesión
              </Text>
            </Pressable>
          </View>

          <View style={styles.bottomIndicator} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },

  content: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  logo: {
    width: '100%',
    maxWidth: 260,
    aspectRatio: 2.5,
    marginBottom: 34,
  },

  icon: {
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },

  description: {
    width: '100%',
    maxWidth: 360,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.onPrimary,
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 12,
  },

  helpText: {
    width: '100%',
    maxWidth: 350,
    fontSize: 14,
    lineHeight: 21,
    color: colors.onPrimary,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 28,
  },

  primaryButton: {
    width: '100%',
    minHeight: 54,
    backgroundColor: colors.onPrimary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonPressed: {
    opacity: 0.9,
  },

  primaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  bottomIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.onPrimary,
    opacity: 0.85,
  },
});