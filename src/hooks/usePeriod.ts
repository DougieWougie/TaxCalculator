import { useLocalStorage } from './useLocalStorage';
import type { DisplayPeriod } from '../display';

/**
 * The page-wide Annual/Monthly setting. Display state only — deliberately
 * persisted to localStorage rather than the URL, so the shared-link payload
 * keeps its existing schema.
 */
export function usePeriod() {
  const [period, setPeriod] = useLocalStorage<DisplayPeriod>('display-period', 'monthly');
  return { period, setPeriod };
}
