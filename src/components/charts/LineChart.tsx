import { View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/theme';
import { axisLabel, niceStep } from './scale';
import { useWidth } from './useWidth';

export interface LineSeries {
  color: string;
  values: number[];
  area?: boolean;
  dashed?: boolean;
}

/** Lines (euros). `every`: shows one x label out of n. */
export function LineChart({
  labels,
  series,
  height = 190,
  every = 1,
  description,
}: {
  labels: string[];
  series: LineSeries[];
  height?: number;
  every?: number;
  description: string;
}) {
  const c = useColors();
  const [width, onLayout] = useWidth();
  const left = 48;
  const right = 12;
  const top = 12;
  const bottom = 24;
  const innerW = Math.max(1, width - left - right);
  const innerH = height - top - bottom;
  const n = labels.length;
  const all = series.flatMap(s => s.values);
  const lo = Math.min(0, ...all);
  const hi0 = Math.max(0, ...all);
  const hi = hi0 === lo ? lo + 1 : hi0;
  const step = niceStep(hi - lo);
  let ceiling = Math.ceil(hi / step) * step;
  const floor = lo < 0 ? Math.floor(lo / step) * step : 0;
  if (ceiling === floor) ceiling = floor + step;
  const x = (i: number) => left + (n < 2 ? 0 : (i * innerW) / (n - 1));
  const y = (v: number) => top + innerH - ((v - floor) / (ceiling - floor)) * innerH;
  const grid: number[] = [];
  for (let v = floor; v <= ceiling + 1e-9; v += step) grid.push(v);

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
      style={{ height }}
    >
      {width > 0 && n > 0 ? (
        <Svg width={width} height={height}>
          {grid.map(v => (
            <Line
              key={`g${v}`}
              x1={left}
              x2={width - right}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? c.lineStrong : c.line}
              strokeWidth={1}
            />
          ))}
          {grid.map(v => (
            <SvgText
              key={`t${v}`}
              x={left - 6}
              y={y(v) + 4}
              fontSize={11}
              fill={c.muted}
              textAnchor="end"
            >
              {axisLabel(v)}
            </SvgText>
          ))}
          {labels.map((label, i) =>
            i % every === 0 ? (
              <SvgText
                key={`l${i}`}
                x={x(i)}
                y={height - 6}
                fontSize={11}
                fill={c.muted}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            ) : null,
          )}
          {series.map((s, k) => {
            const points = s.values
              .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
              .join(' ');
            const last = s.values[n - 1] ?? 0;
            return (
              <G key={k}>
                {s.area ? (
                  <Polygon
                    points={`${x(0)},${y(0)} ${points} ${x(n - 1)},${y(0)}`}
                    fill={s.color}
                    opacity={0.12}
                  />
                ) : null}
                <Polyline
                  points={points}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={s.dashed ? '5 4' : undefined}
                />
                <Circle
                  cx={x(n - 1)}
                  cy={y(last)}
                  r={4}
                  fill={s.color}
                  stroke={c.surface}
                  strokeWidth={2}
                />
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
