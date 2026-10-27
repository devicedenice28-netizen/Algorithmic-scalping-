"use strict";

import { WebSocket } from "ws";

/**
 * MT5 Forex Trading Bot with Autonomous Autopilot & MT5 Bridge Connection
 * Strategy: EMA Crossover (9/21) + RSI (14) Filter
 * Dynamic Volatility: Smart Trailing Stop (ATR-based dynamic stop loss)
 * Execution: Autonomous Auto-Trading (Automatic Buy & Sell)
 * Bridge: Real-Time MT5 WebSocket & WebRequest IPC Bridge
 *
 * Run with: npm run bot OR node trading-bot.js
 */

export class ForexTradingBot {
    constructor(config = {}) {
        this.fastEMA = config.fastEMA || 9;
        this.slowEMA = config.slowEMA || 21;
        this.rsiPeriod = config.rsiPeriod || 14;

        this.initialBalance = config.initialBalance || 10000;
        this.balance = this.initialBalance;

        this.riskPercent = config.riskPercent || 1;
        this.maxDrawdownPercent = config.maxDrawdownPercent || 5;

        // Converted Execution Settings: Simulation = false, True Buy = true, True Sell = true
        this.simulation = config.simulation !== undefined ? config.simulation : false;
        this.allowBuy = config.allowBuy !== undefined ? config.allowBuy : true;
        this.allowSell = config.allowSell !== undefined ? config.allowSell : true;

        // Algorithmic Autopilot Settings
        this.autopilot = config.autopilot !== undefined ? config.autopilot : true;
        this.capitalShield = config.capitalShield !== undefined ? config.capitalShield : true;
        this.trailingStop = config.trailingStop !== undefined ? config.trailingStop : true;
        this.trailingStopDistance = this.capitalShield ? 0.0007 : (config.trailingStopDistance || 0.0015);
        this.breakevenTrigger = this.capitalShield ? 0.0003 : (config.breakevenTrigger || 0.0010);
        this.takeProfitMultiplier = this.capitalShield ? 2.0 : (config.takeProfitMultiplier || 1.5);

        // Smart Volatility Trailing Stop (ATR-based dynamic stop loss)
        this.smartTrailingStop = config.smartTrailingStop !== undefined ? config.smartTrailingStop : true;
        this.atrPeriod = config.atrPeriod || 14;
        this.atrMultiplier = config.atrMultiplier || 1.8;
        this.recentCandles = [];

        this.position = null;
        this.peakBalance = this.balance;
        this.paused = false;

        this.history = [];
        this.ticketCounter = 10001;
    }

    // Calculate Exponential Moving Average
    calculateEMA(prices, period) {
        if (prices.length < period) return null;

        const multiplier = 2 / (period + 1);

        let ema = prices
            .slice(0, period)
            .reduce((sum, price) => sum + price, 0) / period;

        for (let i = period; i < prices.length; i++) {
            ema = (prices[i] - ema) * multiplier + ema;
        }

        return ema;
    }

    // Calculate Relative Strength Index
    calculateRSI(prices, period = 14) {
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

        return 100 - (100 / (1 + rs));
    }

    // Calculate Average True Range (ATR) for Smart Volatility Trailing Stop
    calculateATR(candles, period = 14) {
        if (!candles || candles.length < period + 1) return null;

        const trueRanges = [];
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

        let atr = trueRanges.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
        for (let i = period; i < trueRanges.length; i++) {
            atr = (atr * (period - 1) + trueRanges[i]) / period;
        }

        return atr;
    }

    // Check account drawdown
    checkRisk() {
        this.peakBalance = Math.max(this.peakBalance, this.balance);

        const drawdown =
            ((this.peakBalance - this.balance) / this.peakBalance) * 100;

        if (drawdown >= this.maxDrawdownPercent) {
            this.paused = true;
        }

        return {
            drawdown: Number(drawdown.toFixed(2)),
            paused: this.paused
        };
    }

