import { View } from 'react-native';
import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/theme';
import { axisLabel, niceStep, roundedTop } from './scale';
import { useWidth } from './useWidth';

export interface BarSeries {
  color: string;
  values: number[];
}

/**
 * Grouped bars (euros). The chart is one image for screen readers: `description` must summarise it,
 * and the same figures are always available as text next to the chart.
 */
export function BarChart({
  labels,
  series,
  height = 200,
  selected,
  onSelect,
  description,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  selected?: number;
  onSelect?: (index: number) => void;
  description: string;
}) {
  const c = useColors();
  const [width, onLayout] = useWidth();
  const left = 44;
  const right = 4;
  const top = 10;
  const bottom = 24;
  const innerW = Math.max(1, width - left - right);
  const innerH = height - top - bottom;
  const max = Math.max(1, ...series.flatMap(s => s.values));
  const step = niceStep(max);
  const ceiling = Math.ceil(max / step) * step || step;
  const y = (v: number) => top + innerH - (Math.max(0, v) / ceiling) * innerH;
  const groupW = innerW / Math.max(1, labels.length);
  const barW = Math.min(22, (groupW * 0.7) / Math.max(1, series.length));
  const grid: number[] = [];
  for (let v = 0; v <= ceiling; v += step) grid.push(v);

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={description}
      style={{ height }}
    >
      {width > 0 ? (
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
          {labels.map((label, i) => {
            const center = left + i * groupW + groupW / 2;
            const total = barW * series.length + 2 * (series.length - 1);
            return (
              <G key={label + i}>
                {selected === i ? (
                  <Rect
                    x={center - groupW / 2 + 1}
                    y={top - 4}
                    width={groupW - 2}
                    height={innerH + 4}
                    rx={6}
                    fill={c.chip}
                  />
                ) : null}
                {series.map((s, k) => {
                  const v = s.values[i] ?? 0;
                  return (
                    <Path
                      key={k}
                      d={roundedTop(
                        center - total / 2 + k * (barW + 2),
                        y(v),
                        barW,
                        top + innerH - y(v),
                        4,
                      )}
                      fill={s.color}
                    />
                  );
                })}
                <SvgText
                  x={center}
                  y={height - 6}
                  fontSize={11}
                  fill={selected === i ? c.ink : c.muted}
                  fontWeight={selected === i ? '700' : '400'}
                  textAnchor="middle"
                >
                  {label}
                </SvgText>
                {onSelect ? (
                  <Rect
                    x={center - groupW / 2}
                    y={0}
                    width={groupW}
                    height={height}
                    fill="transparent"
                    onPress={() => onSelect(i)}
                  />
                ) : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
