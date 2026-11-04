import { useWindowDimensions } from 'react-native';
import { breakpoints, space } from '@/theme';

export type SizeClass = 'compact' | 'medium' | 'expanded';

/** Responsive helpers: phone (compact), tablet (medium), desktop web / large tablet (expanded). */
export function useLayout(): {
  width: number;
  size: SizeClass;
  columns: 1 | 2 | 3;
  gutter: number;
} {
  const { width } = useWindowDimensions();
  const size: SizeClass =
    width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';
  return {
    width,
    size,
    columns: size === 'expanded' ? 3 : size === 'medium' ? 2 : 1,
    gutter: size === 'compact' ? space.lg : space.xl,
  };
}
