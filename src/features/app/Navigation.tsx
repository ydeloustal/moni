import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import type { InteractionState } from '@/components/pressable';
import { useLayout } from '@/hooks/useLayout';
import { useSelectedMonth } from '@/hooks/useSelectedMonth';
import { radius, SIDE_NAVIGATION_WIDTH, space, TOUCH_TARGET, useColors } from '@/theme';
import { addMonths, monthLabel } from '@/utils/dates';

export const TABS: Record<string, { title: string; icon: IconName }> = {
  index: { title: 'Accueil', icon: 'home' },
  operations: { title: 'Opérations', icon: 'list' },
  history: { title: 'Prévisions', icon: 'chart' },
  savings: { title: 'Épargne', icon: 'leaf' },
};

const openAdd = () => router.push('/operation');
const openSettings = () => router.push('/settings');

function PressIcon({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={(s: InteractionState) => [
        styles.iconBtn,
        {
          backgroundColor: s.hovered || s.pressed ? c.chip : 'transparent',
          borderColor: s.focused ? c.focus : 'transparent',
        },
      ]}
    >
      <Icon name={icon} size={22} color={c.ink} strokeWidth={2} />
    </Pressable>
  );
}

function MonthPicker() {
  const { month, setMonth } = useSelectedMonth();
  const label = monthLabel(month);
  return (
    <View style={styles.month}>
      <PressIcon
        icon="chevronLeft"
        label="Mois précédent"
        onPress={() => setMonth(addMonths(month, -1))}
      />
      <AppText
        variant="heading"
        align="center"
        numberOfLines={1}
        style={{ minWidth: 136 }}
        accessibilityLiveRegion="polite"
        testID="top-month"
      >
        {label}
      </AppText>
      <PressIcon
        icon="chevronRight"
        label="Mois suivant"
        onPress={() => setMonth(addMonths(month, 1))}
      />
    </View>
  );
}

function SavedDot() {
  const c = useColors();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Données enregistrées sur cet appareil"
      style={styles.savedWrap}
    >
      <View style={[styles.saved, { backgroundColor: c.good, borderColor: c.goodBg }]} />
    </View>
  );
}

/** Top bar of the tabs: logo, month, save indicator, settings (title + month on large screens). */
export function TopBar({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { sideNavigation, gutter } = useLayout();
  if (sideNavigation) {
    return (
      <View
        style={[
          styles.top,
          {
            paddingTop: insets.top + space.md,
            paddingHorizontal: gutter + space.sm,
            backgroundColor: c.bg,
          },
        ]}
      >
        <AppText variant="h1" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </AppText>
        <View style={[styles.monthBox, { backgroundColor: c.surface, borderColor: c.line }]}>
          <MonthPicker />
        </View>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.top,
        {
          paddingTop: insets.top + space.sm,
          paddingLeft: gutter,
          paddingRight: gutter - space.sm,
          backgroundColor: c.bg,
        },
      ]}
    >
      <Pressable
        onPress={() => router.navigate('/')}
        accessibilityRole="button"
        accessibilityLabel="Moni, accueil"
        style={styles.logo}
      >
        <Logo size={40} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <MonthPicker />
      </View>
      <SavedDot />
      <PressIcon icon="gear" label="Réglages" onPress={openSettings} testID="open-settings" />
    </View>
  );
}

