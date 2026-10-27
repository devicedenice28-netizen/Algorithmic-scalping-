"use strict";

export interface AutomaticEngineAnalysis {
  action: "BUY" | "SELL" | "WAIT" | "STOPPED";
  reason?: string;
  price?: number;
  fastEMA?: number | null;
  slowEMA?: number | null;
  RSI?: number | null;
  timestamp?: number | string | null;
}

export class AutomaticTradingEngine {
  public enabled: boolean;
  public simulation: boolean;
  public allowBuy: boolean;
  public allowSell: boolean;
  public lastSignal: string;
  public lastCandleTime: number | string | null;

  constructor(options?: { simulation?: boolean; allowBuy?: boolean; allowSell?: boolean }) {
    this.enabled = false;
    this.simulation = options?.simulation ?? false;
    this.allowBuy = options?.allowBuy ?? true;
    this.allowSell = options?.allowSell ?? true;
    this.lastSignal = "WAIT";
    this.lastCandleTime = null;
  }

  start(): void {
    this.enabled = true;
    console.log("Automatic analysis started.");
  }

  stop(): void {
    this.enabled = false;
    console.log("Automatic analysis stopped.");
  }

  calculateEMA(prices: number[], period: number): number | null {
    if (prices.length < period) return null;

    const multiplier = 2 / (period + 1);

    let ema =
      prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  calculateRSI(prices: number[], period = 14): number | null {
    if (prices.length <= period) return null;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];

      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    if (losses === 0) return 100;

    const rs = gains / period / (losses / period);

    return 100 - 100 / (1 + rs);
  }

  analyze(closes: number[], candleTime: number | string): AutomaticEngineAnalysis {
    if (!this.enabled) {
      return { action: "STOPPED" };
    }

    if (
      !Array.isArray(closes) ||
      closes.some((p) => !Number.isFinite(p) || p <= 0)
    ) {
      return { action: "WAIT", reason: "Invalid price data" };
    }

    if (closes.length < 30) {
      return { action: "WAIT", reason: "Insufficient data" };
    }

    // Process each completed candle only once.
    if (candleTime === this.lastCandleTime) {
      return { action: "WAIT", reason: "Candle already processed" };
    }

    const fast = this.calculateEMA(closes, 9);
    const slow = this.calculateEMA(closes, 21);
    const rsi = this.calculateRSI(closes, 14);

    this.lastCandleTime = candleTime;

    let action: "BUY" | "SELL" | "WAIT" = "WAIT";

    if (fast !== null && slow !== null && rsi !== null) {
      if (fast > slow && rsi >= 50 && rsi < 70 && this.allowBuy) {
        action = "BUY";
      } else if (fast < slow && rsi > 30 && rsi <= 50 && this.allowSell) {
        action = "SELL";
      }
    }

    this.lastSignal = action;

    return {
      action,
      price: closes[closes.length - 1],
      fastEMA: fast,
      slowEMA: slow,
      RSI: rsi,
      timestamp: candleTime,
    };
  }
}

export default AutomaticTradingEngine;
