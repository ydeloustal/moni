import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, e => setWidth(Math.round(e.nativeEvent.layout.width))];
}
