import { DarkTheme, DefaultTheme, ThemeProvider as NavigationTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmProvider, LoadingState } from '@/components';
import { useLayout } from '@/hooks/useLayout';
import { StartupError } from '@/features/app/StartupError';
import { useStoreSnapshot } from '@/hooks/useBudget';
import { cleanupExports } from '@/services/files/files';
import { registerServiceWorker } from '@/services/pwa/registerServiceWorker';
import { budgetStore } from '@/services/store/instance';
import { ThemeProvider, useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
registerServiceWorker();

const MODALS = ['operation', 'balance', 'category', 'account', 'goal', 'backup'] as const;
const PAGES: Record<string, string> = {
  categories: 'Catégories',
  subscriptions: 'Abonnements',
  rates: 'Taux des livrets',
  privacy: 'Confidentialité',
};

function AppShell() {
  const { colors, scheme } = useTheme();
  const { status } = useStoreSnapshot();
  const { dialogModals } = useLayout();

  useEffect(() => {
    void budgetStore.init();
    cleanupExports();
    // Save immediately when the app goes to the background: the system may kill it.
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') void budgetStore.checkpoint();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => undefined);
  }, [status]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.bg,
        card: colors.surface,
        text: colors.ink,
        border: colors.line,
        primary: colors.ink,
      },
    };
  }, [colors, scheme]);

  let content;
  if (status === 'loading') content = <LoadingState label="Ouverture de tes données…" />;
  else if (status === 'error' || status === 'newer') content = <StartupError />;
  else {
    content = (
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {MODALS.map(name => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              // Web on a large screen: the page stays visible behind a centred dialog.
              presentation: dialogModals ? 'transparentModal' : 'modal',
              contentStyle: dialogModals ? { backgroundColor: 'transparent' } : undefined,
              headerShown: false,
            }}
          />
        ))}
        {Object.entries(PAGES).map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={{ title }} />
        ))}
        <Stack.Screen name="+not-found" options={{ title: 'Page introuvable' }} />
      </Stack>
    );
  }

  return (
    <NavigationTheme value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {content}
    </NavigationTheme>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConfirmProvider>
          <AppShell />
        </ConfirmProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