/** Bottom bar (phones, tablets): two tabs, the add button, two tabs. */
export function BottomBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const c = useColors();
  const items = state.routes.map((route, i) => {
    const meta = TABS[route.name];
    if (!meta) return null;
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          if (!focused) navigateToTab(route.key);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.title}
        testID={`tab-${route.name}`}
        style={(s: InteractionState) => [
          styles.tab,
          { borderColor: s.focused ? c.focus : 'transparent' },
        ]}
      >
        <View style={[styles.tabPill, { backgroundColor: focused ? c.accentBg : c.surface }]}>
          <Icon name={meta.icon} size={24} color={focused ? c.accent : c.muted} strokeWidth={2} />
        </View>
        <AppText
          style={{
            fontSize: 12,
            lineHeight: 16,
            fontWeight: '600',
            color: focused ? c.accent : c.muted,
          }}
          numberOfLines={1}
        >
          {meta.title}
        </AppText>
      </Pressable>
    );
  });
  const half = Math.ceil(items.length / 2);
  return (
    <View
      style={[
        styles.bottom,
        {
          paddingBottom: insets.bottom + space.sm,
          backgroundColor: c.surface,
          borderTopColor: c.line,
        },
      ]}
    >
      <View style={styles.bottomInner}>
        {items.slice(0, half)}
        <Pressable
          onPress={openAdd}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une opération"
          testID="add-operation"
          style={(s: InteractionState) => [
            styles.fab,
            {
              backgroundColor: c.primary,
              borderColor: s.focused ? c.focus : c.primary,
              opacity: s.pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name="plus" size={28} color={c.onPrimary} strokeWidth={2.4} />
        </Pressable>
        {items.slice(half)}
      </View>
    </View>
  );
}

function SideItem({
  icon,
  title,
  focused,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  focused: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      testID={testID}
      style={(s: InteractionState) => [
        styles.sideItem,
        {
          backgroundColor: focused ? c.accentBg : s.hovered ? c.sunken : 'transparent',
          borderColor: s.focused ? c.focus : 'transparent',
        },
      ]}
    >
      <Icon name={icon} size={22} color={focused ? c.accent : c.ink2} strokeWidth={2} />
      <AppText variant="label" style={{ color: focused ? c.accent : c.ink2, fontSize: 15 }}>
        {title}
      </AppText>
    </Pressable>
  );
}

/** Side menu (large screens): logo, add button, tabs, settings. */
export function SideBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const c = useColors();
  return (
    <View
      testID="side-navigation"
      style={[
        styles.side,
        { paddingTop: insets.top + space.lg, backgroundColor: c.surface, borderRightColor: c.line },
      ]}
    >
      <View style={styles.brand}>
        <Logo size={40} />
        <AppText variant="title">Moni</AppText>
      </View>
      <Pressable
        onPress={openAdd}
        accessibilityRole="button"
        testID="add-operation"
        style={(s: InteractionState) => [
          styles.sideAdd,
          {
            backgroundColor: c.primary,
            borderColor: s.focused ? c.focus : c.primary,
            opacity: s.pressed ? 0.85 : 1,
          },
        ]}
      >
        <Icon name="plus" size={20} color={c.onPrimary} strokeWidth={2.4} />
        <AppText variant="label" style={{ color: c.onPrimary, fontSize: 15 }}>
          Ajouter une opération
        </AppText>
      </Pressable>
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === i;
        return (
          <SideItem
            key={route.key}
            icon={meta.icon}
            title={meta.title}
            focused={focused}
            testID={`tab-${route.name}`}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
          />
        );
      })}
      <View style={{ flex: 1 }} />
      <SideItem icon="gear" title="Réglages" focused={false} onPress={openSettings} />
      <View style={styles.sideSaved}>
        <View style={[styles.saved, { backgroundColor: c.good, borderColor: c.goodBg }]} />
        <AppText variant="caption" tone="muted">
          Enregistré sur cet appareil
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingBottom: space.sm },
  logo: { width: 40, height: 40, borderRadius: 10 },
  month: { flexDirection: 'row', alignItems: 'center' },
  monthBox: { borderWidth: 1, borderRadius: radius.md, padding: 2 },
  iconBtn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedWrap: { width: 28, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  saved: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },
  bottom: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: space.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  tabPill: {
    width: 56,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 2,
    marginTop: -30,
    marginHorizontal: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.28)',
  },
  side: {
    width: SIDE_NAVIGATION_WIDTH + 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
    gap: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.sm,
    paddingBottom: space.lg,
  },
  sideAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: radius.md + 2,
    borderWidth: 2,
    marginBottom: space.md,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 46,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  sideSaved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
});
