import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthenticatedArea } from '@/auth/authenticated-area';
import { HeaderAvatar } from '@/components/header-avatar';
import { colors } from '@/theme';

export default function TabLayout() {
  return (
    <AuthenticatedArea>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.onPrimary,
          headerTitleStyle: { fontWeight: '700' },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            headerRight: () => <HeaderAvatar />,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventario',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Gastos',
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthenticatedArea>
  );
}