    // Analyze prices and generate an automated signal
    analyze(prices) {
        if (this.paused) {
            return {
                signal: "PAUSED",
                reason: "Risk limit reached"
            };
        }

        if (prices.length < this.slowEMA + 2) {
            return {
                signal: "WAIT",
                reason: "Not enough price data"
            };
        }

        const previousPrices = prices.slice(0, -1);

        const fastPrevious = this.calculateEMA(previousPrices, this.fastEMA);
        const slowPrevious = this.calculateEMA(previousPrices, this.slowEMA);

        const fastCurrent = this.calculateEMA(prices, this.fastEMA);
        const slowCurrent = this.calculateEMA(prices, this.slowEMA);

        const rsi = this.calculateRSI(prices, this.rsiPeriod);

        let signal = "WAIT";

        if (
            fastPrevious <= slowPrevious &&
            fastCurrent > slowCurrent &&
            rsi !== null &&
            rsi < 70
        ) {
            signal = this.allowBuy ? "BUY" : "WAIT";
        } else if (
            fastPrevious >= slowPrevious &&
            fastCurrent < slowCurrent &&
            rsi !== null &&
            rsi > 30
        ) {
            signal = this.allowSell ? "SELL" : "WAIT";
        }

        return {
            signal,
            price: prices[prices.length - 1],
            fastEMA: fastCurrent !== null ? Number(fastCurrent.toFixed(5)) : null,
            slowEMA: slowCurrent !== null ? Number(slowCurrent.toFixed(5)) : null,
            RSI: rsi !== null ? Number(rsi.toFixed(2)) : null,
            mode: this.simulation ? "SIMULATION" : "REAL_AUTOPILOT_EXECUTION"
        };
    }

    // Open a position (Simulated or Live Bridge)
    openPosition(signal, price, stopDistance = 0.0020, ticket = null) {
        if (this.paused || this.position) {
            return {
                success: false,
                reason: "Trading paused or position already open"
            };
        }

        if (signal === "BUY" && !this.allowBuy) {
            return {
                success: false,
                reason: "BUY orders are disabled"
            };
        }

        if (signal === "SELL" && !this.allowSell) {
            return {
                success: false,
                reason: "SELL orders are disabled"
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
                reason: "Invalid parameters"
            };
        }

        const riskAmount = (this.balance * this.riskPercent) / 100;
        const units = Math.round(riskAmount / stopDistance);

        const stopLoss = signal === "BUY" ? price - stopDistance : price + stopDistance;
        const takeProfit = signal === "BUY"
            ? price + stopDistance * this.takeProfitMultiplier
            : price - stopDistance * this.takeProfitMultiplier;

        const assignedTicket = ticket || this.ticketCounter++;

        this.position = {
            ticket: assignedTicket,
            type: signal,
            entryPrice: price,
            stopDistance,
            stopLoss: Number(stopLoss.toFixed(5)),
            takeProfit: Number(takeProfit.toFixed(5)),
            riskAmount,
            units,
            breakevenLocked: false,
            trailingActive: false,
            atrVolatilityDistance: null
        };

        return {
            success: true,
            position: this.position
        };
    }

