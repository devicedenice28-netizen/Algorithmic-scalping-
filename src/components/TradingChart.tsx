import React, { useRef, useEffect, useState, useMemo } from "react";
import { Candle, Position, Trade, MarketSentimentData, HighImpactNewsData, HighImpactEconomicEvent } from "../types/trading";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Globe,
  ExternalLink,
  Target,
  Zap,
  Activity,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Calendar,
  Radio,
  Flame,
  Clock,
} from "lucide-react";
import { fetchHighImpactNews } from "../lib/newsService";

export type SessionType = "SYDNEY" | "ASIA" | "LONDON" | "OVERLAP" | "NEWYORK" | "OFF_PEAK";

export interface SessionInfo {
  type: SessionType;
  name: string;
  shortLabel: string;
  bgFill: string;
  borderStroke: string;
  badgeColor: string;
  isHighVolatility: boolean;
  volatilityTier: string;
}

export function getCandleSession(candle: Candle): SessionInfo {
  const date = new Date(candle.timestamp);
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;

  // 1. London & New York Overlap: 12:00 to 16:00 UTC (Peak global forex liquidity & highest volatility)
  if (h >= 12 && h < 16) {
    return {
      type: "OVERLAP",
      name: "London / NY Overlap",
      shortLabel: "LDN/NY OVERLAP ⚡",
      bgFill: "rgba(245, 158, 11, 0.12)",
      borderStroke: "rgba(245, 158, 11, 0.45)",
      badgeColor: "#f59e0b",
      isHighVolatility: true,
      volatilityTier: "PEAK MAXIMUM VOLATILITY",
    };
  }

  // 2. London Session (Europe): 07:00 to 16:00 UTC (solo 07:00 to 12:00)
  if (h >= 7 && h < 16) {
    return {
      type: "LONDON",
      name: "London Session",
      shortLabel: "LONDON 🇬🇧",
      bgFill: "rgba(59, 130, 246, 0.08)",
      borderStroke: "rgba(59, 130, 246, 0.35)",
      badgeColor: "#3b82f6",
      isHighVolatility: true,
      volatilityTier: "HIGH VOLATILITY",
    };
  }

  // 3. New York Session (Americas): 12:00 to 21:00 UTC (solo 16:00 to 21:00)
  if (h >= 16 && h < 21) {
    return {
      type: "NEWYORK",
      name: "New York Session",
      shortLabel: "NEW YORK 🇺🇸",
      bgFill: "rgba(168, 85, 247, 0.08)",
      borderStroke: "rgba(168, 85, 247, 0.35)",
      badgeColor: "#a855f7",
      isHighVolatility: false,
      volatilityTier: "HIGH / MODERATE VOLATILITY",
    };
  }

  // 4. Asian / Tokyo Session: 00:00 to 09:00 UTC (solo 00:00 to 07:00)
  if (h >= 0 && h < 7) {
    return {
      type: "ASIA",
      name: "Asian / Tokyo Session",
      shortLabel: "ASIA / TOKYO 🇯🇵",
      bgFill: "rgba(6, 182, 212, 0.07)",
      borderStroke: "rgba(6, 182, 212, 0.35)",
      badgeColor: "#06b6d4",
      isHighVolatility: false,
      volatilityTier: "MODERATE RANGE",
    };
  }

  // 5. Sydney Session: 21:00 to 06:00 UTC (solo 21:00 to 24:00)
  if (h >= 21 || h < 6) {
    return {
      type: "SYDNEY",
      name: "Sydney Session",
      shortLabel: "SYDNEY 🇦🇺",
      bgFill: "rgba(129, 140, 248, 0.07)",
      borderStroke: "rgba(129, 140, 248, 0.35)",
      badgeColor: "#818cf8",
      isHighVolatility: false,
      volatilityTier: "PACIFIC SESSION",
    };
  }

  return {
    type: "OFF_PEAK",
    name: "Off-Peak Transition",
    shortLabel: "OFF-PEAK",
    bgFill: "rgba(30, 41, 59, 0.04)",
    borderStroke: "rgba(71, 85, 105, 0.2)",
    badgeColor: "#94a3b8",
    isHighVolatility: false,
    volatilityTier: "LOW VOLATILITY",
  };
}

export interface DivergenceMarker {
  index: number;
  type: "BULLISH" | "BEARISH";
  price: number;
  rsi: number;
  prevIndex: number;
  prevPrice: number;
  prevRsi: number;
  time: string;
}

export interface MajorMoveMarker {
  index: number;
  time: string;
  direction: "BULLISH" | "BEARISH";
  pipDelta: number;
  price: number;
  high: number;
  low: number;
  atrMultiple: number;
}


interface TradingChartProps {
  candles: Candle[];
  visibleCount?: number;
  fastEMAPeriod: number;
  slowEMAPeriod: number;
  rsiPeriod: number;
  rsiFilterEnabled?: boolean;
  position: Position | null;
  trades: Trade[];
  pipDecimals?: number;
  symbol: string;
  sentimentData?: MarketSentimentData | null;
  onOpenSentimentModal?: () => void;
  isLoadingSentiment?: boolean;
  onRefreshSentiment?: () => void;
  autotradingActive?: boolean;
  onToggleAutotrading?: () => void;
  closeByProfitActive?: boolean;
  onToggleCloseByProfit?: () => void;
}

