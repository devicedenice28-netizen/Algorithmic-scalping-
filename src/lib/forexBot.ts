import {
  BotAnalysisResult,
  BotConfig,
  BotLog,
  BotReport,
  Candle,
  Position,
  SignalType,
  Trade,
} from "../types/trading";

/**
 * MT5 Forex Trading Bot Simulator
 * Strategy: EMA Crossover + RSI
 * Mode: Simulation only — no real orders.
 */
export class ForexTradingBot {
  fastEMA: number;
  slowEMA: number;
  rsiPeriod: number;
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  initialBalance: number;
  balance: number;
  riskPercent: number;
  maxDrawdownPercent: number;
  stopDistancePips: number;
  takeProfitRatio: number;
  symbol: string;

  // Autopilot settings
  autopilotMode: boolean;
  trailingStop: boolean;
  trailingStopDistancePips: number;
  breakEvenTriggerPips: number;
  oppositeSignalClose: boolean;
  maxSpreadFilterPips: number;
  // Capital Shield Mode
  capitalShieldMode: boolean;
  adaptiveFilter: boolean;
  profitCompounding: boolean;
  // Smart Volatility Trailing Stop (ATR-based dynamic stop loss)
  smartTrailingStop: boolean;
  atrPeriod: number;
  atrMultiplier: number;
  recentCandles: Candle[];

  // Converted Execution Settings: Simulation = false, True Buy = true, True Sell = true
  simulationMode: boolean;
  allowBuy: boolean;
  allowSell: boolean;
  rsiFilterEnabled: boolean;

  // Market Sentiment Autotrading & Close by Profit
  sentimentAutotrading: boolean;
  sentimentThreshold: number;
  closeByProfit: boolean;
  closeProfitPipsTarget: number;
  closeProfitDollarTarget: number;
  nonStopMode: boolean;

  position: Position | null;
  peakBalance: number;
  maxRecordedDrawdown: number;
  paused: boolean;
  history: Trade[];
  logs: BotLog[];
  nextTicket: number;

  constructor(config: Partial<BotConfig> = {}) {
    this.fastEMA = config.fastEMA ?? 9;
    this.slowEMA = config.slowEMA ?? 21;
    this.rsiPeriod = config.rsiPeriod ?? 14;
    this.rsiBuyThreshold = config.rsiBuyThreshold ?? 70;
    this.rsiSellThreshold = config.rsiSellThreshold ?? 30;

    this.initialBalance = config.initialBalance ?? 1000;
    this.balance = this.initialBalance;

    this.riskPercent = config.riskPercent ?? 1;
    this.maxDrawdownPercent = config.maxDrawdownPercent ?? 10;
    this.stopDistancePips = config.stopDistancePips ?? 20;
    this.takeProfitRatio = config.takeProfitRatio ?? 1.5;
    this.symbol = config.symbol ?? "EUR/USD";

    // Autopilot defaults
    this.autopilotMode = config.autopilotMode ?? true;
    this.trailingStop = config.trailingStop ?? true;
    this.trailingStopDistancePips = config.trailingStopDistancePips ?? 15;
    this.breakEvenTriggerPips = config.breakEvenTriggerPips ?? 10;
    this.oppositeSignalClose = config.oppositeSignalClose ?? true;
    this.maxSpreadFilterPips = config.maxSpreadFilterPips ?? 2.0;

    // Capital Shield / Zero-Loss Profit Maximizer
    this.capitalShieldMode = config.capitalShieldMode ?? false;
    this.adaptiveFilter = config.adaptiveFilter ?? true;
    this.profitCompounding = config.profitCompounding ?? true;

    // Smart Volatility Trailing Stop (ATR-based)
    this.smartTrailingStop = config.smartTrailingStop ?? true;
    this.atrPeriod = config.atrPeriod ?? 14;
    this.atrMultiplier = config.atrMultiplier ?? 1.8;
    this.recentCandles = [];

    // Order Execution Settings (Simulation: false, True Buy: true, True Sell: true)
    this.simulationMode = config.simulationMode ?? false;
    this.allowBuy = config.allowBuy ?? true;
    this.allowSell = config.allowSell ?? true;

    // RSI Filter Control (independent of EMA settings)
    this.rsiFilterEnabled = config.rsiFilterEnabled ?? true;

    // Market Sentiment Autotrading & Close by Profit
    this.sentimentAutotrading = config.sentimentAutotrading ?? true;
    this.sentimentThreshold = config.sentimentThreshold ?? 20;
    this.closeByProfit = config.closeByProfit ?? true;
    this.closeProfitPipsTarget = config.closeProfitPipsTarget ?? 12;
    this.closeProfitDollarTarget = config.closeProfitDollarTarget ?? 25;
    this.nonStopMode = config.nonStopMode ?? true;

    this.position = null;
    this.peakBalance = this.balance;
    this.maxRecordedDrawdown = 0;
    this.paused = false;

    this.history = [];
    this.logs = [];
    this.nextTicket = 10001;
  }

