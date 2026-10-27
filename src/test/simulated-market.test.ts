import { describe, expect, it } from 'vitest';
import {
  SIMULATED_HISTORY_DAYS,
  SIMULATED_HISTORY_INTERVAL_SECONDS,
  simulatedHistory,
  simulatedQuote,
} from '@/hooks/use-simulated-market';

describe('simulated market history', () => {
  it('builds a continuous, timestamped history before the current visit', () => {
    const now = 1_798_000_000;
    const ticks = simulatedHistory('R_100', 1300, 1, 2, now);

    expect(ticks).toHaveLength(
      (SIMULATED_HISTORY_DAYS * 24 * 60 * 60) / SIMULATED_HISTORY_INTERVAL_SECONDS + 1,
    );
    expect(ticks[0]?.epoch).toBe(ticks.at(-1)!.epoch - SIMULATED_HISTORY_DAYS * 24 * 60 * 60);
    expect(ticks.at(-1)?.epoch).toBe(Math.floor(now / SIMULATED_HISTORY_INTERVAL_SECONDS) * SIMULATED_HISTORY_INTERVAL_SECONDS);
    expect(ticks.every((tick, index) => index === 0 || tick.epoch === ticks[index - 1]!.epoch + SIMULATED_HISTORY_INTERVAL_SECONDS)).toBe(true);
    expect(ticks.every(tick => tick.quote > 0)).toBe(true);
  });

  it('returns the same market price for the same symbol and timestamp', () => {
    const first = simulatedQuote(1_798_000_000, 'R_100', 1300, 1, 2);

    expect(simulatedQuote(1_798_000_000, 'R_100', 1300, 1, 2)).toBe(first);
    expect(simulatedQuote(1_798_000_000, 'R_75', 1300, 1, 2)).not.toBe(first);
  });

  it('keeps overlapping history unchanged across visits', () => {
    const firstVisit = simulatedHistory('R_100', 1300, 1, 2, 1_798_000_000);
    const nextVisit = simulatedHistory('R_100', 1300, 1, 2, 1_798_000_010);

    expect(firstVisit.slice(1)).toEqual(nextVisit.slice(0, -1));
  });
});
