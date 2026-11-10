import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '@/theme';

const INK = '#0f172a';
const GREEN = '#4ade80';

/**
 * Moni logo: a lowercase "m" stamped on a green coin, on a rounded tile.
 * Same drawing as assets/brand/moni-icon.svg (1024 × 1024 viewBox).
 */
export function Logo({ size = 40 }: { size?: number }) {
  const c = useColors();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 1024 1024">
        <Rect width={1024} height={1024} rx={256} fill={c.hero} />
        <Circle cx={512} cy={512} r={300} fill={GREEN} />
        <Path
          d="M362 610V490a75 75 0 0 1 150 0v120M512 490a75 75 0 0 1 150 0v120"
          stroke={INK}
          strokeWidth={80}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