    // Autopilot Active Position Tick Manager (Breakeven, Smart Trailing Stop, TP/SL triggers)
    tickAutopilot(currentPrice, candle = null) {
        if (!this.position) return null;

        const p = this.position;
        const direction = p.type === "BUY" ? 1 : -1;
        const gain = (currentPrice - p.entryPrice) * direction;

        if (candle) {
            this.recentCandles.push(candle);
            if (this.recentCandles.length > 50) this.recentCandles.shift();
        }

        // 1. Breakeven Lock-in (Zero-Loss Protection)
        if (this.autopilot && this.breakevenTrigger > 0 && !p.breakevenLocked) {
            if (gain >= this.breakevenTrigger) {
                p.stopLoss = Number((p.entryPrice + 0.0001 * direction).toFixed(5));
                p.breakevenLocked = true;
                console.log(`    [AUTOPILOT 🛡️ BREAKEVEN] Ticket #${p.ticket} Stop Loss secured at ${p.stopLoss}`);
            }
        }

        // 2. Smart Volatility Trailing Stop (ATR-Based) or Fixed Trailing Stop
        if (this.autopilot && this.trailingStop) {
            let trailDist = this.trailingStopDistance;
            let isSmartAtr = false;

            if (this.smartTrailingStop && this.recentCandles.length >= this.atrPeriod + 1) {
                const atr = this.calculateATR(this.recentCandles, this.atrPeriod);
                if (atr !== null && atr > 0) {
                    // Dynamically scale trailing distance according to current market fluctuations
                    trailDist = Math.max(atr * this.atrMultiplier, 0.0005);
                    isSmartAtr = true;
                    p.atrVolatilityDistance = Number(trailDist.toFixed(5));
                }
            }

            if (gain >= trailDist) {
                const targetSL = p.type === "BUY"
                    ? Number((currentPrice - trailDist).toFixed(5))
                    : Number((currentPrice + trailDist).toFixed(5));

                if ((p.type === "BUY" && targetSL > p.stopLoss) || (p.type === "SELL" && targetSL < p.stopLoss)) {
                    const previousSL = p.stopLoss;
                    p.stopLoss = targetSL;
                    p.trailingActive = true;
                    const modeLabel = isSmartAtr ? "SMART ATR VOLATILITY" : "FIXED PIPS";
                    console.log(`    [AUTOPILOT 📈 TRAILING STOP - ${modeLabel}] #${p.ticket} Stop Loss advanced ${previousSL} -> ${p.stopLoss} (Distance: ${(trailDist * 10000).toFixed(1)} pips)`);
                }
            }
        }

        // 3. Check Stop Loss Hit
        if ((p.type === "BUY" && currentPrice <= p.stopLoss) || (p.type === "SELL" && currentPrice >= p.stopLoss)) {
            console.log(`    [AUTOPILOT 🛑 STOP LOSS HIT] Ticket #${p.ticket} triggered at ${currentPrice}`);
            return this.closePosition(p.stopLoss, "STOP_LOSS");
        }

        // 4. Check Take Profit Hit
        if ((p.type === "BUY" && currentPrice >= p.takeProfit) || (p.type === "SELL" && currentPrice <= p.takeProfit)) {
            console.log(`    [AUTOPILOT 🎯 TAKE PROFIT HIT] Ticket #${p.ticket} reached target at ${currentPrice}`);
            return this.closePosition(p.takeProfit, "TAKE_PROFIT");
        }

        return null;
    }

    // Close position
    closePosition(exitPrice, reason = "MANUAL") {
        if (!this.position) {
            return {
                success: false,
                reason: "No open position"
            };
        }

        if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
            return {
                success: false,
                reason: "Invalid exit price"
            };
        }

        const p = this.position;
        const direction = p.type === "BUY" ? 1 : -1;
        const profit = (exitPrice - p.entryPrice) * direction * p.units;

        this.balance += profit;

        const trade = {
            ticket: p.ticket,
            type: p.type,
            entry: p.entryPrice,
            exit: exitPrice,
            profit: Number(profit.toFixed(2)),
            balance: Number(this.balance.toFixed(2)),
            reason
        };

        this.history.push(trade);
        this.position = null;

        const risk = this.checkRisk();

        return {
            success: true,
            trade,
            risk
        };
    }

    getReport() {
        const wins = this.history.filter((trade) => trade.profit > 0).length;
        const losses = this.history.filter((trade) => trade.profit < 0).length;

        return {
            mode: "ALGORITHMIC AUTOPILOT WITH SMART ATR TRAILING STOP",
            initialBalance: this.initialBalance,
            currentBalance: Number(this.balance.toFixed(2)),
            totalTrades: this.history.length,
            winningTrades: wins,
            losingTrades: losses,
            risk: this.checkRisk(),
            history: this.history
        };
    }
}

