import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, space, useColors } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type BannerTone = 'info' | 'good' | 'warn' | 'bad';

const ICONS: Record<BannerTone, IconName> = {
  info: 'info',
  good: 'check',
  warn: 'alert',
  bad: 'alert',
};

export function Banner({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: BannerTone;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const c = useColors();
  const colors = {
    info: { bg: c.infoBg, line: c.infoLine, fg: c.info },
    good: { bg: c.goodBg, line: c.goodLine, fg: c.good },
    warn: { bg: c.warnBg, line: c.warnLine, fg: c.warn },
    bad: { bg: c.badBg, line: c.badLine, fg: c.bad },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'bad' || tone === 'warn' ? 'alert' : undefined}
      style={[styles.box, { backgroundColor: colors.bg, borderColor: colors.line }]}
    >
      <Icon name={ICONS[tone]} size={20} color={colors.fg} />
      <View style={{ flex: 1, gap: space.xs }}>
        <AppText variant="label" style={{ color: colors.fg }}>
          {title}
        </AppText>
        {typeof children === 'string' ? (
          <AppText variant="caption" tone="ink2">
            {children}
          </AppText>
        ) : (
          children
        )}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
