import { config } from './config.js';
import type { Candle } from './types.js';

/** Thin client for Binance USDⓈ-M futures public market data (no auth). */

async function get<T>(pathname: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(pathname, config.binanceBase);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Binance ${pathname} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

export async function fetchKlines(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
  const raw = await get<RawKline[]>('/fapi/v1/klines', { symbol, interval, limit });
  return raw.map((k) => ({
    openTime: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: k[6],
  }));
}

/** Latest mark prices for all symbols in one request (weight-cheap for the tick loop). */
export async function fetchPrices(): Promise<Record<string, number>> {
  const raw = await get<{ symbol: string; price: string }[]>('/fapi/v1/ticker/price');
  const out: Record<string, number> = {};
  for (const t of raw) out[t.symbol] = Number(t.price);
  return out;
}

/** Current funding rate for a perp symbol (positive = longs pay shorts = crowded longs). */
export async function fetchFundingRate(symbol: string): Promise<number> {
  const raw = await get<{ lastFundingRate: string }>('/fapi/v1/premiumIndex', { symbol });
  return Number(raw.lastFundingRate);
}
