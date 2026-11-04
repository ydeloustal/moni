import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { Icon, IconButton, UndoSnackbar, type IconName } from '@/components';
import { useLayout } from '@/hooks/useLayout';
import { SIDE_NAVIGATION_WIDTH, useColors } from '@/theme';

const TABS: { name: string; title: string; icon: IconName; add: boolean }[] = [
  { name: 'index', title: 'Accueil', icon: 'home', add: true },
  { name: 'operations', title: 'Opérations', icon: 'list', add: true },
  { name: 'history', title: 'Historique', icon: 'chart', add: true },
  { name: 'savings', title: 'Épargne', icon: 'leaf', add: false },
  { name: 'settings', title: 'Réglages', icon: 'gear', add: false },
];

export default function TabsLayout() {
  const c = useColors();
  const { sideNavigation: side } = useLayout();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarPosition: side ? 'left' : 'bottom',
          tabBarLabelPosition: side ? 'beside-icon' : 'below-icon',
          headerStyle: { backgroundColor: c.surface },
          headerShadowVisible: false,
          headerTitleStyle: { color: c.ink, fontWeight: '700' },
          headerTitleAlign: 'left',
          tabBarStyle: {
            backgroundColor: c.surface,
            borderTopColor: c.line,
            borderRightColor: c.line,
            ...(side ? { width: SIDE_NAVIGATION_WIDTH, paddingTop: 8 } : {}),
          },
          tabBarActiveTintColor: c.ink,
          tabBarActiveBackgroundColor: c.chip,
          tabBarInactiveTintColor: c.muted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          sceneStyle: { backgroundColor: c.bg },
        }}
      >
        {TABS.map(t => (
          <Tabs.Screen
            key={t.name}
            name={t.name}
            options={{
              title: t.title,
              tabBarAccessibilityLabel: t.title,
              tabBarIcon: ({ color }) => <Icon name={t.icon} color={String(color)} size={22} />,
              headerRight: t.add
                ? () => (
                    <IconButton
                      icon="plus"
                      label="Ajouter une opération"
                      onPress={() => router.push('/operation')}
                      testID="add-operation"
                    />
                  )
                : undefined,
            }}
          />
        ))}
      </Tabs>
      <UndoSnackbar bottomOffset={side ? 0 : 56} />
    </View>
  );
}
