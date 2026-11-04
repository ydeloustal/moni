/** Stroke icons drawn in SVG: no icon font, nothing downloaded. Decorative: hidden from screen readers. */
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const PATHS = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  list: ['M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'],
  chart: ['M3 3v18h18', 'M7 15l4-4 3 3 5-6'],
  leaf: ['M5 19c0-8 5-14 15-14 0 10-6 15-14 15', 'M5 19c2-4 5-7 9-9'],
  plus: ['M12 5v14M5 12h14'],
  edit: ['M4 20h4L19 9l-4-4L4 16z'],
  trash: ['M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  chevronRight: ['M9 6l6 6-6 6'],
  close: ['M6 6l12 12M18 6L6 18'],
  alert: ['M12 3l10 18H2z', 'M12 10v5M12 18h.01'],
  check: ['M5 12l5 5 9-10'],
  download: ['M12 4v11M7 11l5 5 5-5M5 20h14'],
  upload: ['M12 16V5M7 9l5-5 5 5M5 20h14'],
  repeat: [
    'M17 2l4 4-4 4',
    'M3 11V9a3 3 0 0 1 3-3h15',
    'M7 22l-4-4 4-4',
    'M21 13v2a3 3 0 0 1-3 3H3',
  ],
  copy: ['M5 15V6a2 2 0 0 1 2-2h9'],
  scissors: ['M8.5 8.5 20 20M8.5 15.5 20 4'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  wallet: [
    'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    'M3 7l12-4 2 4',
    'M16 13.5h.01',
  ],
  target: [],
  gear: [
    'M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  ],
  info: ['M12 11v6M12 7.5h.01'],
  lock: ['M7 11V8a5 5 0 0 1 10 0v3'],
  tag: ['M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z', 'M8 8h.01'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 1.9,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {name === 'gear' || name === 'target' ? (
          <Circle cx={12} cy={12} r={name === 'gear' ? 3 : 9} {...common} />
        ) : null}
        {name === 'target' ? <Circle cx={12} cy={12} r={4.5} {...common} /> : null}
        {name === 'info' ? <Circle cx={12} cy={12} r={9} {...common} /> : null}
        {name === 'copy' ? <Rect x={9} y={9} width={11} height={11} rx={2} {...common} /> : null}
        {name === 'lock' ? <Rect x={4} y={11} width={16} height={10} rx={2} {...common} /> : null}
        {name === 'scissors' ? (
          <>
            <Circle cx={6} cy={6} r={3} {...common} />
            <Circle cx={6} cy={18} r={3} {...common} />
          </>
        ) : null}
        {PATHS[name].map(d => (
          <Path key={d} d={d} {...common} />
        ))}
      </Svg>
    </View>
  );
}
