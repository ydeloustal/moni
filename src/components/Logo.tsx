import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useColors } from '@/theme';

/**
 * Moni mark: an "M" with a green dot, on a rounded tile.
 * Same drawing as assets/brand/moni-icon.svg (1024 × 1024 viewBox).
 */
export function Logo({ size = 40 }: { size?: number }) {
  const c = useColors();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect width={1024} height={1024} rx={256} fill={c.primary} />
      <G transform="translate(-42 46)">
        <Path
          d="M296 720V336l216 240 216-240v384"
          stroke={c.onPrimary}
          strokeWidth={96}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={800} cy={224} r={62} fill={c.save} />
      </G>
    </Svg>
  );
}
