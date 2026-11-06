/**
 * Stroke icons drawn in SVG: no icon font, nothing downloaded. Decorative: hidden from screen readers.
 *
 * Shapes from Lucide (https://lucide.dev), ISC License — free for any use, commercial included.
 * Copyright (c) Lucide Contributors 2022; portions (c) Cole Bemis 2013-2022 (Feather, MIT).
 * Circles, rectangles and lines are converted to paths. Full notice: THIRD_PARTY_NOTICES.md.
 */
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const PATHS = {
  /** lucide: house */
  home: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  /** lucide: list */
  list: ['M3 12h.01', 'M3 18h.01', 'M3 6h.01', 'M8 12h13', 'M8 18h13', 'M8 6h13'],
  /** lucide: chart-line */
  chart: ['M3 3v16a2 2 0 0 0 2 2h16', 'm19 9-5 5-4-4-3 3'],
  /** lucide: leaf */
  leaf: [
    'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z',
    'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  ],
  /** lucide: plus */
  plus: ['M5 12h14', 'M12 5v14'],
  /** lucide: pencil */
  edit: [
    'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    'm15 5 4 4',
  ],
  /** lucide: trash-2 */
  trash: [
    'M3 6h18',
    'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
    'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
    'M10 11L10 17',
    'M14 11L14 17',
  ],
  /** lucide: chevron-left */
  chevronLeft: ['m15 18-6-6 6-6'],
  /** lucide: chevron-right */
  chevronRight: ['m9 18 6-6-6-6'],
  /** lucide: x */
  close: ['M18 6 6 18', 'm6 6 12 12'],
  /** lucide: triangle-alert */
  alert: [
    'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
    'M12 9v4',
    'M12 17h.01',
  ],
  /** lucide: check */
  check: ['M20 6 9 17l-5-5'],
  /** lucide: download */
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10L12 15L17 10', 'M12 15L12 3'],
  /** lucide: upload */
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8L12 3L7 8', 'M12 3L12 15'],
  /** lucide: repeat */
  repeat: [
    'm17 2 4 4-4 4',
    'M3 11v-1a4 4 0 0 1 4-4h14',
    'm7 22-4-4 4-4',
    'M21 13v1a4 4 0 0 1-4 4H3',
  ],
  /** lucide: copy */
  copy: [
    'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z',
    'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  ],
  /** lucide: scissors */
  scissors: [
    'M3 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M8.12 8.12 12 12',
    'M20 4 8.12 15.88',
    'M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
    'M14.8 14.8 20 20',
  ],
  /** lucide: shield-check */
  shield: [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  /** lucide: wallet */
  wallet: [
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  ],
  /** lucide: target */
  target: [
    'M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0',
    'M6 12a6 6 0 1 0 12 0a6 6 0 1 0 -12 0',
    'M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
  ],
  /** lucide: settings */
  gear: [
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  ],
  /** lucide: info */
  info: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0', 'M12 16v-4', 'M12 8h.01'],
  /** lucide: lock */
  lock: [
    'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2z',
    'M7 11V7a5 5 0 0 1 10 0v4',
  ],
  /** lucide: tag */
  tag: [
    'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z',
    'M7 7.5a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0',
  ],
  /** lucide: qr-code */
  qr: [
    'M4 3h3a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1z',
    'M17 3h3a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1z',
    'M4 16h3a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1z',
    'M21 16h-3a2 2 0 0 0-2 2v3',
    'M21 21v.01',
    'M12 7v3a2 2 0 0 1-2 2H7',
    'M3 12h.01',
    'M12 3h.01',
    'M12 16v.01',
    'M16 12h1',
    'M21 12v.01',
    'M12 21v-1',
  ],
  /** lucide: scan-line */
  scan: [
    'M3 7V5a2 2 0 0 1 2-2h2',
    'M17 3h2a2 2 0 0 1 2 2v2',
    'M21 17v2a2 2 0 0 1-2 2h-2',
    'M7 21H5a2 2 0 0 1-2-2v-2',
    'M7 12h10',
  ],
  /** lucide: camera */
  camera: [
    'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    'M9 13a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  ],
  /** lucide: delete */
  backspace: [
    'M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z',
    'm12 9 6 6',
    'm18 9-6 6',
  ],
  /** lucide: fingerprint */
  fingerprint: [
    'M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4',
    'M14 13.12c0 2.38 0 6.38-1 8.88',
    'M17.29 21.02c.12-.6.43-2.3.5-3.02',
    'M2 12a10 10 0 0 1 18-6',
    'M2 16h.01',
    'M21.8 16c.2-2 .131-5.354 0-6',
    'M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2',
    'M8.65 22c.21-.66.45-1.32.57-2',
    'M9 6.8a6 6 0 0 1 9 5.2v2',
  ],
  /** lucide: scale */
  scale: [
    'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z',
    'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z',
    'M7 21h10',
    'M12 3v18',
    'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2',
  ],
  /** lucide: file-text */
  file: [
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
    'M14 2v4a2 2 0 0 0 2 2h4',
    'M10 9H8',
    'M16 13H8',
    'M16 17H8',
  ],
  /** lucide: smartphone */
  smartphone: [
    'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2z',
    'M12 18h.01',
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <View aria-hidden style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {PATHS[name].map(d => (
          <Path
            key={d}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}
