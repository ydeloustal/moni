import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { UndoSnackbar } from '@/components';
import { BottomBar, SideBar, TABS, TopBar } from '@/features/app/Navigation';
import { useLayout } from '@/hooks/useLayout';
import { SelectedMonthProvider } from '@/hooks/useSelectedMonth';
import { useColors } from '@/theme';

export default function TabsLayout() {
  const c = useColors();
  const { sideNavigation: side } = useLayout();
  return (
    <SelectedMonthProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={props => (side ? <SideBar {...props} /> : <BottomBar {...props} />)}
          screenOptions={{
            tabBarPosition: side ? 'left' : 'bottom',
            sceneStyle: { backgroundColor: c.bg },
          }}
        >
          {Object.entries(TABS).map(([name, t]) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{ title: t.title, header: () => <TopBar title={t.title} /> }}
            />
          ))}
        </Tabs>
        <UndoSnackbar bottomOffset={side ? 0 : 96} />
      </View>
    </SelectedMonthProvider>
  );
}
