import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { monthOf, type Month } from '@/utils/dates';
import { useToday } from './useToday';

interface SelectedMonth {
  month: Month;
  setMonth: (month: Month) => void;
}

const SelectedMonthContext = createContext<SelectedMonth | null>(null);

/** Month chosen in the top bar, shared by the tabs. Starts on the current month. */
export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const today = useToday();
  const [chosen, setMonth] = useState<Month | null>(null);
  const month = chosen ?? monthOf(today);
  const value = useMemo(() => ({ month, setMonth }), [month]);
  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>;
}

/** Outside the tabs (tests, modals), falls back to the current month. */
export function useSelectedMonth(): SelectedMonth {
  const today = useToday();
  const ctx = useContext(SelectedMonthContext);
  return ctx ?? { month: monthOf(today), setMonth: () => undefined };
}