  // Calculate Exponential Moving Average
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

  // Calculate Relative Strength Index
  calculateRSI(prices: number[], period = 14): number | null {
    if (prices.length <= period) return null;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];

      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;

    if (averageLoss === 0) return 100;

    const rs = averageGain / averageLoss;

    return 100 - 100 / (1 + rs);
  }

  // Calculate Average True Range (ATR) for dynamic volatility measurement
  calculateATR(candles: Candle[], period = this.atrPeriod): number | null {
    if (candles.length < period + 1) return null;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const prev = candles[i - 1];

      const highLow = current.high - current.low;
      const highClose = Math.abs(current.high - prev.close);
      const lowClose = Math.abs(current.low - prev.close);

      const tr = Math.max(highLow, highClose, lowClose);
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return null;

    // Smoothed / Exponential ATR calculation
    const initialSlice = trueRanges.slice(0, period);
    let atr = initialSlice.reduce((sum, val) => sum + val, 0) / period;

    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    return atr;
  }

  // Check account drawdown
  checkRisk(): { drawdown: number; paused: boolean } {
    this.peakBalance = Math.max(this.peakBalance, this.balance);

    const drawdown =
      this.peakBalance > 0
        ? ((this.peakBalance - this.balance) / this.peakBalance) * 100
        : 0;

    if (drawdown > this.maxRecordedDrawdown) {
      this.maxRecordedDrawdown = Number(drawdown.toFixed(2));
    }

    if (drawdown >= this.maxDrawdownPercent && !this.paused) {
      if (this.nonStopMode) {
        this.addLog(
          "INFO",
          `🛡️ [24/7 NON-STOP ROBOT ACTIVE] Drawdown touched ${drawdown.toFixed(2)}% (limit: ${this.maxDrawdownPercent}%). Auto-recalibrating risk shield baseline without stopping continuous execution.`
        );
        this.peakBalance = this.balance; // recalibrate peak to allow uninterrupted execution
      } else {
        this.paused = true;
        this.addLog(
          "RISK_ALERT",
          `🚨 Max drawdown threshold breached: ${drawdown.toFixed(2)}% >= ${this.maxDrawdownPercent}%. Trading has been PAUSED to protect capital.`
        );
      }
    }

    return {
      drawdown: Number(drawdown.toFixed(2)),
      paused: this.paused,
    };
  }

  // Reset risk limit pause manually if user confirms
  resetRiskPause(): void {
    this.paused = false;
    this.peakBalance = this.balance; // reset peak reference to avoid instant re-trigger
    this.addLog(
      "INFO",
      `Risk circuit breaker reset by trader. Peak balance re-calibrated to $${this.balance.toFixed(2)}.`
    );
  }

  // Analyze prices and generate a signal
  analyze(prices: number[], candleIndex = prices.length - 1): BotAnalysisResult {
    const currentMode = this.simulationMode ? "SIMULATION" : "REAL_EXECUTION";

    if (this.paused) {
      return {
        signal: "PAUSED",
        reason: "Risk limit reached",
        price: prices[prices.length - 1],
        fastEMA: null,
        slowEMA: null,
        RSI: null,
        mode: currentMode,
        candleIndex,
      };
    }

    if (prices.length < this.slowEMA + 2) {
      return {
        signal: "WAIT",
        reason: "Not enough price data",
        price: prices[prices.length - 1],
        fastEMA: null,
        slowEMA: null,
        RSI: null,
        mode: currentMode,
        candleIndex,
      };
    }

    const previousPrices = prices.slice(0, -1);

    const fastPrevious = this.calculateEMA(previousPrices, this.fastEMA);
    const slowPrevious = this.calculateEMA(previousPrices, this.slowEMA);
    const fastCurrent = this.calculateEMA(prices, this.fastEMA);
    const slowCurrent = this.calculateEMA(prices, this.slowEMA);
    const rsi = this.calculateRSI(prices, this.rsiPeriod);

    // Detect RSI Divergence against recent swing pivot
    let rsiDivergence: "BULLISH" | "BEARISH" | null = null;
    const lookback = Math.min(prices.length - 2, 20);
    if (lookback >= 6 && rsi !== null) {
      const currentPrice = prices[prices.length - 1];
      // Check for bullish divergence: price lower or near prior swing low while RSI makes higher low
      let lowestPrice = Infinity;
      let lowestIdx = -1;
      for (let k = prices.length - lookback; k < prices.length - 3; k++) {
        if (prices[k] < lowestPrice) {
          lowestPrice = prices[k];
          lowestIdx = k;
        }
      }
      if (lowestIdx !== -1) {
        const pastRsi = this.calculateRSI(prices.slice(0, lowestIdx + 1), this.rsiPeriod);
        if (pastRsi !== null && currentPrice <= lowestPrice * 1.0015 && rsi > pastRsi + 2.5) {
          rsiDivergence = "BULLISH";
        }
      }

      // Check for bearish divergence: price higher or near prior swing high while RSI makes lower high
      let highestPrice = -Infinity;
      let highestIdx = -1;
      for (let k = prices.length - lookback; k < prices.length - 3; k++) {
        if (prices[k] > highestPrice) {
          highestPrice = prices[k];
          highestIdx = k;
        }
      }
      if (highestIdx !== -1) {
        const pastRsi = this.calculateRSI(prices.slice(0, highestIdx + 1), this.rsiPeriod);
        if (pastRsi !== null && currentPrice >= highestPrice * 0.9985 && rsi < pastRsi - 2.5) {
          rsiDivergence = "BEARISH";
        }
      }
    }

    let signal: SignalType = "WAIT";
    let reason = "No crossover detected";

    const isBullishCrossover =
      fastPrevious !== null &&
      slowPrevious !== null &&
      fastCurrent !== null &&
      slowCurrent !== null &&
      fastPrevious <= slowPrevious &&
      fastCurrent > slowCurrent;

    const isBearishCrossover =
      fastPrevious !== null &&
      slowPrevious !== null &&
      fastCurrent !== null &&
      slowCurrent !== null &&
      fastPrevious >= slowPrevious &&
      fastCurrent < slowCurrent;

    const passesRsiBuy = !this.rsiFilterEnabled || (rsi !== null && rsi < this.rsiBuyThreshold);
    const passesRsiSell = !this.rsiFilterEnabled || (rsi !== null && rsi > this.rsiSellThreshold);

    if (isBullishCrossover) {
      if (passesRsiBuy) {
        if (!this.allowBuy) {
          reason = `Bullish crossover detected but BUY orders are disabled (allowBuy = false)`;
        } else {
          const slopeOk =
            !this.capitalShieldMode ||
            (fastCurrent !== null && fastPrevious !== null && fastCurrent > fastPrevious);
          if (slopeOk) {
            signal = "BUY";
            const divTag = rsiDivergence === "BULLISH" ? " [⚡ Bullish RSI Divergence Confirmed]" : "";
            const filterTag = this.rsiFilterEnabled
              ? ` & RSI (${rsi?.toFixed(1)}) < ${this.rsiBuyThreshold}`
              : " [RSI Filter: Bypassed]";
            reason = `Fast EMA (${fastCurrent?.toFixed(5)}) crossed above Slow EMA (${slowCurrent?.toFixed(5)})${filterTag}${divTag}${this.capitalShieldMode ? " [Capital Shield Verified]" : ""}`;
          } else {
            reason = `Bullish signal deferred: Waiting for upward momentum slope confirmation`;
          }
        }
      } else {
        reason = `Bullish crossover filtered out: RSI (${rsi?.toFixed(1)}) >= ${this.rsiBuyThreshold} (overbought)`;
      }
    } else if (isBearishCrossover) {
      if (passesRsiSell) {
        if (!this.allowSell) {
          reason = `Bearish crossover detected but SELL orders are disabled (allowSell = false)`;
        } else {
          const slopeOk =
            !this.capitalShieldMode ||
            (fastCurrent !== null && fastPrevious !== null && fastCurrent < fastPrevious);
          if (slopeOk) {
            signal = "SELL";
            const divTag = rsiDivergence === "BEARISH" ? " [⚡ Bearish RSI Divergence Confirmed]" : "";
            const filterTag = this.rsiFilterEnabled
              ? ` & RSI (${rsi?.toFixed(1)}) > ${this.rsiSellThreshold}`
              : " [RSI Filter: Bypassed]";
            reason = `Fast EMA (${fastCurrent?.toFixed(5)}) crossed below Slow EMA (${slowCurrent?.toFixed(5)})${filterTag}${divTag}${this.capitalShieldMode ? " [Capital Shield Verified]" : ""}`;
          } else {
            reason = `Bearish signal deferred: Waiting for downward momentum slope confirmation`;
          }
        }
      } else {
        reason = `Bearish crossover filtered out: RSI (${rsi?.toFixed(1)}) <= ${this.rsiSellThreshold} (oversold)`;
      }
    }

    return {
      signal,
      reason,
      price: prices[prices.length - 1],
      fastEMA: fastCurrent !== null ? Number(fastCurrent.toFixed(5)) : null,
      slowEMA: slowCurrent !== null ? Number(slowCurrent.toFixed(5)) : null,
      RSI: rsi !== null ? Number(rsi.toFixed(2)) : null,
      rsiDivergence,
      mode: currentMode,
      candleIndex,
    };
  }

  // Open a position (Simulated or Live Bridge)
  openPosition(
    signal: "BUY" | "SELL",
    price: number,
    stopDistance: number,
    candleTime = new Date().toISOString().substring(11, 19),
    candleIndex = 0
  ): { success: boolean; position?: Position; reason?: string } {
    if (this.paused || this.position) {
      return {
        success: false,
        reason: this.paused ? "Trading paused by risk limit" : "Position already open",
      };
    }

    if (signal === "BUY" && !this.allowBuy) {
      return {
        success: false,
        reason: "BUY orders are currently disabled (allowBuy = false)",
      };
    }

    if (signal === "SELL" && !this.allowSell) {
      return {
        success: false,
        reason: "SELL orders are currently disabled (allowSell = false)",
      };
    }

    if (
      !["BUY", "SELL"].includes(signal) ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stopDistance) ||
      stopDistance <= 0
    ) {
      return {
        success: false,
        reason: "Invalid parameters",
      };
    }

    const riskAmount = (this.balance * this.riskPercent) / 100;

    // Simplified units for simulation only
    const units = Math.round(riskAmount / stopDistance);

    const stopLossPrice =
      signal === "BUY" ? price - stopDistance : price + stopDistance;

    const takeProfitPrice =
      this.takeProfitRatio > 0
        ? signal === "BUY"
          ? price + stopDistance * this.takeProfitRatio
          : price - stopDistance * this.takeProfitRatio
        : null;

    const ticket = this.nextTicket++;

    this.position = {
      id: `pos-${ticket}`,
      ticket,
      symbol: this.symbol,
      type: signal,
      entryPrice: price,
      currentPrice: price,
      stopDistance,
      stopLossPrice: Number(stopLossPrice.toFixed(5)),
      takeProfitPrice:
        takeProfitPrice !== null ? Number(takeProfitPrice.toFixed(5)) : null,
      riskAmount: Number(riskAmount.toFixed(2)),
      units,
      entryTime: candleTime,
      entryCandleIndex: candleIndex,
      unrealizedProfit: 0,
    };

    this.addLog(
      "ORDER_OPEN",
      `Open #${ticket} ${signal} ${units.toLocaleString()} units @ ${price.toFixed(5)} (SL: ${this.position.stopLossPrice.toFixed(5)}${this.position.takeProfitPrice ? `, TP: ${this.position.takeProfitPrice.toFixed(5)}` : ""})`,
      { ticket, signal, price, units }
    );

    return {
      success: true,
      position: this.position,
    };
  }

  // Close simulated position
  closePosition(
    exitPrice: number,
    exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "OPPOSITE_SIGNAL" | "MANUAL" | "CLOSE_BY_PROFIT" = "MANUAL",
    exitTime = new Date().toISOString().substring(11, 19),
    pipMultiplier = 10000
  ): {
    success: boolean;
    trade?: Trade;
    risk?: { drawdown: number; paused: boolean };
    reason?: string;
  } {
    if (!this.position) {
      return {
        success: false,
        reason: "No open position",
      };
    }

    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      return {
        success: false,
        reason: "Invalid exit price",
      };
    }

    const p = this.position;
    const direction = p.type === "BUY" ? 1 : -1;
    const rawProfit = (exitPrice - p.entryPrice) * direction * p.units;
    const profit = Number(rawProfit.toFixed(2));
    this.balance = Number((this.balance + profit).toFixed(2));

    const priceDelta = (exitPrice - p.entryPrice) * direction;
    const pips = Number((priceDelta * pipMultiplier).toFixed(1));

    const trade: Trade = {
      id: `trd-${p.ticket}`,
      ticket: p.ticket,
      symbol: p.symbol,
      type: p.type,
      entry: p.entryPrice,
      exit: Number(exitPrice.toFixed(5)),
      stopLoss: p.stopLossPrice,
      takeProfit: p.takeProfitPrice,
      profit,
      balance: this.balance,
      units: p.units,
      entryTime: p.entryTime,
      exitTime,
      pips,
      exitReason,
    };

    this.history.push(trade);
    const closedTicket = p.ticket;
    this.position = null;

    const risk = this.checkRisk();

    this.addLog(
      "ORDER_CLOSE",
      `Closed #${closedTicket} @ ${exitPrice.toFixed(5)} [${exitReason}]: ${profit >= 0 ? "+" : ""}$${profit.toFixed(2)} (${pips > 0 ? "+" : ""}${pips} pips). Balance: $${this.balance.toFixed(2)}`,
      { ticket: closedTicket, exitPrice, profit, balance: this.balance }
    );

    return {
      success: true,
      trade,
      risk,
    };
  }

  // Check intra-bar Stop Loss and Take Profit execution
  checkPositionTriggers(candle: Candle, pipMultiplier = 10000): Trade | null {
    if (!this.position) return null;

    const p = this.position;
    // Update live mark-to-market
    const direction = p.type === "BUY" ? 1 : -1;
    p.currentPrice = candle.close;
    p.unrealizedProfit = Number(
      ((candle.close - p.entryPrice) * direction * p.units).toFixed(2)
    );

    // Autopilot Active Trade Management (Breakeven & Trailing Stop & Capital Shield)
    if (this.autopilotMode) {
      const pip = 1 / pipMultiplier;

      // 0. Close By Profit Target Lock (Autonomous Profit Taker)
      if (this.closeByProfit) {
        const profitPips = (p.type === "BUY" ? candle.close - p.entryPrice : p.entryPrice - candle.close) * pipMultiplier;
        const targetPips = this.closeProfitPipsTarget || 12;
        const targetDollar = this.closeProfitDollarTarget || 25;

        if (profitPips >= targetPips || p.unrealizedProfit >= targetDollar) {
          this.addLog(
            "ORDER_CLOSE",
            `🎯 [AUTONOMOUS CLOSE BY PROFIT] Target profit reached (+${profitPips.toFixed(1)} pips / +$${p.unrealizedProfit.toFixed(2)}) on #${p.ticket}! Securing profit.`
          );
          const res = this.closePosition(
            candle.close,
            "CLOSE_BY_PROFIT",
            candle.time,
            pipMultiplier
          );
          return res.trade ?? null;
        }
      }

      const beTrigger = this.capitalShieldMode ? 3.0 : this.breakEvenTriggerPips;
      const trailDistPips = this.capitalShieldMode ? 8.0 : this.trailingStopDistancePips;

      // 1. Breakeven Lock-in (Zero-Loss Protection)
      if (beTrigger > 0 && !p.isBreakevenLocked) {
        if (p.type === "BUY") {
          const profitPips = (candle.high - p.entryPrice) * pipMultiplier;
          if (profitPips >= beTrigger) {
            p.stopLossPrice = Number((p.entryPrice + 0.5 * pip).toFixed(5));
            p.isBreakevenLocked = true;
            this.addLog(
              "INFO",
              `🛡️ Capital Shield: #${p.ticket} secured at Breakeven+ (+0.5 pip). Downside risk eliminated!`
            );
          }
        } else {
          const profitPips = (p.entryPrice - candle.low) * pipMultiplier;
          if (profitPips >= beTrigger) {
            p.stopLossPrice = Number((p.entryPrice - 0.5 * pip).toFixed(5));
            p.isBreakevenLocked = true;
            this.addLog(
              "INFO",
              `🛡️ Capital Shield: #${p.ticket} secured at Breakeven+ (+0.5 pip). Downside risk eliminated!`
            );
          }
        }
      }

      // 2. Dynamic Smart Trailing Stop (ATR-based volatility adaptation) or Fixed Trailing Stop
      if (this.trailingStop) {
        // Track recent candles for dynamic ATR calculation
        this.recentCandles.push(candle);
        if (this.recentCandles.length > 50) {
          this.recentCandles.shift();
        }

        let dynamicTrailDist: number = trailDistPips * pip;
        let isAtrDriven = false;
        let currentAtrPips = 0;

        if (this.smartTrailingStop && this.recentCandles.length >= this.atrPeriod + 1) {
          const atr = this.calculateATR(this.recentCandles, this.atrPeriod);
          if (atr !== null && atr > 0) {
            // Dynamically scale trailing distance according to current volatility
            const atrDistance = atr * this.atrMultiplier;
            // Ensure minimum safe distance of at least 5 pips
            const minSafeDist = 5.0 * pip;
            dynamicTrailDist = Math.max(atrDistance, minSafeDist);
            isAtrDriven = true;
            currentAtrPips = Number((atr * pipMultiplier).toFixed(1));
          }
        }

        if (dynamicTrailDist > 0) {
          if (p.type === "BUY") {
            const targetSL = Number((candle.close - dynamicTrailDist).toFixed(5));
            if (targetSL > p.stopLossPrice) {
              const previousSL = p.stopLossPrice;
              p.stopLossPrice = targetSL;
              p.isTrailingActive = true;
              if (isAtrDriven && Math.abs(targetSL - previousSL) >= 2 * pip) {
                this.addLog(
                  "INFO",
                  `📈 [SMART TRAILING STOP] ATR Dynamic Volatility (${currentAtrPips} pips × ${this.atrMultiplier}x): #${p.ticket} Stop Loss secured at ${targetSL.toFixed(5)} (+${((targetSL - previousSL) * pipMultiplier).toFixed(1)} pips)`
                );
              }
            }
          } else {
            const targetSL = Number((candle.close + dynamicTrailDist).toFixed(5));
            if (targetSL < p.stopLossPrice) {
              const previousSL = p.stopLossPrice;
              p.stopLossPrice = targetSL;
              p.isTrailingActive = true;
              if (isAtrDriven && Math.abs(previousSL - targetSL) >= 2 * pip) {
                this.addLog(
                  "INFO",
                  `📈 [SMART TRAILING STOP] ATR Dynamic Volatility (${currentAtrPips} pips × ${this.atrMultiplier}x): #${p.ticket} Stop Loss secured at ${targetSL.toFixed(5)} (+${((previousSL - targetSL) * pipMultiplier).toFixed(1)} pips)`
                );
              }
            }
          }
        }
      }
    }

    // BUY position triggers
    if (p.type === "BUY") {
      // Hit Stop Loss?
      if (candle.low <= p.stopLossPrice) {
        const res = this.closePosition(
          p.stopLossPrice,
          "STOP_LOSS",
          candle.time,
          pipMultiplier
        );
        return res.trade ?? null;
      }
      // Hit Take Profit?
      if (p.takeProfitPrice !== null && candle.high >= p.takeProfitPrice) {
        const res = this.closePosition(
          p.takeProfitPrice,
          "TAKE_PROFIT",
          candle.time,
          pipMultiplier
        );
        return res.trade ?? null;
      }
    }

    // SELL position triggers
    if (p.type === "SELL") {
      // Hit Stop Loss?
      if (candle.high >= p.stopLossPrice) {
        const res = this.closePosition(
          p.stopLossPrice,
          "STOP_LOSS",
          candle.time,
          pipMultiplier
        );
        return res.trade ?? null;
      }
      // Hit Take Profit?
      if (p.takeProfitPrice !== null && candle.low <= p.takeProfitPrice) {
        const res = this.closePosition(
          p.takeProfitPrice,
          "TAKE_PROFIT",
          candle.time,
          pipMultiplier
        );
        return res.trade ?? null;
      }
    }

    return null;
  }

  addLog(
    type: BotLog["type"],
    message: string,
    details?: Record<string, any>,
    candleIndex = 0
  ) {
    const time = new Date().toTimeString().split(" ")[0];
    this.logs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time,
      candleIndex,
      type,
      message,
      details,
    });
    // Keep max 200 logs
    if (this.logs.length > 200) {
      this.logs.pop();
    }
  }

  getReport(): BotReport {
    const wins = this.history.filter((trade) => trade.profit > 0);
    const losses = this.history.filter((trade) => trade.profit < 0);

    const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
    const profitFactor =
      grossLoss === 0
        ? grossProfit > 0
          ? 999
          : 0
        : Number((grossProfit / grossLoss).toFixed(2));

    const totalTrades = this.history.length;
    const winRate =
      totalTrades > 0 ? Number(((wins.length / totalTrades) * 100).toFixed(1)) : 0;
    const netProfit = Number((this.balance - this.initialBalance).toFixed(2));
    const returnPercent = Number(
      ((netProfit / this.initialBalance) * 100).toFixed(2)
    );

    const risk = this.checkRisk();

    return {
      mode: this.simulationMode
        ? "SIMULATION (LOCAL TESTING)"
        : `REAL MT5 EXECUTION (Simulation: FALSE · Buy: ${this.allowBuy ? "TRUE" : "FALSE"} · Sell: ${this.allowSell ? "TRUE" : "FALSE"})`,
      initialBalance: this.initialBalance,
      currentBalance: Number(this.balance.toFixed(2)),
      peakBalance: Number(this.peakBalance.toFixed(2)),
      totalTrades,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate,
      profitFactor,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      netProfit,
      returnPercent,
      maxRecordedDrawdown: this.maxRecordedDrawdown,
      currentDrawdown: risk.drawdown,
      paused: this.paused,
      history: this.history,
    };
  }
}
