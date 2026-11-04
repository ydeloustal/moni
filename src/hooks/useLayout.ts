import { useWindowDimensions } from 'react-native';
import { breakpoints, SIDE_NAVIGATION_WIDTH, space } from '@/theme';

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface Layout {
  width: number;
  size: SizeClass;
  /** Columns that fit in the width really available for the content. */
  columns: 1 | 2 | 3;
  gutter: number;
  /** Tabs on the left side (large screens) instead of the bottom. */
  sideNavigation: boolean;
}

/** Responsive helpers: phone (compact), tablet (medium), desktop web / large tablet (expanded). */
export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  const size: SizeClass =
    width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';
  const sideNavigation = width >= breakpoints.sideNavigation;
  const content = width - (sideNavigation ? SIDE_NAVIGATION_WIDTH : 0);
  return {
    width,
    size,
    columns: content >= 1300 ? 3 : content >= 760 ? 2 : 1,
    gutter: size === 'compact' ? space.lg : space.xl,
    sideNavigation,
  };
}
