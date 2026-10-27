import { Candle, ForexPairInfo } from "../types/trading";

export const FOREX_PAIRS: ForexPairInfo[] = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    pipSize: 0.0001,
    pipDecimals: 5,
    defaultPrice: 1.0854,
    spreadPips: 0.8,
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    pipSize: 0.0001,
    pipDecimals: 5,
    defaultPrice: 1.2985,
    spreadPips: 1.2,
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    pipSize: 0.01,
    pipDecimals: 3,
    defaultPrice: 154.25,
    spreadPips: 1.0,
  },
  {
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    pipSize: 0.0001,
    pipDecimals: 5,
    defaultPrice: 0.6580,
    spreadPips: 1.1,
  },
  {
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    pipSize: 0.1,
    pipDecimals: 2,
    defaultPrice: 2650.5,
    spreadPips: 2.5,
  },
  {
    symbol: "OMR/USD",
    name: "Omani Rial / US Dollar",
    pipSize: 0.0001,
    pipDecimals: 4,
    defaultPrice: 2.5975,
    spreadPips: 1.8,
  },
  {
    symbol: "USD/TZS",
    name: "US Dollar / Tanzanian Shilling",
    pipSize: 0.1,
    pipDecimals: 2,
    defaultPrice: 2615.5,
    spreadPips: 3.5,
  },
];

export type MarketRegime = "TREND_BULLISH" | "TREND_BEARISH" | "RANGING_CHANNEL" | "VOLATILE_BREAKOUT";

export interface MarketRegimeOption {
  id: MarketRegime;
  label: string;
  description: string;
}

export const MARKET_REGIMES: MarketRegimeOption[] = [
  {
    id: "TREND_BULLISH",
    label: "Bullish Trend & Pullbacks",
    description: "Multi-wave upward momentum with shallow pullbacks tested by EMA 21",
  },
  {
    id: "TREND_BEARISH",
    label: "Bearish Breakdown",
    description: "Sustained downward slope punctuated by brief corrective rallies",
  },
  {
    id: "RANGING_CHANNEL",
    label: "Ranging Channel (Mean-Reverting)",
    description: "Sideways consolidation oscillating between support and resistance",
  },
  {
    id: "VOLATILE_BREAKOUT",
    label: "High Volatility Breakout (News Event)",
    description: "Compression followed by explosive directional impulse and wide candles",
  },
];

/**
 * Generate synthetic realistic OHLC candlesticks based on selected currency pair and regime
 */
export function generateMarketCandles(
  pair: ForexPairInfo,
  regime: MarketRegime = "TREND_BULLISH",
  count = 180,
  seed = 42
): Candle[] {
  const candles: Candle[] = [];
  const basePrice = pair.defaultPrice;
  const pip = pair.pipSize;
  const decimals = pair.pipDecimals;

  // Pseudo-random generator with seed
  let s = seed;
  const pseudoRandom = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const now = new Date();
  const startTime = new Date(now.getTime() - count * 15 * 60 * 1000); // 15-minute bars

  let currentPrice = basePrice;
  let trendSlope = 0;

  for (let i = 0; i < count; i++) {
    const candleTime = new Date(startTime.getTime() + i * 15 * 60 * 1000);
    const timeStr = `${candleTime.getHours().toString().padStart(2, "0")}:${candleTime.getMinutes().toString().padStart(2, "0")}`;

    // Regime dynamics
    if (regime === "TREND_BULLISH") {
      // Periodic waves: upward trend with pullbacks
      const wave = Math.sin((i / 15) * Math.PI);
      trendSlope = (0.35 + wave * 0.45) * 2.2 * pip;
    } else if (regime === "TREND_BEARISH") {
      const wave = Math.sin((i / 14) * Math.PI);
      trendSlope = (-0.38 - wave * 0.42) * 2.2 * pip;
    } else if (regime === "RANGING_CHANNEL") {
      // Sine wave bounds
      const cycle = Math.sin((i / 10) * Math.PI);
      trendSlope = cycle * 2.5 * pip;
    } else if (regime === "VOLATILE_BREAKOUT") {
      if (i < 40) {
        trendSlope = (pseudoRandom() - 0.5) * 1.0 * pip; // tight range
      } else if (i >= 40 && i < 75) {
        trendSlope = 1.6 * (3.5 * pip); // explosive breakout
      } else {
        trendSlope = (pseudoRandom() - 0.52) * 2.8 * pip;
      }
    }

    // Noise component
    const noise = (pseudoRandom() - 0.49) * 3.5 * pip;
    const barDelta = trendSlope + noise;

    const open = currentPrice;
    let close = open + barDelta;

    // Generate realistic wicks
    const wickHigh = pseudoRandom() * 2.8 * pip;
    const wickLow = pseudoRandom() * 2.8 * pip;

    const high = Math.max(open, close) + wickHigh;
    const low = Math.min(open, close) - wickLow;

    // Volume estimation
    const bodyHeight = Math.abs(close - open);
    const volume = Math.round(150 + bodyHeight / pip * 40 + pseudoRandom() * 100);

    candles.push({
      time: timeStr,
      timestamp: candleTime.getTime(),
      open: Number(open.toFixed(decimals)),
      high: Number(high.toFixed(decimals)),
      low: Number(low.toFixed(decimals)),
      close: Number(close.toFixed(decimals)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Generate a single continuous real-time candle following the previous candle,
 * allowing the trading robot to work indefinitely without stopping.
 */
export function generateNextContinuousCandle(
  lastCandle: Candle,
  pair: ForexPairInfo,
  regime: MarketRegime = "TREND_BULLISH",
  stepIndex: number
): Candle {
  const pip = pair.pipSize;
  const decimals = pair.pipDecimals;
  const candleTime = new Date(lastCandle.timestamp + 15 * 60 * 1000);
  const timeStr = `${candleTime.getHours().toString().padStart(2, "0")}:${candleTime.getMinutes().toString().padStart(2, "0")}`;

  let trendSlope = 0;
  if (regime === "TREND_BULLISH") {
    const wave = Math.sin((stepIndex / 15) * Math.PI);
    trendSlope = (0.35 + wave * 0.45) * 2.2 * pip;
  } else if (regime === "TREND_BEARISH") {
    const wave = Math.sin((stepIndex / 14) * Math.PI);
    trendSlope = (-0.38 - wave * 0.42) * 2.2 * pip;
  } else if (regime === "RANGING_CHANNEL") {
    const cycle = Math.sin((stepIndex / 10) * Math.PI);
    trendSlope = cycle * 2.5 * pip;
  } else {
    trendSlope = (Math.random() - 0.5) * 3.5 * pip;
  }

  const noise = (Math.random() - 0.49) * 3.2 * pip;
  const barDelta = trendSlope + noise;
  const open = lastCandle.close;
  const close = open + barDelta;
  const wickHigh = Math.random() * 2.6 * pip;
  const wickLow = Math.random() * 2.6 * pip;

  const high = Math.max(open, close) + wickHigh;
  const low = Math.min(open, close) - wickLow;
  const volume = Math.round(150 + (Math.abs(close - open) / pip) * 40 + Math.random() * 100);

  return {
    time: timeStr,
    timestamp: candleTime.getTime(),
    open: Number(open.toFixed(decimals)),
    high: Number(high.toFixed(decimals)),
    low: Number(low.toFixed(decimals)),
    close: Number(close.toFixed(decimals)),
    volume,
  };
}