export const TradingChart: React.FC<TradingChartProps> = ({
  candles,
  fastEMAPeriod,
  slowEMAPeriod,
  rsiPeriod,
  rsiFilterEnabled = true,
  position,
  trades,
  pipDecimals = 5,
  symbol,
  sentimentData = null,
  onOpenSentimentModal,
  isLoadingSentiment = false,
  onRefreshSentiment,
  autotradingActive = true,
  onToggleAutotrading,
  closeByProfitActive = true,
  onToggleCloseByProfit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport navigation & view mode state
  const [zoomLevel, setZoomLevel] = useState<number>(65); // number of visible candles
  const [offsetRight, setOffsetRight] = useState<number>(0); // pan offset from latest candle
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [subWindowMode, setSubWindowMode] = useState<"DUAL" | "SENTIMENT" | "RSI">("DUAL");

  // High Impact News & Major Movement Detection State
  const [showNewsOverlay, setShowNewsOverlay] = useState<boolean>(true);
  const [isOverlayMinimized, setIsOverlayMinimized] = useState<boolean>(false);
  const [highImpactNews, setHighImpactNews] = useState<HighImpactNewsData | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(false);
  const [selectedMove, setSelectedMove] = useState<MajorMoveMarker | null>(null);

  // Trading Sessions Shaded Background Highlighting (Sydney, Asia, London, New York & Overlap)
  const [showSessions, setShowSessions] = useState<boolean>(true);


  // Pre-calculate EMAs and RSI across all candles
  const indicatorData = useMemo(() => {
    const closes = candles.map((c) => c.close);
    const n = closes.length;

    // Fast EMA
    const fastEMA: (number | null)[] = new Array(n).fill(null);
    if (n >= fastEMAPeriod) {
      const mult = 2 / (fastEMAPeriod + 1);
      let ema = closes.slice(0, fastEMAPeriod).reduce((a, b) => a + b, 0) / fastEMAPeriod;
      fastEMA[fastEMAPeriod - 1] = ema;
      for (let i = fastEMAPeriod; i < n; i++) {
        ema = (closes[i] - ema) * mult + ema;
        fastEMA[i] = ema;
      }
    }

    // Slow EMA
    const slowEMA: (number | null)[] = new Array(n).fill(null);
    if (n >= slowEMAPeriod) {
      const mult = 2 / (slowEMAPeriod + 1);
      let ema = closes.slice(0, slowEMAPeriod).reduce((a, b) => a + b, 0) / slowEMAPeriod;
      slowEMA[slowEMAPeriod - 1] = ema;
      for (let i = slowEMAPeriod; i < n; i++) {
        ema = (closes[i] - ema) * mult + ema;
        slowEMA[i] = ema;
      }
    }

    // RSI
    const rsi: (number | null)[] = new Array(n).fill(null);
    if (n > rsiPeriod) {
      for (let i = rsiPeriod; i < n; i++) {
        let gains = 0;
        let losses = 0;
        for (let j = i - rsiPeriod + 1; j <= i; j++) {
          const delta = closes[j] - closes[j - 1];
          if (delta > 0) gains += delta;
          else losses += Math.abs(delta);
        }
        const avgGain = gains / rsiPeriod;
        const avgLoss = losses / rsiPeriod;
        if (avgLoss === 0) {
          rsi[i] = 100;
        } else {
          const rs = avgGain / avgLoss;
          rsi[i] = 100 - 100 / (1 + rs);
        }
      }
    }

    // Market Sentiment Oscillator Series (-100 to +100)
    const sentimentSeries: number[] = new Array(n).fill(0);
    const targetScore = sentimentData?.score ?? 48;
    const rawSeries = sentimentData?.oscillatorSeries;

    for (let i = 0; i < n; i++) {
      if (rawSeries && rawSeries[i] !== undefined) {
        sentimentSeries[i] = rawSeries[i];
      } else {
        const progress = i / Math.max(1, n - 1);
        const wave = Math.sin(i * 0.085) * 32 + Math.cos(i * 0.038) * 18;
        const blended = wave * (1 - progress * 0.65) + targetScore * progress;
        sentimentSeries[i] = Math.max(-100, Math.min(100, Math.round(blended)));
      }
    }
    if (n > 0) {
      sentimentSeries[n - 1] = targetScore;
    }

    // Pre-calculate RSI Divergence markers alongside EMA crossovers
    const divergences: DivergenceMarker[] = [];
    const minLookback = 4;
    const maxLookback = 22;

    for (let i = Math.max(slowEMAPeriod, rsiPeriod + 2); i < n; i++) {
      const f1 = fastEMA[i - 1];
      const s1 = slowEMA[i - 1];
      const f0 = fastEMA[i];
      const s0 = slowEMA[i];
      const currRsi = rsi[i];

      if (f1 === null || s1 === null || f0 === null || s0 === null || currRsi === null) {
        continue;
      }

      // Check if Bullish crossover occurred within [i - 1, i + 1]
      const isBullCrossover =
        (f1 <= s1 && f0 > s0) ||
        (i >= 2 && fastEMA[i - 2] !== null && slowEMA[i - 2] !== null && fastEMA[i - 2]! <= slowEMA[i - 2]! && f1 > s1);

      // Check if Bearish crossover occurred within [i - 1, i + 1]
      const isBearCrossover =
        (f1 >= s1 && f0 < s0) ||
        (i >= 2 && fastEMA[i - 2] !== null && slowEMA[i - 2] !== null && fastEMA[i - 2]! >= slowEMA[i - 2]! && f1 < s1);

      if (isBullCrossover) {
        let lowestPrice = Infinity;
        let lowestIdx = -1;
        const startScan = Math.max(0, i - maxLookback);
        const endScan = Math.max(0, i - minLookback);

        for (let k = startScan; k <= endScan; k++) {
          if (candles[k].low < lowestPrice) {
            lowestPrice = candles[k].low;
            lowestIdx = k;
          }
        }

        if (lowestIdx !== -1) {
          const prevRsi = rsi[lowestIdx];
          const currLow = candles[i].low;
          // Bullish Divergence: Price makes lower/equal low, but RSI makes higher low
          if (
            prevRsi !== null &&
            currLow <= lowestPrice * 1.0035 &&
            currRsi > prevRsi + 1.8
          ) {
            // Avoid duplicate marker if immediately adjacent
            const lastDiv = divergences[divergences.length - 1];
            if (!lastDiv || lastDiv.index !== i - 1) {
              divergences.push({
                index: i,
                type: "BULLISH",
                price: currLow,
                rsi: currRsi,
                prevIndex: lowestIdx,
                prevPrice: lowestPrice,
                prevRsi,
                time: candles[i].time,
              });
            }
          }
        }
      } else if (isBearCrossover) {
        let highestPrice = -Infinity;
        let highestIdx = -1;
        const startScan = Math.max(0, i - maxLookback);
        const endScan = Math.max(0, i - minLookback);

        for (let k = startScan; k <= endScan; k++) {
          if (candles[k].high > highestPrice) {
            highestPrice = candles[k].high;
            highestIdx = k;
          }
        }

        if (highestIdx !== -1) {
          const prevRsi = rsi[highestIdx];
          const currHigh = candles[i].high;
          // Bearish Divergence: Price makes higher/equal high, but RSI makes lower high
          if (
            prevRsi !== null &&
            currHigh >= highestPrice * 0.9965 &&
            currRsi < prevRsi - 1.8
          ) {
            const lastDiv = divergences[divergences.length - 1];
            if (!lastDiv || lastDiv.index !== i - 1) {
              divergences.push({
                index: i,
                type: "BEARISH",
                price: currHigh,
                rsi: currRsi,
                prevIndex: highestIdx,
                prevPrice: highestPrice,
                prevRsi,
                time: candles[i].time,
              });
            }
          }
        }
      }
    }

    // Calculate 14-period ATR and detect Major Price Movements
    const atr: number[] = new Array(n).fill(0);
    let trSum = 0;
    for (let i = 0; i < n; i++) {
      const prevClose = i > 0 ? closes[i - 1] : candles[i].open;
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - prevClose),
        Math.abs(candles[i].low - prevClose)
      );
      if (i < 14) {
        trSum += tr;
        atr[i] = trSum / (i + 1);
      } else {
        atr[i] = (atr[i - 1] * 13 + tr) / 14;
      }
    }

    const isJpy = symbol.includes("JPY");
    const isGold = symbol.includes("XAU");
    const pipScale = isGold ? 0.1 : isJpy ? 0.01 : 0.0001;
    const majorMovements: MajorMoveMarker[] = [];

    for (let i = 1; i < n; i++) {
      const c = candles[i];
      const range = c.high - c.low;
      const body = Math.abs(c.close - c.open);
      const pipDelta = Number((body / pipScale).toFixed(1));
      const currAtr = atr[i] || 0.001;
      const atrMultiple = Number((range / currAtr).toFixed(1));

      // Threshold for major price movement (volatility expansion or large pip surge)
      const minPipsThreshold = isGold ? 140 : isJpy ? 26 : 14;
      if ((range >= currAtr * 1.85 && body >= currAtr * 1.15) || pipDelta >= minPipsThreshold) {
        majorMovements.push({
          index: i,
          time: c.time,
          direction: c.close >= c.open ? "BULLISH" : "BEARISH",
          pipDelta,
          price: c.close,
          high: c.high,
          low: c.low,
          atrMultiple,
        });
      }
    }

    return { fastEMA, slowEMA, rsi, sentimentSeries, divergences, majorMovements };
  }, [candles, fastEMAPeriod, slowEMAPeriod, rsiPeriod, sentimentData, symbol]);

  // Identify latest detected major price movement
  const latestMajorMove = useMemo(() => {
    if (!indicatorData.majorMovements || indicatorData.majorMovements.length === 0) return null;
    return indicatorData.majorMovements[indicatorData.majorMovements.length - 1];
  }, [indicatorData.majorMovements]);

  const activeMove = selectedMove || latestMajorMove;

  // Automatically pull significant economic events via search grounding when a major price move is detected
  useEffect(() => {
    if (!activeMove) return;

    let isMounted = true;
    setIsLoadingNews(true);

    fetchHighImpactNews(symbol, activeMove.pipDelta, activeMove.direction)
      .then((data) => {
        if (isMounted) {
          setHighImpactNews(data);
          setIsLoadingNews(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("[TradingChart] Failed to load news overlay data:", err);
          setIsLoadingNews(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [symbol, activeMove?.index, activeMove?.direction, activeMove?.pipDelta]);


  // Determine candle window
  const totalCandles = candles.length;
  const effectiveZoom = Math.min(Math.max(zoomLevel, 20), Math.min(totalCandles, 160));
  const endIndex = Math.max(0, Math.min(totalCandles - offsetRight, totalCandles));
  const startIndex = Math.max(0, endIndex - effectiveZoom);
  const visibleCandles = candles.slice(startIndex, endIndex);

  // Render on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI display
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Split dimensions: 74% price chart, 26% RSI sub-window
    const rightMargin = 72; // price scale width
    const bottomMargin = 22; // time scale height
    const rsiHeight = Math.max(height * 0.24, 75);
    const dividerY = height - rsiHeight - bottomMargin;
    const priceChartHeight = dividerY;
    const chartWidth = width - rightMargin;

    // Clear background
    ctx.fillStyle = "#0a0d13";
    ctx.fillRect(0, 0, width, height);

    if (visibleCandles.length === 0) return;

    // Calculate Price Range
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (let i = startIndex; i < endIndex; i++) {
      const c = candles[i];
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;

      const fEma = indicatorData.fastEMA[i];
      if (fEma !== null) {
        if (fEma < minPrice) minPrice = fEma;
        if (fEma > maxPrice) maxPrice = fEma;
      }

      const sEma = indicatorData.slowEMA[i];
      if (sEma !== null) {
        if (sEma < minPrice) minPrice = sEma;
        if (sEma > maxPrice) maxPrice = sEma;
      }
    }

    if (position) {
      if (position.stopLossPrice < minPrice) minPrice = position.stopLossPrice;
      if (position.stopLossPrice > maxPrice) maxPrice = position.stopLossPrice;
      if (position.takeProfitPrice) {
        if (position.takeProfitPrice < minPrice) minPrice = position.takeProfitPrice;
        if (position.takeProfitPrice > maxPrice) maxPrice = position.takeProfitPrice;
      }
    }

    // Add padding to price range
    const priceRangePadding = (maxPrice - minPrice) * 0.08 || 0.001;
    minPrice -= priceRangePadding;
    maxPrice += priceRangePadding;
    const priceSpread = maxPrice - minPrice;

    const getY = (val: number) => {
      return priceChartHeight - ((val - minPrice) / priceSpread) * priceChartHeight;
    };

    const getRsiY = (rsiVal: number) => {
      // 0 at dividerY + rsiHeight, 100 at dividerY + 5
      const innerHeight = rsiHeight - 12;
      return dividerY + 6 + (1 - rsiVal / 100) * innerHeight;
    };

    const getSentimentY = (scoreVal: number) => {
      // -100 at bottom, +100 at top, 0 at exact vertical center
      const innerHeight = rsiHeight - 12;
      const norm = (scoreVal + 100) / 200; // 0 to 1
      return dividerY + 6 + (1 - norm) * innerHeight;
    };

    const candleSlotWidth = chartWidth / visibleCandles.length;
    const candleWidth = Math.max(candleSlotWidth * 0.7, 2);

    // 0. Draw Trading Sessions Shaded Background Regions & High-Volatility Windows
    if (showSessions && visibleCandles.length > 0) {
      interface SessionSpan {
        session: SessionInfo;
        startIdx: number;
        count: number;
      }
      const spans: SessionSpan[] = [];
      visibleCandles.forEach((c, idx) => {
        const s = getCandleSession(c);
        if (spans.length === 0 || spans[spans.length - 1].session.type !== s.type) {
          spans.push({ session: s, startIdx: idx, count: 1 });
        } else {
          spans[spans.length - 1].count++;
        }
      });

      spans.forEach((span) => {
        const startX = span.startIdx * candleSlotWidth;
        const spanWidth = span.count * candleSlotWidth;

        // A. Shaded Background Region
        ctx.fillStyle = span.session.bgFill;
        ctx.fillRect(startX, 0, spanWidth, priceChartHeight);

        // B. High Volatility Window Highlight (London / NY Overlap or London)
        if (span.session.isHighVolatility) {
          // Top luminous accent line
          ctx.fillStyle = span.session.badgeColor;
          ctx.fillRect(startX, 0, spanWidth, 2.5);

          // Top ambient gradient glow
          const glowGrad = ctx.createLinearGradient(0, 0, 0, 55);
          glowGrad.addColorStop(0, span.session.borderStroke);
          glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = glowGrad;
          ctx.fillRect(startX, 0, spanWidth, 55);
        }

        // C. Vertical session boundary line
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = span.session.borderStroke;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, priceChartHeight);
        ctx.stroke();
        ctx.restore();

        // D. Session Header Pill Badge
        if (spanWidth >= 38) {
          ctx.font = "bold 9px JetBrains Mono, monospace";
          const labelText = spanWidth >= 95 ? span.session.shortLabel : span.session.name.split(" ")[0].toUpperCase();
          const textW = ctx.measureText(labelText).width;
          const badgeW = textW + 12;
          const badgeX = Math.max(startX + 4, Math.min(startX + spanWidth / 2 - badgeW / 2, startX + spanWidth - badgeW - 4));

          ctx.fillStyle = "rgba(10, 13, 19, 0.88)";
          ctx.fillRect(badgeX, 4, badgeW, 16);
          ctx.strokeStyle = span.session.borderStroke;
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, 4, badgeW, 16);

          ctx.fillStyle = span.session.badgeColor;
          ctx.fillText(labelText, badgeX + 6, 15);
        }
      });
    }

    // 1. Draw Grid Lines (Price Chart)
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#161c26";
    ctx.fillStyle = "#64748b";
    ctx.font = "10px JetBrains Mono, monospace";

    // Horizontal Price Grid
    const priceSteps = 6;
    for (let i = 0; i <= priceSteps; i++) {
      const p = minPrice + (priceSpread * i) / priceSteps;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Right axis price text
      ctx.fillText(p.toFixed(pipDecimals), chartWidth + 6, y + 3);
    }

    // 1.5 Draw RSI Divergence Vertical Highlights (Beams)
    indicatorData.divergences.forEach((dm) => {
      if (dm.index >= startIndex && dm.index < endIndex) {
        const x = (dm.index - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const isBull = dm.type === "BULLISH";
        const beamGrad = ctx.createLinearGradient(0, 0, 0, priceChartHeight);
        if (isBull) {
          beamGrad.addColorStop(0, "rgba(16, 185, 129, 0.01)");
          beamGrad.addColorStop(0.5, "rgba(16, 185, 129, 0.12)");
          beamGrad.addColorStop(1, "rgba(16, 185, 129, 0.28)");
        } else {
          beamGrad.addColorStop(0, "rgba(239, 68, 68, 0.28)");
          beamGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.12)");
          beamGrad.addColorStop(1, "rgba(239, 68, 68, 0.01)");
        }
        ctx.fillStyle = beamGrad;
        ctx.fillRect(x - candleSlotWidth / 2, 0, candleSlotWidth, priceChartHeight);
      }
    });

    // 1.6 Draw Major Price Movement Volatility Beams & Aura
    indicatorData.majorMovements.forEach((mm) => {
      if (mm.index >= startIndex && mm.index < endIndex) {
        const x = (mm.index - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const isBull = mm.direction === "BULLISH";
        const auraGrad = ctx.createLinearGradient(0, 0, 0, priceChartHeight);
        if (isBull) {
          auraGrad.addColorStop(0, "rgba(245, 158, 11, 0.01)");
          auraGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.12)");
          auraGrad.addColorStop(1, "rgba(245, 158, 11, 0.25)");
        } else {
          auraGrad.addColorStop(0, "rgba(239, 68, 68, 0.25)");
          auraGrad.addColorStop(0.5, "rgba(239, 68, 68, 0.12)");
          auraGrad.addColorStop(1, "rgba(239, 68, 68, 0.01)");
        }
        ctx.fillStyle = auraGrad;
        ctx.fillRect(x - candleSlotWidth / 2, 0, candleSlotWidth, priceChartHeight);
      }
    });


    // 2. Draw Candlesticks
    visibleCandles.forEach((c, idx) => {
      const globalIdx = startIndex + idx;
      const x = idx * candleSlotWidth + candleSlotWidth / 2;
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isBullish = c.close >= c.open;
      const color = isBullish ? "#10b981" : "#ef4444";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Trade markers on specific candles
      // Check if position was opened on this candle
      if (position && position.entryCandleIndex === globalIdx) {
        ctx.fillStyle = position.type === "BUY" ? "#10b981" : "#ef4444";
        ctx.beginPath();
        if (position.type === "BUY") {
          ctx.moveTo(x, lowY + 14);
          ctx.lineTo(x - 5, lowY + 22);
          ctx.lineTo(x + 5, lowY + 22);
        } else {
          ctx.moveTo(x, highY - 14);
          ctx.lineTo(x - 5, highY - 22);
          ctx.lineTo(x + 5, highY - 22);
        }
        ctx.fill();
      }

      // Check for closed trades with markers
      trades.forEach((trade) => {
        // Find if this is close time
        if (c.time === trade.exitTime) {
          const exitY = getY(trade.exit);
          ctx.beginPath();
          ctx.arc(x, exitY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = trade.profit >= 0 ? "#10b981" : "#ef4444";
          ctx.fill();
        }
      });
    });

    // 3. Fast EMA (Cyan)
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#38bdf8";
    ctx.beginPath();
    let startedFast = false;
    for (let i = startIndex; i < endIndex; i++) {
      const val = indicatorData.fastEMA[i];
      if (val !== null) {
        const x = (i - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        if (!startedFast) {
          ctx.moveTo(x, y);
          startedFast = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    if (startedFast) ctx.stroke();

    // 4. Slow EMA (Orange)
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#fb923c";
    ctx.beginPath();
    let startedSlow = false;
    for (let i = startIndex; i < endIndex; i++) {
      const val = indicatorData.slowEMA[i];
      if (val !== null) {
        const x = (i - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const y = getY(val);
        if (!startedSlow) {
          ctx.moveTo(x, y);
          startedSlow = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    if (startedSlow) ctx.stroke();

    // 4.5 Draw RSI Divergence Markers & Arrows (Alongside EMA Crossover Signals)
    indicatorData.divergences.forEach((dm) => {
      if (dm.index >= startIndex && dm.index < endIndex) {
        const x = (dm.index - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const isBull = dm.type === "BULLISH";
        const candle = candles[dm.index];
        const lowY = getY(candle.low);
        const highY = getY(candle.high);

        // Price divergence connecting trendline from previous swing pivot
        if (dm.prevIndex >= startIndex && dm.prevIndex < endIndex) {
          const prevX = (dm.prevIndex - startIndex) * candleSlotWidth + candleSlotWidth / 2;
          const prevY = getY(dm.prevPrice);
          const currY = getY(dm.price);

          ctx.save();
          ctx.setLineDash([3, 2]);
          ctx.strokeStyle = isBull ? "rgba(52, 211, 153, 0.9)" : "rgba(248, 113, 113, 0.9)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(x, currY);
          ctx.stroke();

          // Pivot anchor dot on prior swing
          ctx.fillStyle = isBull ? "#10b981" : "#ef4444";
          ctx.beginPath();
          ctx.arc(prevX, prevY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        if (isBull) {
          // Upward Arrow below candle low (pointing UP towards low)
          const arrowTipY = lowY + 12;
          const arrowBaseY = lowY + 23;
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.moveTo(x, arrowTipY);
          ctx.lineTo(x - 6, arrowBaseY);
          ctx.lineTo(x + 6, arrowBaseY);
          ctx.closePath();
          ctx.fill();

          // Highlight Badge: ▲ BULL DIV + BUY
          const badgeY = arrowBaseY + 3;
          const badgeW = 96;
          const badgeH = 16;
          const badgeX = x - badgeW / 2;

          ctx.fillStyle = "rgba(6, 78, 59, 0.95)";
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.font = "bold 8.5px JetBrains Mono, monospace";
          ctx.fillStyle = "#34d399";
          ctx.textAlign = "center";
          ctx.fillText("▲ BULL DIV + BUY", x, badgeY + 11.5);
        } else {
          // Downward Arrow above candle high (pointing DOWN towards high)
          const arrowTipY = highY - 12;
          const arrowBaseY = highY - 23;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(x, arrowTipY);
          ctx.lineTo(x - 6, arrowBaseY);
          ctx.lineTo(x + 6, arrowBaseY);
          ctx.closePath();
          ctx.fill();

          // Highlight Badge: ▼ BEAR DIV + SELL
          const badgeY = arrowBaseY - 19;
          const badgeW = 98;
          const badgeH = 16;
          const badgeX = x - badgeW / 2;

          ctx.fillStyle = "rgba(136, 19, 55, 0.95)";
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.font = "bold 8.5px JetBrains Mono, monospace";
          ctx.fillStyle = "#f87171";
          ctx.textAlign = "center";
          ctx.fillText("▼ BEAR DIV + SELL", x, badgeY + 11.5);
        }
        ctx.restore();
      }
    });

    // 4.7 Draw Major Price Movement & High Impact Event Badges
    indicatorData.majorMovements.forEach((mm) => {
      if (mm.index >= startIndex && mm.index < endIndex) {
        const x = (mm.index - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const isBull = mm.direction === "BULLISH";
        const lowY = getY(mm.low);
        const highY = getY(mm.high);

        ctx.save();
        if (isBull) {
          const badgeY = Math.min(priceChartHeight - 20, lowY + 36);
          const badgeW = 90;
          const badgeH = 16;
          const badgeX = x - badgeW / 2;

          ctx.fillStyle = "rgba(180, 83, 9, 0.95)";
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.font = "bold 8px JetBrains Mono, monospace";
          ctx.fillStyle = "#fef3c7";
          ctx.textAlign = "center";
          ctx.fillText(`⚡ NEWS +${mm.pipDelta}p`, x, badgeY + 11.5);
        } else {
          const badgeY = Math.max(4, highY - 40);
          const badgeW = 90;
          const badgeH = 16;
          const badgeX = x - badgeW / 2;

          ctx.fillStyle = "rgba(159, 18, 57, 0.95)";
          ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 1;
          ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

          ctx.font = "bold 8px JetBrains Mono, monospace";
          ctx.fillStyle = "#ffe4e6";
          ctx.textAlign = "center";
          ctx.fillText(`⚡ NEWS -${mm.pipDelta}p`, x, badgeY + 11.5);
        }
        ctx.restore();
      }
    });

    // 5. Open Position Lines (Entry, S/L, T/P)

    if (position) {
      // Entry Line (White/Emerald dashed)
      const entryY = getY(position.entryPrice);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, entryY);
      ctx.lineTo(chartWidth, entryY);
      ctx.stroke();

      // Badge for Entry
      ctx.setLineDash([]);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(chartWidth + 2, entryY - 9, 65, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText(`${position.type} #${position.ticket}`, chartWidth + 5, entryY + 3);

      // Stop Loss Line (Crimson)
      const slY = getY(position.stopLossPrice);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, slY);
      ctx.lineTo(chartWidth, slY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(chartWidth + 2, slY - 9, 65, 18);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`SL ${position.stopLossPrice.toFixed(pipDecimals)}`, chartWidth + 5, slY + 3);

      // Take Profit Line (Emerald)
      if (position.takeProfitPrice !== null) {
        const tpY = getY(position.takeProfitPrice);
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, tpY);
        ctx.lineTo(chartWidth, tpY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = "#10b981";
        ctx.fillRect(chartWidth + 2, tpY - 9, 65, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`TP ${position.takeProfitPrice.toFixed(pipDecimals)}`, chartWidth + 5, tpY + 3);
      }
      ctx.setLineDash([]);
    }

    // 6. Current Price Line
    const lastVisibleCandle = visibleCandles[visibleCandles.length - 1];
    if (lastVisibleCandle) {
      const currentPriceY = getY(lastVisibleCandle.close);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, currentPriceY);
      ctx.lineTo(chartWidth, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Price label
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(chartWidth + 2, currentPriceY - 8, 66, 16);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1;
      ctx.strokeRect(chartWidth + 2, currentPriceY - 8, 66, 16);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillText(lastVisibleCandle.close.toFixed(pipDecimals), chartWidth + 6, currentPriceY + 4);
    }

    // 7. Divider between Price & Sub-window (RSI / Sentiment)
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, dividerY);
    ctx.lineTo(width, dividerY);
    ctx.stroke();

    // -------------------------------------------------------------
    // HUD Watermark: Market Sentiment + Autotrading + Close By Profit
    // -------------------------------------------------------------
    const currentScore = sentimentData?.score ?? 48;
    const isCurrentBull = currentScore >= 0;
    const currentClass = sentimentData?.classification ?? (currentScore >= 20 ? "Bullish" : currentScore <= -20 ? "Bearish" : "Neutral");

    ctx.save();
    ctx.fillStyle = "rgba(10, 13, 19, 0.82)";
    ctx.fillRect(8, 8, 332, 25);
    ctx.strokeStyle = isCurrentBull ? "rgba(16, 185, 129, 0.45)" : "rgba(244, 63, 94, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 332, 25);

    // Glow dot
    ctx.beginPath();
    ctx.arc(18, 20.5, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isCurrentBull ? "#10b981" : "#f43f5e";
    ctx.fill();

    ctx.font = "bold 9.5px JetBrains Mono, monospace";
    ctx.fillStyle = isCurrentBull ? "#34d399" : "#fb7185";
    ctx.fillText(
      `SENTIMENT: ${currentScore >= 0 ? "+" : ""}${currentScore} ${currentClass.toUpperCase()}`,
      27,
      24
    );

    ctx.font = "9px JetBrains Mono, monospace";
    ctx.fillStyle = autotradingActive ? "#38bdf8" : "#64748b";
    ctx.fillText(`EA:${autotradingActive ? "AUTOTRADE" : "MANUAL"}`, 208, 24);

    ctx.fillStyle = closeByProfitActive ? "#fbbf24" : "#64748b";
    ctx.fillText(`PROFIT:${closeByProfitActive ? "LOCK" : "OFF"}`, 282, 24);
    ctx.restore();

    // -------------------------------------------------------------
    // 8. Sub-Window: Sentiment Oscillator / Dual Overlay / RSI
    // -------------------------------------------------------------
    const drawRsi = (isSecondary = false) => {
      const rsi70Y = getRsiY(70);
      const rsi30Y = getRsiY(30);
      const rsi50Y = getRsiY(50);

      if (!isSecondary) {
        ctx.fillStyle = "rgba(168, 85, 247, 0.04)";
        ctx.fillRect(0, rsi70Y, chartWidth, rsi30Y - rsi70Y);
      }

      // Overbought 70 line
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rsi70Y);
      ctx.lineTo(chartWidth, rsi70Y);
      ctx.stroke();

      // Oversold 30 line
      ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
      ctx.beginPath();
      ctx.moveTo(0, rsi30Y);
      ctx.lineTo(chartWidth, rsi30Y);
      ctx.stroke();

      if (!isSecondary) {
        // Midline 50
        ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
        ctx.beginPath();
        ctx.moveTo(0, rsi50Y);
        ctx.lineTo(chartWidth, rsi50Y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // RSI scale labels
      ctx.fillStyle = isSecondary ? "rgba(192, 132, 252, 0.8)" : "#64748b";
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText("70 OB", chartWidth + 6, rsi70Y + 3);
      if (!isSecondary) ctx.fillText("50", chartWidth + 6, rsi50Y + 3);
      ctx.fillText("30 OS", chartWidth + 6, rsi30Y + 3);

      // RSI Line
      ctx.strokeStyle = isSecondary ? "rgba(192, 132, 252, 0.65)" : "#c084fc";
      ctx.lineWidth = isSecondary ? 1.2 : 1.6;
      ctx.beginPath();
      let startedRsi = false;
      for (let i = startIndex; i < endIndex; i++) {
        const val = indicatorData.rsi[i];
        if (val !== null) {
          const x = (i - startIndex) * candleSlotWidth + candleSlotWidth / 2;
          const y = getRsiY(val);
          if (!startedRsi) {
            ctx.moveTo(x, y);
            startedRsi = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      if (startedRsi) ctx.stroke();

      // Draw RSI Divergence Connecting Lines & Pivot Anchors in RSI subwindow
      indicatorData.divergences.forEach((dm) => {
        if (
          dm.index >= startIndex &&
          dm.index < endIndex &&
          dm.prevIndex >= startIndex &&
          dm.prevIndex < endIndex
        ) {
          const x = (dm.index - startIndex) * candleSlotWidth + candleSlotWidth / 2;
          const prevX = (dm.prevIndex - startIndex) * candleSlotWidth + candleSlotWidth / 2;
          const prevRsiY = getRsiY(dm.prevRsi);
          const currRsiY = getRsiY(dm.rsi);
          const isBull = dm.type === "BULLISH";

          ctx.save();
          ctx.setLineDash([3, 2]);
          ctx.strokeStyle = isBull ? "#34d399" : "#f87171";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(prevX, prevRsiY);
          ctx.lineTo(x, currRsiY);
          ctx.stroke();

          // Anchor dots on RSI curve
          ctx.setLineDash([]);
          ctx.fillStyle = isBull ? "#10b981" : "#ef4444";
          ctx.beginPath();
          ctx.arc(prevX, prevRsiY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, currRsiY, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    };

    const drawSentimentOscillator = (isOverlay = false) => {
      const sentPlus20Y = getSentimentY(20);
      const sentMinus20Y = getSentimentY(-20);
      const sentZeroY = getSentimentY(0);
      const sentTopY = getSentimentY(100);
      const sentBottomY = getSentimentY(-100);

      // Gradient Zones (Bullish / Bearish)
      if (!isOverlay) {
        ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
        ctx.fillRect(0, sentTopY, chartWidth, sentPlus20Y - sentTopY);

        ctx.fillStyle = "rgba(244, 63, 94, 0.06)";
        ctx.fillRect(0, sentMinus20Y, chartWidth, sentBottomY - sentMinus20Y);
      }

      // Neutral zero line
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, sentZeroY);
      ctx.lineTo(chartWidth, sentZeroY);
      ctx.stroke();

      // Trigger threshold lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, sentPlus20Y);
      ctx.lineTo(chartWidth, sentPlus20Y);
      ctx.stroke();

      ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
      ctx.beginPath();
      ctx.moveTo(0, sentMinus20Y);
      ctx.lineTo(chartWidth, sentMinus20Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Scale text
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillStyle = "#10b981";
      ctx.fillText("+20 BULL", chartWidth + 6, sentPlus20Y + 3);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("0 BIAS", chartWidth + 6, sentZeroY + 3);
      ctx.fillStyle = "#f43f5e";
      ctx.fillText("-20 BEAR", chartWidth + 6, sentMinus20Y + 3);

      // Area fill under oscillator curve to zero line
      for (let i = startIndex; i < endIndex - 1; i++) {
        const s1 = indicatorData.sentimentSeries[i] ?? 0;
        const s2 = indicatorData.sentimentSeries[i + 1] ?? 0;
        const x1 = (i - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const x2 = (i + 1 - startIndex) * candleSlotWidth + candleSlotWidth / 2;
        const y1 = getSentimentY(s1);
        const y2 = getSentimentY(s2);

        ctx.beginPath();
        ctx.moveTo(x1, sentZeroY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, sentZeroY);
        ctx.closePath();
        const avgS = (s1 + s2) / 2;
        ctx.fillStyle = avgS >= 0 ? "rgba(16, 185, 129, 0.16)" : "rgba(244, 63, 94, 0.16)";
        ctx.fill();

        // Glowing stroke segment
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = avgS >= 0 ? "#10b981" : "#f43f5e";
        ctx.lineWidth = 2.0;
        ctx.stroke();
      }

      // Latest Sentiment Tag on right scale
      const latestSent = indicatorData.sentimentSeries[endIndex - 1] ?? currentScore;
      const tagY = getSentimentY(latestSent);
      ctx.fillStyle = latestSent >= 0 ? "#064e3b" : "#881337";
      ctx.fillRect(chartWidth + 2, tagY - 9, 66, 18);
      ctx.strokeStyle = latestSent >= 0 ? "#10b981" : "#f43f5e";
      ctx.lineWidth = 1;
      ctx.strokeRect(chartWidth + 2, tagY - 9, 66, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.fillText(`${latestSent >= 0 ? "+" : ""}${latestSent} OSC`, chartWidth + 5, tagY + 3);
    };

    if (subWindowMode === "SENTIMENT") {
      drawSentimentOscillator(false);
    } else if (subWindowMode === "DUAL") {
      drawRsi(true);
      drawSentimentOscillator(true);
    } else {
      drawRsi(false);
    }

    // 9. Time Axis (Bottom)
    const timeStep = Math.max(Math.floor(visibleCandles.length / 7), 1);
    ctx.fillStyle = "#64748b";
    ctx.font = "9px JetBrains Mono, monospace";
    visibleCandles.forEach((c, idx) => {
      if (idx % timeStep === 0) {
        const x = idx * candleSlotWidth + candleSlotWidth / 2;
        ctx.fillText(c.time, x - 12, height - 6);
      }
    });

    // 10. Crosshair Overlay
    if (mousePos && mousePos.x < chartWidth && mousePos.y < height - bottomMargin) {
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 0.8;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, height - bottomMargin);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Floating price tooltip if in price chart
      if (mousePos.y <= dividerY) {
        const cursorPrice = maxPrice - (mousePos.y / priceChartHeight) * priceSpread;
        ctx.fillStyle = "#334155";
        ctx.fillRect(chartWidth + 2, mousePos.y - 8, 66, 16);
        ctx.fillStyle = "#ffffff";
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillText(cursorPrice.toFixed(pipDecimals), chartWidth + 6, mousePos.y + 4);
      } else {
        // Floating subwindow tooltip
        if (subWindowMode === "SENTIMENT") {
          const cursorSent = Math.round(((1 - (mousePos.y - dividerY - 6) / (rsiHeight - 12)) * 200) - 100);
          ctx.fillStyle = "#334155";
          ctx.fillRect(chartWidth + 2, mousePos.y - 8, 66, 16);
          ctx.fillStyle = "#ffffff";
          ctx.font = "9px JetBrains Mono, monospace";
          ctx.fillText(`OSC ${cursorSent >= 0 ? "+" : ""}${cursorSent}`, chartWidth + 6, mousePos.y + 4);
        } else {
          const cursorRsi = Math.max(0, Math.min(100, (1 - (mousePos.y - dividerY - 6) / (rsiHeight - 12)) * 100));
          ctx.fillStyle = "#334155";
          ctx.fillRect(chartWidth + 2, mousePos.y - 8, 66, 16);
          ctx.fillStyle = "#ffffff";
          ctx.font = "9px JetBrains Mono, monospace";
          ctx.fillText(`RSI ${cursorRsi.toFixed(1)}`, chartWidth + 6, mousePos.y + 4);
        }
      }
    }
  }, [
    visibleCandles,
    startIndex,
    endIndex,
    indicatorData,
    position,
    trades,
    pipDecimals,
    mousePos,
    subWindowMode,
    sentimentData,
    autotradingActive,
    closeByProfitActive,
    showSessions,
  ]);

  // Mouse event handlers for interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Drag to pan
    if (isDragging) {
      const deltaX = x - dragStartX;
      const sensitivity = 5;
      const candleShift = Math.round(deltaX / sensitivity);
      if (candleShift !== 0) {
        setOffsetRight((prev) => Math.max(0, Math.min(totalCandles - effectiveZoom, prev + candleShift)));
        setDragStartX(x);
      }
    }

    // Determine hover candle
    const chartWidth = rect.width - 72;
    if (x <= chartWidth && visibleCandles.length > 0) {
      const candleSlotWidth = chartWidth / visibleCandles.length;
      const localIdx = Math.floor(x / candleSlotWidth);
      if (localIdx >= 0 && localIdx < visibleCandles.length) {
        setHoverIndex(startIndex + localIdx);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setDragStartX(e.clientX - rect.left);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setMousePos(null);
    setHoverIndex(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setZoomLevel((prev) => Math.max(20, prev - 5));
    } else {
      // Zoom out
      setZoomLevel((prev) => Math.min(150, prev + 5));
    }
  };

  // Inspect candle (either hovered or the latest visible)
  const activeCandleIndex = hoverIndex !== null ? hoverIndex : Math.max(0, endIndex - 1);
  const activeCandle = candles[activeCandleIndex];
  const activeFastEMA = activeCandleIndex >= 0 ? indicatorData.fastEMA[activeCandleIndex] : null;
  const activeSlowEMA = activeCandleIndex >= 0 ? indicatorData.slowEMA[activeCandleIndex] : null;
  const activeRSI = activeCandleIndex >= 0 ? indicatorData.rsi[activeCandleIndex] : null;
  const activeSentiment = activeCandleIndex >= 0 ? indicatorData.sentimentSeries[activeCandleIndex] : (sentimentData?.score ?? 48);
  const activeDivergence = indicatorData.divergences.find((d) => d.index === activeCandleIndex);

  const currentSentimentScore = sentimentData?.score ?? 48;
  const isBullishSentiment = currentSentimentScore >= 0;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full h-full bg-[#0a0d13] border border-slate-800/80 rounded-lg overflow-hidden select-none"
    >
      {/* Top Chart Header / Inspector */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#0e121a] border-b border-slate-800/80 text-xs gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-semibold text-slate-100 tracking-wide font-mono text-xs">{symbol}</span>
          <span className="text-slate-500 font-mono text-[11px]">15M</span>

          {/* Market Sentiment Indicator Badge (Click to open News / Search Modal) */}
          <button
            onClick={onOpenSentimentModal}
            title="Google Search Grounded Market Sentiment & Macro News Analysis"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-all border cursor-pointer ${
              isBullishSentiment
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60 shadow-xs"
                : "bg-rose-950/60 border-rose-500/50 text-rose-300 hover:bg-rose-900/60 shadow-xs"
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${isLoadingSentiment ? "animate-spin text-sky-400" : isBullishSentiment ? "text-emerald-400" : "text-rose-400"}`} />
            <span>SENTIMENT:</span>
            <span className={isBullishSentiment ? "text-emerald-300" : "text-rose-300"}>
              {currentSentimentScore >= 0 ? `+${currentSentimentScore}` : currentSentimentScore} {sentimentData?.classification || (isBullishSentiment ? "Bullish" : "Bearish")}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({sentimentData?.confidence || 86}%)
            </span>
            <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Subwindow Mode Switcher */}
          <div className="hidden md:flex items-center bg-[#070a10] border border-slate-800 rounded p-0.5 text-[10px] font-mono">
            <button
              onClick={() => setSubWindowMode("DUAL")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                subWindowMode === "DUAL" ? "bg-slate-700 text-sky-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dual Overlay: RSI & Sentiment Oscillator"
            >
              Dual (RSI+Sent)
            </button>
            <button
              onClick={() => setSubWindowMode("SENTIMENT")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                subWindowMode === "SENTIMENT" ? "bg-slate-700 text-emerald-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Full Market Sentiment Oscillator"
            >
              Sentiment Osc
            </button>
            <button
              onClick={() => setSubWindowMode("RSI")}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                subWindowMode === "RSI" ? "bg-slate-700 text-purple-300 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
              title="Classic RSI(14)"
            >
              RSI(14)
            </button>
          </div>

          {/* Autotrade & Close by Profit Quick Badges */}
          {onToggleAutotrading && (
            <button
              onClick={onToggleAutotrading}
              className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                autotradingActive
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
              title="Autotrading powered by Sentiment & Indicators"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autotradingActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span>Autotrade: {autotradingActive ? "ON" : "OFF"}</span>
            </button>
          )}

          {onToggleCloseByProfit && (
            <button
              onClick={onToggleCloseByProfit}
              className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                closeByProfitActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                  : "bg-slate-800/80 border-slate-700 text-slate-400"
              }`}
              title="Close by Profit autonomous target locking"
            >
              <Target className="w-3 h-3 text-amber-400" />
              <span>Close by Profit: {closeByProfitActive ? "+$25 Target" : "OFF"}</span>
            </button>
          )}

          {activeCandle && (
            <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span>O: <strong className="text-slate-200">{activeCandle.open.toFixed(pipDecimals)}</strong></span>
              <span>H: <strong className="text-emerald-400">{activeCandle.high.toFixed(pipDecimals)}</strong></span>
              <span>L: <strong className="text-rose-400">{activeCandle.low.toFixed(pipDecimals)}</strong></span>
              <span>C: <strong className="text-slate-200">{activeCandle.close.toFixed(pipDecimals)}</strong></span>
            </div>
          )}
        </div>

          {/* Indicator badges & Controls */}
        <div className="flex items-center gap-2">
          {/* Trading Sessions Overlay Toggle */}
          <button
            onClick={() => setShowSessions((prev) => !prev)}
            title="Toggle shaded background trading sessions (Sydney, Asia, London, New York & Overlap)"
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
              showSessions
                ? "bg-indigo-950/80 border-indigo-500/60 text-indigo-300 shadow-xs"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3 h-3 text-indigo-400" />
            <span>SESSIONS:</span>
            <span className={showSessions ? "text-indigo-300" : "text-slate-500"}>
              {showSessions ? "ON" : "OFF"}
            </span>
          </button>

          {/* High Impact News Overlay Toggle */}
          <button
            onClick={() => setShowNewsOverlay((prev) => !prev)}
            title="Toggle High Impact News Overlay with Google Search Grounding for major price moves"
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer ${
              showNewsOverlay
                ? "bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-xs"
                : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className={`w-3 h-3 ${isLoadingNews ? "animate-spin text-amber-400" : "text-amber-400"}`} />
            <span>NEWS OVERLAY:</span>
            <span className={showNewsOverlay ? "text-amber-300" : "text-slate-500"}>
              {showNewsOverlay ? "ON" : "OFF"}
            </span>
            {indicatorData.majorMovements.length > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {indicatorData.majorMovements.length} MOVES
              </span>
            )}
          </button>

          {/* RSI Divergence & Filter Status Badges */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
              activeDivergence
                ? activeDivergence.type === "BULLISH"
                  ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300 animate-pulse"
                  : "bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse"
                : "bg-purple-950/40 border-purple-500/40 text-purple-300"
            }`}
            title="Visual markers & highlights are rendered on the chart when an RSI divergence aligns with an EMA crossover"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>
              {activeDivergence
                ? activeDivergence.type === "BULLISH"
                  ? "⚡ RSI BULL DIV DETECTED"
                  : "⚡ RSI BEAR DIV DETECTED"
                : `RSI DIV: ${indicatorData.divergences.length} FOUND`}
            </span>
          </div>

          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[9.5px] font-mono border ${
              rsiFilterEnabled !== false
                ? "bg-purple-950/40 text-purple-300 border-purple-700/50"
                : "bg-amber-950/40 text-amber-300 border-amber-700/50"
            }`}
            title="RSI Threshold Filter status during EMA crossover signal calculation"
          >
            RSI FILTER: {rsiFilterEnabled !== false ? "ON" : "OFF"}
          </span>

          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px]">
            <span className="text-sky-400">
              EMA({fastEMAPeriod}): {activeFastEMA !== null ? activeFastEMA.toFixed(pipDecimals) : "—"}
            </span>
            <span className="text-amber-400">
              EMA({slowEMAPeriod}): {activeSlowEMA !== null ? activeSlowEMA.toFixed(pipDecimals) : "—"}
            </span>
            <span className="text-purple-400">
              RSI({rsiPeriod}): {activeRSI !== null ? activeRSI.toFixed(1) : "—"}
            </span>
            <span className={activeSentiment >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
              Sent Osc: {activeSentiment >= 0 ? `+${activeSentiment}` : activeSentiment}
            </span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setZoomLevel((z) => Math.max(20, z - 10))}
              title="Zoom In"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              title="Zoom Out"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setOffsetRight(0);
                setZoomLevel(65);
              }}
              title="Reset View"
              className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Trading Sessions & High Volatility Legend Strip */}
      {showSessions && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#090d15] border-b border-slate-800/80 text-[10px] font-mono text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> SESSIONS (UTC):
            </span>
            <div className="flex items-center gap-1.5" title="Sydney Session: 21:00-06:00 UTC">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#818cf8]" />
              <span className="text-indigo-300 font-medium">Sydney (21-06)</span>
            </div>
            <div className="flex items-center gap-1.5" title="Tokyo / Asian Session: 00:00-09:00 UTC">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#06b6d4]" />
              <span className="text-cyan-300 font-medium">Asia (00-09)</span>
            </div>
            <div className="flex items-center gap-1.5" title="London Session: 07:00-16:00 UTC">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#3b82f6]" />
              <span className="text-blue-300 font-medium">London (07-16)</span>
            </div>
            <div className="flex items-center gap-1.5" title="New York Session: 12:00-21:00 UTC">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#a855f7]" />
              <span className="text-purple-300 font-medium">New York (12-21)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
            <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>HIGH-VOLATILITY WINDOW: London / NY Overlap (12:00-16:00 UTC)</span>
          </div>
        </div>
      )}

      {/* Canvas Viewport & Overlays */}
      <div className="relative flex-1 w-full min-h-[360px] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* High Impact News Overlay (Search Grounded Economic Events HUD) */}
        {showNewsOverlay && highImpactNews && (
          <div className="absolute top-2.5 right-18 z-20 max-w-sm w-[350px] bg-[#0c1017]/95 border border-amber-500/40 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden text-xs font-mono transition-all">
            {/* Overlay Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-950/90 to-slate-900 border-b border-amber-500/30">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-100 text-[11px]">HIGH IMPACT NEWS</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      GROUNDED
                    </span>
                  </div>
                  <div className="text-[9.5px] text-slate-400">Google Search Grounding Engine</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (activeMove) {
                      setIsLoadingNews(true);
                      fetchHighImpactNews(symbol, activeMove.pipDelta, activeMove.direction)
                        .then((d) => {
                          setHighImpactNews(d);
                          setIsLoadingNews(false);
                        })
                        .catch(() => setIsLoadingNews(false));
                    }
                  }}
                  title="Re-query Search Grounding for fresh events"
                  className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingNews ? "animate-spin text-amber-400" : ""}`} />
                </button>
                <button
                  onClick={() => setIsOverlayMinimized((m) => !m)}
                  title={isOverlayMinimized ? "Expand" : "Minimize"}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isOverlayMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setShowNewsOverlay(false)}
                  title="Close Overlay"
                  className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {!isOverlayMinimized && (
              <div className="p-2.5 space-y-2.5 max-h-[380px] overflow-y-auto">
                {/* Detected Price Movement Banner */}
                {activeMove && (
                  <div className="p-2 rounded bg-[#0e1422] border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[9.5px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>Major Move Detected ({activeMove.time})</span>
                      </div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">
                        {symbol}: {activeMove.direction === "BULLISH" ? "+" : "-"}{activeMove.pipDelta} Pips ({activeMove.atrMultiple}x ATR)
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        activeMove.direction === "BULLISH"
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                          : "bg-rose-950/60 text-rose-300 border-rose-500/50"
                      }`}
                    >
                      {activeMove.direction}
                    </span>
                  </div>
                )}

                {/* Market Catalyst Breakdown */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Radio className="w-3 h-3 text-sky-400" />
                    <span>Market Catalyst Analysis</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed bg-[#0a0d13] p-2 rounded border border-slate-800/80">
                    {highImpactNews.marketCatalyst}
                  </p>
                </div>

                {/* Significant Economic Events Cards */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Significant Economic Events</span>
                    </span>
                    <span className="text-[9.5px] text-slate-500">{highImpactNews.events.length} releases</span>
                  </div>

                  <div className="space-y-1.5">
                    {highImpactNews.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2 rounded bg-[#0e131d] border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-200 text-[11px] truncate">
                            <span className="px-1 py-0.2 rounded bg-slate-800 text-sky-300 text-[9.5px]">
                              {ev.currency}
                            </span>
                            <span className="truncate" title={ev.title}>{ev.title}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${
                              ev.impact === "CRITICAL"
                                ? "bg-rose-950/80 text-rose-300 border-rose-500/50"
                                : "bg-amber-950/80 text-amber-300 border-amber-500/50"
                            }`}
                          >
                            {ev.impact}
                          </span>
                        </div>

                        {/* Actual vs Forecast vs Previous */}
                        <div className="grid grid-cols-3 gap-1 text-[10px] bg-[#07090f] p-1.5 rounded border border-slate-800/60 font-mono">
                          <div>
                            <span className="text-slate-500 block text-[9px]">ACTUAL</span>
                            <strong className="text-emerald-400">{ev.actual}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">FORECAST</span>
                            <span className="text-slate-300">{ev.forecast}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">SURPRISE</span>
                            <span className="text-amber-300 font-semibold">{ev.surpriseDirection}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-normal">
                          {ev.summary}
                        </p>

                        {ev.url && (
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9.5px] text-sky-400 hover:underline pt-0.5"
                          >
                            <span>{ev.source}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tactical Recommendation */}
                {highImpactNews.recommendedTraderAction && (
                  <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-[10px] text-emerald-300/90 leading-relaxed">
                    <strong className="text-emerald-300 block mb-0.5">Tactical Advisory:</strong>
                    {highImpactNews.recommendedTraderAction}
                  </div>
                )}

                {/* Grounding Citations */}
                {highImpactNews.groundingSources && highImpactNews.groundingSources.length > 0 && (
                  <div className="pt-1 border-t border-slate-800/80 text-[9.5px] text-slate-400">
                    <span className="text-slate-500">Live Search Sources: </span>
                    {highImpactNews.groundingSources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline mr-2"
                      >
                        {s.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

