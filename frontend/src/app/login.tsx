import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ApiError } from '@/api/errors';
import { useAuth } from '@/auth/auth-context';
import { colors } from '@/theme';
import YukitaLogo from '../../assets/yukita-02.svg';

export default function LoginScreen() {
  const { signIn, status } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn(username.trim(), password);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        setErrorMessage(error.message);
      } else if (error instanceof ApiError) {
        setErrorMessage('Usuario o contraseña incorrectos');
      } else {
        setErrorMessage('No se pudo conectar con el servidor');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.success]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.content}>
            <YukitaLogo style={styles.logo} />

            <View style={styles.welcomeContainer}>
              <Text style={styles.title}>Bienvenido</Text>

              <Text style={styles.subtitle}>
                Ingresa con tu usuario para continuar
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={colors.onPrimary}
                  style={styles.inputIcon}
                />

                <TextInput
                  accessibilityLabel="Usuario"
                  autoCapitalize="none"
                  autoComplete="username"
                  onChangeText={setUsername}
                  placeholder="Usuario"
                  placeholderTextColor={colors.onPrimary}
                  style={styles.input}
                  value={username}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color={colors.onPrimary}
                  style={styles.inputIcon}
                />

                <TextInput
                  accessibilityLabel="Contraseña"
                  autoCapitalize="none"
                  autoComplete="password"
                  onChangeText={setPassword}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.onPrimary}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                />
              </View>

              {errorMessage !== null && (
                <Text
                  accessibilityRole="alert"
                  style={styles.error}
                  testID="login-error"
                >
                  {errorMessage}
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => void handleSubmit()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryButtonPressed,
                  submitting && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? 'Iniciando...' : 'Iniciar sesión'}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/forgot-password')}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </Pressable>
            </View>
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
    maxWidth: 280,
    aspectRatio: 2.5,
    marginBottom: 20,
  },

  welcomeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.onPrimary,
    opacity: 0.9,
    textAlign: 'center',
  },

  form: {
    width: '100%',
    gap: 14,
  },

  inputContainer: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.onPrimary,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },

  inputIcon: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.onPrimary,
  },

  error: {
    color: colors.onPrimary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 2,
  },

  primaryButton: {
    width: '100%',
    minHeight: 54,
    backgroundColor: colors.onPrimary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  primaryButtonPressed: {
    opacity: 0.9,
  },

  primaryButtonDisabled: {
    opacity: 0.7,
  },

  primaryButtonText: {
    color: colors.primary,
    fontSize: 17,
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

  forgotButton: {
  alignSelf: 'center',
  paddingVertical: 4,
  },

  forgotText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    opacity: 0.95,
  },
});