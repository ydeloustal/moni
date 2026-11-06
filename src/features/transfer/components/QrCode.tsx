import qrcodeGenerator from 'qrcode-generator';
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * QR code drawn as one SVG path (fast to redraw at every frame). Always black on white,
 * with a quiet zone, whatever the theme: cameras read dark-on-light codes best.
 */
export const QrCode = memo(function QrCode({
  value,
  size,
  label,
}: {
  value: string;
  size: number;
  label: string;
}) {
  const { path, count } = useMemo(() => {
    // Level L: screen-to-camera links are clean, fewer modules = easier to scan.
    const qr = qrcodeGenerator(0, 'L');
    qr.addData(value, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(r, col)) d += `M${col + 4} ${r + 4}h1v1h-1z`;
      }
    }
    return { path: d, count: n + 8 };
  }, [value]);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size} viewBox={`0 0 ${count} ${count}`}>
        <Rect x={0} y={0} width={count} height={count} fill="#ffffff" />
        <Path d={path} fill="#000000" />
      </Svg>
    </View>
  );
});
