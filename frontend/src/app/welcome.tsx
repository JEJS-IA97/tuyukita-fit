import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/theme';
import { useAuth } from '@/auth/auth-context';
import YukitaLogo from '../../assets/yukita-02.svg';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, router]);

  return (
    <LinearGradient 
      colors={[colors.primary, colors.success]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.hero}>

            <YukitaLogo style={styles.logo} />

            <View style={styles.accentBar} />

            <Text style={styles.tagline}>
              ¡Come yuca y ponte yuka!
            </Text>
          </View>
          <View style={styles.bottomIndicator} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    position: 'relative',
  },

  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.onPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  logo: {
    width: 280,
    aspectRatio: 2.5,
  },
  accentBar: {
    marginTop: 16,
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  tagline: {
    marginTop: 24,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    color: colors.onPrimary,
    textAlign: 'center',
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