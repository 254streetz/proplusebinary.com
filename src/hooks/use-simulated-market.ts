import { useEffect, useState } from 'react';

export type MarketTick = { epoch: number; quote: number };
type FeedState = { symbol: string; ticks: MarketTick[]; decimals: number; status: 'connecting' | 'live' | 'offline'; error: string; updated: number | null };

const HISTORY_LENGTH = 1800;
const NOISE_SCALES = [8, 45, 240, 1200, 7200, 43200] as const;
const NOISE_WEIGHTS = [0.12, 0.18, 0.2, 0.2, 0.18, 0.12] as const;

function hashSymbol(symbol: string): number {
  let hash = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    hash = Math.imul(hash ^ symbol.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function bucketNoise(seed: number, bucket: number): number {
  let value = Math.imul(seed ^ (bucket | 0), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff * 2 - 1;
}

function smoothNoise(epoch: number, scale: number, seed: number): number {
  const position = epoch / scale;
  const bucket = Math.floor(position);
  const fraction = position - bucket;
  const eased = fraction * fraction * (3 - 2 * fraction);
  const left = bucketNoise(seed, bucket);
  const right = bucketNoise(seed, bucket + 1);
  return left + (right - left) * eased;
}

export function simulatedQuote(epoch: number, symbol: string, start: number, volatility: number, precision: number): number {
  const seed = hashSymbol(symbol);
  const noise = NOISE_SCALES.reduce(
    (total, scale, index) => total + smoothNoise(epoch, scale, seed + index) * NOISE_WEIGHTS[index]!,
    0,
  );
  return Number((start * (1 + volatility * 0.05 * noise)).toFixed(precision));
}

export function simulatedHistory(
  symbol: string,
  start: number,
  volatility: number,
  precision: number,
  endEpoch: number,
  count = HISTORY_LENGTH,
): MarketTick[] {
  return Array.from({ length: count }, (_, index) => {
    const epoch = endEpoch - count + index + 1;
    return { epoch, quote: simulatedQuote(epoch, symbol, start, volatility, precision) };
  });
}

// The time-based simulated feed keeps the same price history across visits.
export function useSimulatedMarket(symbol: string, precision: number, start: number, volatility: number) {
  const [state, setState] = useState<FeedState>({ symbol, ticks: [], decimals: precision, status: 'connecting', error: '', updated: null });
  useEffect(() => {
    const now = Math.floor(Date.now() / 1000);
    const history = simulatedHistory(symbol, start, volatility, precision, now);
    setState({ symbol, ticks: history, decimals: precision, status: 'live', error: '', updated: history.at(-1)?.epoch ?? null });
    const id = setInterval(() => {
      const epoch = Math.floor(Date.now() / 1000);
      const tick: MarketTick = { epoch, quote: simulatedQuote(epoch, symbol, start, volatility, precision) };
      setState(prev => ({ symbol, ticks: [...prev.ticks.filter(t => t.epoch < tick.epoch), tick].slice(-1800), decimals: precision, status: 'live', error: '', updated: tick.epoch }));
    }, 1000);
    return () => clearInterval(id);
  }, [symbol, precision, start, volatility]);
  const current = state.symbol === symbol ? state : { symbol, ticks: [], decimals: precision, status: 'connecting' as const, error: '', updated: null };
  return { ...current, reconnect: () => undefined };
}
