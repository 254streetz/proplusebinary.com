import { describe, expect, it } from 'vitest';
import { simulatedHistory, simulatedQuote } from '@/hooks/use-simulated-market';

describe('simulated market history', () => {
  it('builds a continuous, timestamped history before the current visit', () => {
    const now = 1_798_000_000;
    const ticks = simulatedHistory('R_100', 1300, 1, 2, now, 1800);

    expect(ticks).toHaveLength(1800);
    expect(ticks[0]?.epoch).toBe(now - 1799);
    expect(ticks.at(-1)?.epoch).toBe(now);
    expect(ticks.every((tick, index) => index === 0 || tick.epoch === ticks[index - 1]!.epoch + 1)).toBe(true);
    expect(ticks.every(tick => tick.quote > 0)).toBe(true);
  });

  it('returns the same market price for the same symbol and timestamp', () => {
    const first = simulatedQuote(1_798_000_000, 'R_100', 1300, 1, 2);

    expect(simulatedQuote(1_798_000_000, 'R_100', 1300, 1, 2)).toBe(first);
    expect(simulatedQuote(1_798_000_000, 'R_75', 1300, 1, 2)).not.toBe(first);
  });

  it('keeps overlapping history unchanged across visits', () => {
    const firstVisit = simulatedHistory('R_100', 1300, 1, 2, 1_798_000_000, 1800);
    const nextVisit = simulatedHistory('R_100', 1300, 1, 2, 1_798_000_001, 1800);

    expect(firstVisit.slice(1)).toEqual(nextVisit.slice(0, -1));
  });
});
