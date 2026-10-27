export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  fastEMA: number | null;
  slowEMA: number | null;
  rsi: number | null;
}

export interface BotConfig {
  fastEMA: number;
  slowEMA: number;
  rsiPeriod: number;
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  initialBalance: number;
  riskPercent: number;
  maxDrawdownPercent: number;
  stopDistancePips: number;
  takeProfitRatio: number; // 0 for opposite-signal exit, e.g. 1.5 or 2.0 for fixed R:R
  symbol: string;
  autoTrading: boolean;
  // Autopilot Enhancements
  autopilotMode: boolean;
  trailingStop: boolean;
  trailingStopDistancePips: number;
  breakEvenTriggerPips: number;
  oppositeSignalClose: boolean;
  maxSpreadFilterPips: number;
  // Capital Shield / Zero-Loss Profit Maximizer
  capitalShieldMode: boolean;
  adaptiveFilter: boolean;
  profitCompounding: boolean;
  // Smart Volatility Trailing Stop (ATR-based dynamic stop loss)
  smartTrailingStop: boolean;
  atrPeriod: number;
  atrMultiplier: number;
  // Converted Execution Settings: Simulation = false, True Buy = true, True Sell = true
  simulationMode: boolean; // false = Real/Live Order Execution, true = Simulation
  allowBuy: boolean; // true = True Buy orders enabled
  allowSell: boolean; // true = True Sell orders enabled
  // RSI Filter Control (independent of EMA settings)
  rsiFilterEnabled?: boolean; // When true, RSI threshold rules filter entries. When false, trade on pure EMA crossover.
  // Market Sentiment Autotrading & Close by Profit
  sentimentAutotrading?: boolean; // Autotrade based on sentiment oscillator & headlines
  sentimentThreshold?: number; // Score threshold (+25 / -25) to confirm sentiment entry
  closeByProfit?: boolean; // Autotrading auto-exit when position is in target profit
  closeProfitPipsTarget?: number; // Pips profit target to lock in (e.g. 15 pips)
  closeProfitDollarTarget?: number; // Dollar profit target to lock in (e.g. $30)
  // Non-Stop Continuous Execution (24/7 Perpetual Autopilot)
  nonStopMode?: boolean; // When true, perpetual non-stop automated trading without halting
}

export type SignalType = "BUY" | "SELL" | "WAIT" | "PAUSED";

export interface BotAnalysisResult {
  signal: SignalType;
  reason?: string;
  price: number;
  fastEMA: number | null;
  slowEMA: number | null;
  RSI: number | null;
  rsiDivergence?: "BULLISH" | "BEARISH" | null;
  mode: "SIMULATION" | "REAL_EXECUTION";
  time?: string;
  candleIndex: number;
  autopilotStatus?: string;
}

export interface Position {
  id: string;
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopDistance: number;
  stopLossPrice: number;
  takeProfitPrice: number | null;
  riskAmount: number;
  units: number;
  entryTime: string;
  entryCandleIndex: number;
  unrealizedProfit: number;
  isBreakevenLocked?: boolean;
  isTrailingActive?: boolean;
}

export interface Trade {
  id: string;
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  entry: number;
  exit: number;
  stopLoss: number;
  takeProfit: number | null;
  profit: number;
  balance: number;
  units: number;
  entryTime: string;
  exitTime: string;
  pips: number;
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "OPPOSITE_SIGNAL" | "MANUAL" | "CLOSE_BY_PROFIT";
  notes?: string;
}

export interface BotLog {
  id: string;
  time: string;
  candleIndex: number;
  type: "SIGNAL" | "ORDER_OPEN" | "ORDER_CLOSE" | "RISK_ALERT" | "INFO";
  message: string;
  details?: Record<string, any>;
}

export interface BotReport {
  mode: string;
  initialBalance: number;
  currentBalance: number;
  peakBalance: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  returnPercent: number;
  maxRecordedDrawdown: number;
  currentDrawdown: number;
  paused: boolean;
  history: Trade[];
}

export interface ForexPairInfo {
  symbol: string;
  name: string;
  pipSize: number;
  pipDecimals: number;
  defaultPrice: number;
  spreadPips: number;
}

export interface NewsHeadline {
  title: string;
  source: string;
  snippet: string;
  impact: "BULLISH" | "BEARISH" | "NEUTRAL";
  timeAgo: string;
  url?: string;
}

export interface MarketSentimentData {
  symbol: string;
  score: number; // -100 (Max Bearish) to +100 (Max Bullish)
  classification: "Strong Bullish" | "Bullish" | "Neutral" | "Bearish" | "Strong Bearish";
  confidence: number; // 0 to 100
  summary: string;
  macroDrivers: string;
  bullishFactors?: string[];
  bearishFactors?: string[];
  headlines: NewsHeadline[];
  source: string;
  timestamp: number;
  oscillatorSeries?: number[]; // series across visible candles (-100 to +100)
}

export interface HighImpactEconomicEvent {
  id: string;
  title: string;
  currency: string;
  impact: "HIGH" | "CRITICAL";
  time: string;
  actual: string;
  forecast: string;
  previous: string;
  surpriseDirection: "HAWKISH" | "DOVISH" | "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
  source: string;
  url?: string;
}

export interface DetectedPriceMovement {
  candleIndex: number;
  time: string;
  symbol: string;
  price: number;
  pipDelta: number;
  percentChange: number;
  direction: "BULLISH" | "BEARISH";
  atrMultiple: number;
}

export interface HighImpactNewsData {
  symbol: string;
  detectedMove?: DetectedPriceMovement;
  events: HighImpactEconomicEvent[];
  marketCatalyst: string;
  volatilityAssessment: string;
  recommendedTraderAction: string;
  groundingSources?: Array<{ title: string; url: string }>;
  timestamp: number;
  source: string;
}

