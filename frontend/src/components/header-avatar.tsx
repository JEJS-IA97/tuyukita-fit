import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { colors } from '@/theme';

export function HeaderAvatar() {
  const { user } = useAuth();
  const source = user?.name || user?.username || 'U';
  const initial = source.trim().charAt(0).toUpperCase();

  return (
    <View style={styles.avatar}>
      <Text style={styles.letter}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  letter: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
