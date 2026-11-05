import { router } from 'expo-router';
import { BottomTabBar, Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, IconButton, UndoSnackbar, type IconName } from '@/components';
import { useLayout } from '@/hooks/useLayout';
import { SIDE_NAVIGATION_WIDTH, space, useColors } from '@/theme';

const TABS: { name: string; title: string; icon: IconName; add: boolean }[] = [
  { name: 'index', title: 'Accueil', icon: 'home', add: true },
  { name: 'operations', title: 'Opérations', icon: 'list', add: true },
  { name: 'history', title: 'Historique', icon: 'chart', add: true },
  { name: 'savings', title: 'Épargne', icon: 'leaf', add: false },
  { name: 'settings', title: 'Réglages', icon: 'gear', add: false },
];

/** Side menu (large screens): the app name above the regular tab items. */
function SideBar(props: BottomTabBarProps) {
  const c = useColors();
  return (
    <View
      style={[styles.side, { backgroundColor: c.surface, borderRightColor: c.line }]}
      testID="side-navigation"
    >
      <View style={styles.brand}>
        <Icon name="wallet" size={24} color={c.accent} strokeWidth={2} />
        <AppText variant="title">Moni</AppText>
      </View>
      <View style={{ flex: 1 }}>
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

function AddButton() {
  const { size } = useLayout();
  const open = () => router.push('/operation');
  if (size === 'compact') {
    return (
      <IconButton icon="plus" label="Ajouter une opération" onPress={open} testID="add-operation" />
    );
  }
  return (
    <Button
      kind="primary"
      small
      icon="plus"
      label="Ajouter une opération"
      onPress={open}
      style={{ marginRight: space.lg }}
      testID="add-operation"
    />
  );
}

export default function TabsLayout() {
  const c = useColors();
  const { sideNavigation: side } = useLayout();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={side ? props => <SideBar {...props} /> : undefined}
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
            ...(side ? { flex: 1, width: '100%', borderRightWidth: 0, paddingTop: 0 } : {}),
          },
          tabBarActiveTintColor: c.accent,
          tabBarActiveBackgroundColor: c.accentBg,
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
              headerRight: t.add ? () => <AddButton /> : undefined,
            }}
          />
        ))}
      </Tabs>
      <UndoSnackbar bottomOffset={side ? 0 : 56} />
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    width: SIDE_NAVIGATION_WIDTH,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg + space.xs,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
});
