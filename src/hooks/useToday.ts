import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayOf, type Day } from '@/utils/dates';

/** Today's date, refreshed when the app comes back to the foreground (it may stay open for days). */
export function useToday(): Day {
  const [today, setToday] = useState(todayOf);
  useEffect(() => {
    const refresh = () => setToday(todayOf());
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return today;
}