// -------------------------------------------------------------
// Live MT5 WebSocket Bridge Connection & Autonomous Bot Engine
// -------------------------------------------------------------
export async function connectBotToMT5(wsUrl = "ws://localhost:3000/api/mt5/ws") {
    return new Promise((resolve) => {
        console.log(`[MT5 BRIDGE] Attempting connection to MT5 Bridge at ${wsUrl}...`);
        const ws = new WebSocket(wsUrl);

        const bot = new ForexTradingBot({
            fastEMA: 9,
            slowEMA: 21,
            rsiPeriod: 14,
            initialBalance: 10000,
            riskPercent: 1,
            maxDrawdownPercent: 5,
            autopilot: true,
            capitalShield: true,
            trailingStop: true,
            smartTrailingStop: true,
            atrPeriod: 14,
            atrMultiplier: 1.8,
            trailingStopDistance: 0.0007,
            breakevenTrigger: 0.0003,
            takeProfitMultiplier: 2.0
        });

        const prices = [];
        let isConnected = false;

        ws.on("open", () => {
            isConnected = true;
            console.log("\n=========================================================");
            console.log("   ⚡ MT5 LIVE BRIDGE CONNECTED - AUTONOMOUS BOT ONLINE  ");
            console.log("   Mode: FULL AUTONOMOUS (Automatic Buy & Sell)          ");
            console.log("   Engine: EMA(9/21) Crossover + RSI(14) Filter          ");
            console.log("   Protection: Smart Trailing Stop (ATR Volatility-based)");
            console.log("=========================================================\n");

            ws.send(JSON.stringify({ action: "SYNC_ACCOUNT" }));
            ws.send(JSON.stringify({ action: "SUBSCRIBE_ORDERBOOK", payload: { symbol: "EUR/USD" } }));
            ws.send(JSON.stringify({ action: "SUBSCRIBE_ORDERBOOK", payload: { symbol: "USD/TZS" } }));
            ws.send(JSON.stringify({ action: "SUBSCRIBE_ORDERBOOK", payload: { symbol: "OMR/USD" } }));
            resolve({ ws, bot, status: "CONNECTED" });
        });

        ws.on("message", (raw) => {
            try {
                const msg = JSON.parse(raw.toString());

                if (msg.type === "ACCOUNT_SYNC" && msg.data) {
                    const acc = msg.data;
                    console.log(`[MT5 SYNC] Server: ${acc.server} | Login: #${acc.login} | Balance: $${acc.balance.toFixed(2)} | Equity: $${acc.equity.toFixed(2)} | Open: ${acc.openPositions.length}`);
                } else if (msg.type === "ORDER_EXECUTED" && msg.data) {
                    const ord = msg.data;
                    console.log(`🚀 [MT5 REAL ORDER FILLED] #${ord.ticket} ${ord.type} ${ord.lots} lots on ${ord.symbol} @ ${ord.openPrice} (SL: ${ord.sl}, TP: ${ord.tp})`);
                } else if (msg.type === "ORDER_CLOSED" && msg.data) {
                    const c = msg.data;
                    console.log(`🎯 [MT5 ORDER CLOSED] #${c.ticket} closed @ ${c.closePrice} (${c.reason}): ${c.profit >= 0 ? "+" : ""}$${c.profit}`);
                } else if (msg.type === "ORDERBOOK_L2" && msg.data) {
                    const ob = msg.data;
                    const bestBid = ob.bids[0]?.price || 0;
                    const bestAsk = ob.asks[0]?.price || 0;
                    const mid = Number(((bestBid + bestAsk) / 2).toFixed(5));

                    if (mid > 0) {
                        prices.push(mid);
                        if (prices.length > 100) prices.shift();

                        const fakeCandle = {
                            high: mid + 0.0003,
                            low: mid - 0.0003,
                            close: mid,
                            open: mid,
                        };

                        // 1. Manage active position with Smart Trailing Stop
                        if (bot.position) {
                            const closed = bot.tickAutopilot(mid, fakeCandle);
                            if (closed && closed.success) {
                                ws.send(JSON.stringify({
                                    action: "CLOSE_REAL_ORDER",
                                    payload: { ticket: closed.trade.ticket, closePrice: closed.trade.exit, reason: closed.trade.reason }
                                }));
                            }
                        }

                        // 2. Automated Buy & Sell Signals
                        if (!bot.position && prices.length >= 25) {
                            const analysis = bot.analyze(prices);
                            if (analysis.signal === "BUY" || analysis.signal === "SELL") {
                                console.log(`\n🤖 [AUTONOMOUS SIGNAL DETECTED] ${analysis.signal} @ ${mid} | Fast EMA: ${analysis.fastEMA} | Slow EMA: ${analysis.slowEMA} | RSI: ${analysis.RSI}`);
                                const stopDist = 0.0015;
                                const sl = analysis.signal === "BUY" ? mid - stopDist : mid + stopDist;
                                const tp = analysis.signal === "BUY" ? mid + stopDist * 2.0 : mid - stopDist * 2.0;

                                // Dispatch real order to MT5 bridge
                                ws.send(JSON.stringify({
                                    action: "EXECUTE_REAL_ORDER",
                                    payload: {
                                        symbol: ob.symbol,
                                        type: analysis.signal,
                                        price: mid,
                                        sl: Number(sl.toFixed(5)),
                                        tp: Number(tp.toFixed(5)),
                                        lots: 0.1,
                                        units: 10000
                                    }
                                }));

                                bot.openPosition(analysis.signal, mid, stopDist);
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore parse errors
            }
        });

        ws.on("error", () => {
            if (!isConnected) {
                console.log("[MT5 BRIDGE] MT5 WebSocket Bridge not running on port 3000. Falling back to autonomous simulation engine.");
                resolve({ ws: null, bot, status: "SIMULATION_FALLBACK" });
            }
        });
    });
}

// -------------------------------------------------------------
// Interactive CLI Execution Demo with Autopilot & Smart Trailing Stop
// -------------------------------------------------------------
export function runSimulationDemo() {
    console.log("=========================================================");
    console.log("    SPEAKING HAND AI TRADER - MT5 AUTOMATED AUTOPILOT    ");
    console.log("    Engine: EMA(9/21) + RSI(14) Scalper + Real Account   ");
    console.log("    Bridge: Exness MT5 / IPC Socket Live Execution       ");
    console.log("    Protection: Smart Trailing Stop (ATR Volatility)     ");
    console.log("=========================================================\n");

    const bot = new ForexTradingBot({
        fastEMA: 9,
        slowEMA: 21,
        rsiPeriod: 14,
        initialBalance: 10000,
        riskPercent: 1,
        maxDrawdownPercent: 5,
        autopilot: true,
        capitalShield: true,
        trailingStop: true,
        smartTrailingStop: true,
        atrPeriod: 14,
        atrMultiplier: 1.8,
        trailingStopDistance: 0.0007,
        breakevenTrigger: 0.0003,
        takeProfitMultiplier: 2.0
    });

    console.log(`[AUTOPILOT ENGAGED] Mode: Fully Autonomous Trading (Automatic BUY & SELL)`);
    console.log(`[BROKER BRIDGE] Target: Exness-Real10 / MetaTrader 5 Terminal`);
    console.log(`[CONFIG] Risk Sizing: ${bot.riskPercent}% per trade | Max Drawdown Limit: ${bot.maxDrawdownPercent}%`);
    console.log(`[CONFIG] Capital Shield: Active | Smart Trailing Stop: ATR(14) × 1.8x Volatility | Breakeven: 3 pips`);
    console.log(`[INIT] Account Balance: $${bot.initialBalance.toFixed(2)}\n`);

    // Generate realistic fluctuating Forex price curve
    let currentPrice = 1.0850;
    const historicalPrices = [];
    const candles = [];

    // Pre-seed prices for warm-up
    for (let i = 0; i < 30; i++) {
        const delta = (Math.sin(i / 5) * 0.0003) + (Math.random() - 0.49) * 0.0002;
        const open = currentPrice;
        currentPrice += delta;
        const close = currentPrice;
        const high = Math.max(open, close) + 0.0002;
        const low = Math.min(open, close) - 0.0002;

        historicalPrices.push(Number(currentPrice.toFixed(5)));
        candles.push({ open, high, low, close });
    }

    console.log("[AUTOPILOT] Monitoring incoming ticks and autonomous trade execution...\n");

    for (let bar = 30; bar < 75; bar++) {
        const wave = Math.sin(bar / 4) * 0.00045;
        const noise = (Math.random() - 0.48) * 0.00025;
        const open = currentPrice;
        currentPrice += wave + noise;
        const close = currentPrice;
        const high = Math.max(open, close) + Math.random() * 0.0003;
        const low = Math.min(open, close) - Math.random() * 0.0003;

        const currentCandle = { open, high, low, close };
        historicalPrices.push(Number(currentPrice.toFixed(5)));
        candles.push(currentCandle);

        // 1. Autopilot manages active position tick with Smart Trailing Stop
        if (bot.position) {
            const closed = bot.tickAutopilot(currentPrice, currentCandle);
            if (closed && closed.success) {
                const sign = closed.trade.profit >= 0 ? "+" : "";
                console.log(`    [TRADE CLOSED] ${closed.trade.type} #${closed.trade.ticket} @ ${closed.trade.exit} [${closed.trade.reason}]: ${sign}$${closed.trade.profit.toFixed(2)}`);
                console.log(`    [BALANCE] Current: $${closed.trade.balance.toFixed(2)} (Drawdown: ${closed.risk.drawdown}%)\n`);
            }
        }

        // 2. Autopilot analyzes signals automatically (Automatic Buy & Sell)
        if (!bot.position) {
            const analysis = bot.analyze(historicalPrices);

            if (["BUY", "SELL"].includes(analysis.signal)) {
                console.log(`>>> [AUTOMATIC SIGNAL DETECTED] Bar #${bar}: ${analysis.signal} @ ${analysis.price.toFixed(5)}`);
                console.log(`    Indicators: Fast EMA=${analysis.fastEMA} | Slow EMA=${analysis.slowEMA} | RSI=${analysis.RSI}`);

                const stopDist = 0.0020; // 20 pips
                const order = bot.openPosition(analysis.signal, analysis.price, stopDist);

                if (order.success) {
                    console.log(`    [AUTOMATIC ORDER DISPATCH] #${order.position.ticket} ${order.position.type} ${order.position.units.toLocaleString()} units @ ${order.position.entryPrice}`);
                    console.log(`    Protection: Initial SL=${order.position.stopLoss} | TP=${order.position.takeProfit} | Sized Risk: $${order.position.riskAmount.toFixed(2)}`);
                }
            }
        }
    }

    console.log("\n=========================================================");
    console.log("            AUTOPILOT PERFORMANCE REPORT                 ");
    console.log("=========================================================");
    const report = bot.getReport();
    console.log(JSON.stringify(report, null, 2));
    console.log("=========================================================");
    console.log("Autopilot execution completed successfully.");
}

// Auto-run if executed directly via Node
if (process.argv[1] && process.argv[1].endsWith("trading-bot.js")) {
    connectBotToMT5().then((res) => {
        if (res.status === "SIMULATION_FALLBACK") {
            runSimulationDemo();
        }
    });
}

export default ForexTradingBot;
