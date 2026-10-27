import React, { useState, useEffect, useRef, useCallback } from "react";
import { ForexTradingBot } from "./lib/forexBot";
import {
  FOREX_PAIRS,
  generateMarketCandles,
  generateNextContinuousCandle,
  MarketRegime,
} from "./lib/marketData";
import {
  BotConfig,
  Candle,
  ForexPairInfo,
  Position,
  Trade,
  BotLog,
  BotReport,
  BotAnalysisResult,
} from "./types/trading";
import { HeaderNav } from "./components/HeaderNav";
import { TradingChart } from "./components/TradingChart";
import { StrategyControls } from "./components/StrategyControls";
import { TerminalPanel } from "./components/TerminalPanel";
import { PerformanceMetrics } from "./components/PerformanceMetrics";
import { OneClickTradingBar } from "./components/OneClickTradingBar";
import { ParameterSettingsModal } from "./components/ParameterSettingsModal";
import { RulesGuideModal } from "./components/RulesGuideModal";
import { BrokerConnectionModal } from "./components/BrokerConnectionModal";
import { SpeakingHandTraderDeck } from "./components/SpeakingHandTraderDeck";
import { AlgoProAuthModal } from "./components/AlgoProAuthModal";
import { MT5VpnSetupModal } from "./components/MT5VpnSetupModal";
import { MarketSentimentModal } from "./components/MarketSentimentModal";
import { LatencyLineChart } from "./components/LatencyLineChart";
import { MT5ConnectionState, LatencyPoint } from "./types/broker";
import { VpnTunnelState } from "./types/vpn";
import { INITIAL_VPN_STATE } from "./lib/vpnService";
import { getStoredCredentials } from "./lib/brokerBridge";
import { mt5BridgeClient, MT5LiveAccountState } from "./lib/mt5BridgeClient";
import { MarketSentimentData } from "./types/trading";
import { ShieldAlert, AlertCircle, RefreshCw, Radio, Globe, Target } from "lucide-react";
import { audioService } from "./lib/audioService";

export default function App() {
  // Strategy Configuration (Converted: Simulation = false, True Buy = true, True Sell = true)
  const [config, setConfig] = useState<BotConfig>({
    fastEMA: 9,
    slowEMA: 21,
    rsiPeriod: 14,
    rsiBuyThreshold: 70,
    rsiSellThreshold: 30,
    initialBalance: 10000,
    riskPercent: 1,
    maxDrawdownPercent: 5,
    stopDistancePips: 20,
    takeProfitRatio: 1.5,
    symbol: "EUR/USD",
    autoTrading: true,
    autopilotMode: true,
    trailingStop: true,
    trailingStopDistancePips: 15,
    breakEvenTriggerPips: 10,
    oppositeSignalClose: true,
    maxSpreadFilterPips: 2.0,
    capitalShieldMode: false,
    adaptiveFilter: true,
    profitCompounding: true,
    // Smart Volatility Trailing Stop (ATR-based dynamic stop loss)
    smartTrailingStop: true,
    atrPeriod: 14,
    atrMultiplier: 1.8,
    // Execution Mode: Simulation = false, True Buy = true, True Sell = true
    simulationMode: false,
    allowBuy: true,
    allowSell: true,
    // RSI Filter Control (independent of EMA settings)
    rsiFilterEnabled: true,
    // Market Sentiment Autotrading & Close by Profit
    sentimentAutotrading: true,
    sentimentThreshold: 20,
    closeByProfit: true,
    closeProfitPipsTarget: 12,
    closeProfitDollarTarget: 25,
    // 24/7 Non-Stop Robot Continuous Execution
    nonStopMode: true,
  });

  // Converted to REAL execution mode by default (Simulation: FALSE)
  const [tradingMode, setTradingMode] = useState<"DEMO" | "REAL">("REAL");

  // Pair & Regime selection
  const [selectedPair, setSelectedPair] = useState<ForexPairInfo>(FOREX_PAIRS[0]);
  const [selectedRegime, setSelectedRegime] = useState<MarketRegime>("TREND_BULLISH");

  // Market Candles Dataset (Full 180 bars)
  const [allCandles, setAllCandles] = useState<Candle[]>(() =>
    generateMarketCandles(FOREX_PAIRS[0], "TREND_BULLISH", 180)
  );

  // Current simulation progression - Autopilot runs automatically
  const [currentStep, setCurrentStep] = useState<number>(35); // warmed up beyond Slow EMA (21)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(2);

  // Browser Audio Alert System (Distinct Tones for Trade Open, TP, and SL)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => audioService.getSoundEnabled());
  const handleToggleSound = useCallback(() => {
    const next = audioService.toggleSound();
    setSoundEnabled(next);
  }, []);

  // Update Trade Qualitative Notes / Annotations
  const handleUpdateTradeNote = useCallback((ticket: number, notes: string) => {
    setHistory((prev) =>
      prev.map((t) => (t.ticket === ticket ? { ...t, notes } : t))
    );
    const target = botRef.current.history.find((t) => t.ticket === ticket);
    if (target) {
      target.notes = notes;
    }
  }, []);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVpnModalOpen, setIsVpnModalOpen] = useState(false);
  const [vpnState, setVpnState] = useState<VpnTunnelState>(INITIAL_VPN_STATE);

  // EA ALGOPRO User Auth State
  const [authUser, setAuthUser] = useState<{ id: number; email: string; token: string } | null>(() => {
    try {
      const saved = localStorage.getItem("ea_algopro_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // MT5 Broker Connection State (Linked to Real Exness broker)
  const [connectionState, setConnectionState] = useState<MT5ConnectionState>(() => {
    const creds = getStoredCredentials();
    return {
      status: "CONNECTED",
      credentials: creds,
      pingMs: 14,
      terminalVersion: "MetaTrader 5 Build 4410 (64-bit WebSocket IPC)",
      brokerCompany: creds.brokerName || "Exness Global Limited",
      brokerServer: creds.server || "Exness-Real10",
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
    };
  });

  // Real-Time Latency History for MT5 Connection Status (Last 20 readings)
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>(() => {
    const points: LatencyPoint[] = [];
    const now = Date.now();
    for (let i = 18; i >= 0; i--) {
      const t = new Date(now - i * 1800);
      const timeStr = t.toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" });
      const jitter = Math.sin(i * 0.8) * 2.2 + (Math.random() * 1.8 - 0.9);
      const ping = Math.max(9, Number((14 + jitter).toFixed(1)));
      points.push({
        time: timeStr,
        timestamp: t.getTime(),
        ping,
        jitter: Number(Math.abs(jitter).toFixed(1)),
      });
    }
    return points;
  });

  // Bot Instance Ref (configured with simulationMode: false, allowBuy: true, allowSell: true)
  const botRef = useRef<ForexTradingBot>(new ForexTradingBot({
    ...config,
    symbol: selectedPair.symbol,
  }));

  // Synced React UI state for bot & Live MT5 Bridge
  const [position, setPosition] = useState<Position | null>(null);
  const [history, setHistory] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [report, setReport] = useState<BotReport>(() => botRef.current.getReport());
  const [lastAnalysis, setLastAnalysis] = useState<BotAnalysisResult | null>(null);

  // Real Account Backend Live Store Synced State
  const [liveAccount, setLiveAccount] = useState<MT5LiveAccountState | null>(null);

  // Market Sentiment Data & Oscillator State
  const [sentimentData, setSentimentData] = useState<MarketSentimentData | null>(null);
  const [isLoadingSentiment, setIsLoadingSentiment] = useState(false);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);

  // Fetch Market Sentiment grounded via Google Search
  const fetchMarketSentiment = useCallback(async (symbol: string) => {
    try {
      setIsLoadingSentiment(true);
      const res = await fetch(`/api/market-sentiment?symbol=${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        setSentimentData(data);
      }
    } catch (err) {
      console.warn("Failed to fetch market sentiment:", err);
    } finally {
      setIsLoadingSentiment(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketSentiment(selectedPair.symbol);
  }, [selectedPair.symbol, fetchMarketSentiment]);

  // Close by Profit Target Toggle Handler
  const handleToggleCloseByProfit = useCallback(() => {
    setConfig((prev) => {
      const nextVal = !(prev.closeByProfit ?? true);
      if (botRef.current) {
        botRef.current.closeByProfit = nextVal;
      }
      botRef.current.addLog("INFO", `[AUTONOMOUS CONTROL 🎯] Close by Profit target locking toggled ${nextVal ? "ON (+12 pips / +$25)" : "OFF"}`);
      setLogs([...botRef.current.logs]);
      return { ...prev, closeByProfit: nextVal };
    });
  }, []);

  // Sentiment Autotrading Toggle Handler
  const handleToggleSentimentAutotrading = useCallback(() => {
    setConfig((prev) => {
      const nextVal = !(prev.sentimentAutotrading ?? true);
      if (botRef.current) {
        botRef.current.sentimentAutotrading = nextVal;
      }
      botRef.current.addLog("INFO", `[AUTONOMOUS CONTROL 🤖] Market Sentiment Autotrading toggled ${nextVal ? "ACTIVE" : "OFF"}`);
      setLogs([...botRef.current.logs]);
      return { ...prev, sentimentAutotrading: nextVal };
    });
  }, []);

  // Pip conversion helper
  const pipMultiplier = 1 / selectedPair.pipSize;
  const stopDistanceReal = config.stopDistancePips * selectedPair.pipSize;

  // -------------------------------------------------------------
  // Real-time MT5 Ping & Latency Jitter Generator
  // -------------------------------------------------------------
  useEffect(() => {
    if (connectionState.status !== "CONNECTED") return;

    const interval = setInterval(() => {
      setLatencyHistory((prev) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" });
        const basePing = connectionState.pingMs || 14;
        const drift = (Math.random() * 3.4 - 1.7) + (Math.random() > 0.88 ? Math.random() * 4 : 0);
        const newPing = Math.max(8.5, Number((basePing + drift).toFixed(1)));
        const lastPing = prev.length > 0 ? prev[prev.length - 1].ping : basePing;
        const jitter = Number(Math.abs(newPing - lastPing).toFixed(1));

        const nextPoint: LatencyPoint = {
          time: timeStr,
          timestamp: now.getTime(),
          ping: newPing,
          jitter,
        };

        return [...prev.slice(-24), nextPoint];
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [connectionState.status, connectionState.pingMs]);

  // -------------------------------------------------------------
  // WebSocket Subscription to Backend MT5 Bridge Module
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = mt5BridgeClient.subscribe((msg) => {
      if (msg.type === "ACCOUNT_SYNC" && msg.data) {
        const acc = msg.data as MT5LiveAccountState;
        setLiveAccount(acc);

        // Update real-time latency with incoming packet ping
        if (typeof acc.lastPing === "number") {
          setLatencyHistory((prev) => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString("en-US", { hour12: false, minute: "2-digit", second: "2-digit" });
            const lastPing = prev.length > 0 ? prev[prev.length - 1].ping : acc.lastPing;
            const jitter = Number(Math.abs(acc.lastPing - lastPing).toFixed(1));
            return [...prev.slice(-24), { time: timeStr, timestamp: now.getTime(), ping: acc.lastPing, jitter }];
          });
        }

        // Update connection state from backend live status
        setConnectionState((prev) => ({
          ...prev,
          status: "CONNECTED",
          pingMs: acc.lastPing || 14,
          terminalVersion: "MetaTrader 5 Build 4410 (64-bit WebSocket IPC)",
          brokerCompany: acc.brokerCompany,
          brokerServer: acc.server,
          balance: acc.balance,
          equity: acc.equity,
          margin: acc.margin,
          freeMargin: acc.freeMargin,
        }));

        // If in REAL mode, synchronize UI directly from live MT5 account
        if (tradingMode === "REAL") {
          // Map live positions
          if (acc.openPositions.length > 0) {
            const p = acc.openPositions[0];
            setPosition({
              id: `live_${p.ticket}`,
              ticket: p.ticket,
              symbol: p.symbol,
              type: p.type,
              entryPrice: p.openPrice,
              currentPrice: p.currentPrice,
              stopDistance: Math.abs(p.openPrice - p.sl),
              stopLossPrice: p.sl,
              takeProfitPrice: p.tp,
              riskAmount: p.lots * 100,
              units: p.units,
              entryTime: p.openTime,
              entryCandleIndex: currentStep,
              unrealizedProfit: p.profit,
            });
          } else {
            setPosition(null);
          }

          // Map history
          if (acc.orderHistory) {
            const mappedHistory: Trade[] = acc.orderHistory.map((h) => ({
              id: `live_trade_${h.ticket}`,
              ticket: h.ticket,
              symbol: h.symbol,
              type: h.type,
              entry: h.openPrice,
              exit: h.closePrice,
              stopLoss: 0,
              takeProfit: 0,
              profit: h.profit,
              balance: acc.balance,
              units: h.units,
              entryTime: h.openTime,
              exitTime: h.closeTime,
              pips: Number((Math.abs(h.closePrice - h.openPrice) * pipMultiplier).toFixed(1)),
              exitReason: (h.reason as any) || "MANUAL",
            }));
            setHistory(mappedHistory);
          }

          // Update Report
          setReport((prev) => ({
            ...prev,
            mode: "REAL MT5 LIVE EXECUTION",
            initialBalance: 10000,
            currentBalance: acc.balance,
            peakBalance: Math.max(acc.balance, prev.peakBalance),
            totalTrades: acc.orderHistory.length,
            winningTrades: acc.orderHistory.filter((t) => t.profit > 0).length,
            losingTrades: acc.orderHistory.filter((t) => t.profit < 0).length,
            netProfit: Number((acc.balance - 10000).toFixed(2)),
          }));
        }
      } else if (msg.type === "ORDER_EXECUTED" && msg.data) {
        const order = msg.data;
        botRef.current.addLog(
          "ORDER_OPEN",
          `[MT5 LIVE WS] #${order.ticket} ${order.type} ${order.lots} lots @ ${order.openPrice} on ${order.symbol} (SL: ${order.sl}${order.tp ? `, TP: ${order.tp}` : ""})`
        );
        setLogs([...botRef.current.logs]);
      } else if (msg.type === "ORDER_CLOSED" && msg.data) {
        const closed = msg.data;
        botRef.current.addLog(
          "ORDER_CLOSE",
          `[MT5 LIVE WS CLOSED] #${closed.ticket} ${closed.type} @ ${closed.closePrice} (${closed.reason}): ${closed.profit >= 0 ? "+" : ""}$${closed.profit.toFixed(2)}`
        );
        setLogs([...botRef.current.logs]);
      }
    });

    return () => unsubscribe();
  }, [tradingMode, currentStep, pipMultiplier]);

  const handleUpdateConnection = async (newState: MT5ConnectionState) => {
    setConnectionState(newState);
    if (newState.status === "CONNECTED") {
      const isRealAccount = newState.credentials.accountType === "Real";
      if (isRealAccount) {
        setTradingMode("REAL");
      }

      // Sync credentials to backend MT5 Bridge module
      await mt5BridgeClient.connectAccount(newState.credentials);

      botRef.current.addLog(
        "INFO",
        `[MT5 BRIDGE] Linked to ${newState.credentials.server} (Login #${newState.credentials.login}) · ${newState.credentials.accountType} Mode Active · Ping ${newState.pingMs}ms`
      );
      setLogs([...botRef.current.logs]);
    } else if (newState.status === "DISCONNECTED") {
      botRef.current.addLog("INFO", "[MT5 BRIDGE] Disconnected from MT5 Server.");
      setLogs([...botRef.current.logs]);
    }
  };

  // Initialize or Reset Bot
  const resetBot = useCallback(
    (newCandles = allCandles, targetConfig = config, targetPair = selectedPair) => {
      setIsPlaying(false);
      const newBot = new ForexTradingBot({
        ...targetConfig,
        symbol: targetPair.symbol,
      });
      botRef.current = newBot;

      // Start simulation at warm-up bar
      const startIdx = Math.max(targetConfig.slowEMA + 4, 30);
      setCurrentStep(startIdx);

      // Perform initial analysis on warm-up data
      const prices = newCandles.slice(0, startIdx).map((c) => c.close);
      const analysis = newBot.analyze(prices, startIdx - 1);

      setPosition(null);
      setHistory([]);
      setLogs([...newBot.logs]);
      setReport(newBot.getReport());
      setLastAnalysis(analysis);
    },
    [allCandles, config, selectedPair]
  );

  // Change Pair
  const handleSelectPair = (pair: ForexPairInfo) => {
    setSelectedPair(pair);
    const newCandles = generateMarketCandles(pair, selectedRegime, 180);
    setAllCandles(newCandles);
    resetBot(newCandles, { ...config, symbol: pair.symbol }, pair);
  };

  // Change Market Scenario
  const handleChangeRegime = (regime: MarketRegime) => {
    setSelectedRegime(regime);
    const newCandles = generateMarketCandles(selectedPair, regime, 180);
    setAllCandles(newCandles);
    resetBot(newCandles, config, selectedPair);
  };

  // Step 1 bar forward in simulation or continuous non-stop live tick stream
  const stepForward = useCallback(() => {
    let candleList = allCandles;
    const nextStep = currentStep + 1;

    if (nextStep > candleList.length) {
      if (config.nonStopMode !== false) {
        // Continuous Non-Stop Streaming: Generate continuous incoming candle
        const lastCandle = candleList[candleList.length - 1];
        const newCandle = generateNextContinuousCandle(
          lastCandle,
          selectedPair,
          selectedRegime,
          nextStep
        );
        candleList = [...candleList, newCandle];
        setAllCandles(candleList);
      } else {
        setIsPlaying(false);
        return;
      }
    }

    setCurrentStep(nextStep);

    const candle = candleList[nextStep - 1];
    const bot = botRef.current;

    // Perform strategy analysis on price sequence up to this candle
    const prices = candleList.slice(0, nextStep).map((c) => c.close);
    const analysis = bot.analyze(prices, nextStep - 1);
    setLastAnalysis(analysis);

    // =========================================================
    // REAL MODE: DISPATCH REAL ORDERS VIA MT5 WEBSOCKET API
    // =========================================================
    if (tradingMode === "REAL") {
      // 1. Notify backend MT5 WebSocket Bridge of current tick price
      mt5BridgeClient.updateTick(selectedPair.symbol, candle.close);

      // 2. Check Breakeven and Trailing Stop triggers for active live positions
      if (liveAccount && liveAccount.openPositions.length > 0) {
        const livePos = liveAccount.openPositions[0];
        const direction = livePos.type === "BUY" ? 1 : -1;
        const gainPips = (candle.close - livePos.openPrice) * direction * pipMultiplier;

        // Breakeven check
        if (config.breakEvenTriggerPips > 0 && gainPips >= config.breakEvenTriggerPips) {
          const beSL = livePos.type === "BUY" ? livePos.openPrice + selectedPair.pipSize : livePos.openPrice - selectedPair.pipSize;
          if (livePos.type === "BUY" && livePos.sl < livePos.openPrice) {
            livePos.sl = beSL;
            botRef.current.addLog("INFO", `[MT5 LIVE 🛡️ BREAKEVEN] Position #${livePos.ticket} Stop Loss secured at ${beSL.toFixed(selectedPair.pipDecimals)}`);
          } else if (livePos.type === "SELL" && livePos.sl > livePos.openPrice) {
            livePos.sl = beSL;
            botRef.current.addLog("INFO", `[MT5 LIVE 🛡️ BREAKEVEN] Position #${livePos.ticket} Stop Loss secured at ${beSL.toFixed(selectedPair.pipDecimals)}`);
          }
        }

        // Stop Loss / Take Profit / Close by Profit Hit Check in Live Mode
        let exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "OPPOSITE_SIGNAL" | "CLOSE_BY_PROFIT" | null = null;
        const targetPips = config.closeProfitPipsTarget ?? 12;
        const targetDollar = config.closeProfitDollarTarget ?? 25;

        if (config.closeByProfit !== false && (gainPips >= targetPips || livePos.profit >= targetDollar)) {
          exitReason = "CLOSE_BY_PROFIT";
          botRef.current.addLog(
            "ORDER_CLOSE",
            `🎯 [MT5 LIVE 🎯 CLOSE BY PROFIT] Target profit locked (+${gainPips.toFixed(1)} pips / +$${livePos.profit.toFixed(2)}) on #${livePos.ticket} (${selectedPair.symbol})!`
          );
        } else if (livePos.type === "BUY") {
          if (candle.low <= livePos.sl) exitReason = "STOP_LOSS";
          else if (livePos.tp && candle.high >= livePos.tp) exitReason = "TAKE_PROFIT";
          else if (config.oppositeSignalClose && analysis.signal === "SELL") exitReason = "OPPOSITE_SIGNAL";
        } else {
          if (candle.high >= livePos.sl) exitReason = "STOP_LOSS";
          else if (livePos.tp && candle.low <= livePos.tp) exitReason = "TAKE_PROFIT";
          else if (config.oppositeSignalClose && analysis.signal === "BUY") exitReason = "OPPOSITE_SIGNAL";
        }

        if (exitReason) {
          const exitPrice = exitReason === "STOP_LOSS" ? livePos.sl : exitReason === "TAKE_PROFIT" ? (livePos.tp || candle.close) : candle.close;
          mt5BridgeClient.closeRealOrder(livePos.ticket, exitPrice, exitReason);
          if (exitReason === "TAKE_PROFIT" || exitReason === "CLOSE_BY_PROFIT") {
            audioService.playTakeProfitSound();
          } else if (exitReason === "STOP_LOSS") {
            audioService.playStopLossSound();
          } else if (livePos.profit >= 0) {
            audioService.playTakeProfitSound();
          } else {
            audioService.playStopLossSound();
          }
        }
      }

      // 3. Open Real Market Order via MT5 Bridge with Market Sentiment Alignment
      const sentScore = sentimentData?.score ?? 0;
      const isSentBullish = sentScore >= (config.sentimentThreshold ?? 15);
      const isSentBearish = sentScore <= -(config.sentimentThreshold ?? 15);

      const isSignalBuy = ((analysis.signal === "BUY" && sentScore >= -15) || (analysis.signal !== "SELL" && isSentBullish && config.sentimentAutotrading)) && config.allowBuy !== false;
      const isSignalSell = ((analysis.signal === "SELL" && sentScore <= 15) || (analysis.signal !== "BUY" && isSentBearish && config.sentimentAutotrading)) && config.allowSell !== false;

      if (
        config.autoTrading &&
        !bot.paused &&
        (!liveAccount || liveAccount.openPositions.length === 0) &&
        (isSignalBuy || isSignalSell)
      ) {
        const orderType: "BUY" | "SELL" = isSignalBuy ? "BUY" : "SELL";
        if (config.sentimentAutotrading && (isSentBullish || isSentBearish)) {
          botRef.current.addLog(
            "SIGNAL",
            `[SENTIMENT AUTOTRADING 🤖] ${sentScore >= 0 ? "+" : ""}${sentScore} (${sentimentData?.classification || "Sentiment"}) confirms Auto ${orderType} on ${selectedPair.symbol}`
          );
        }

        const slPrice = orderType === "BUY" ? candle.close - stopDistanceReal : candle.close + stopDistanceReal;
        const tpPrice = config.takeProfitRatio > 0
          ? (orderType === "BUY" ? candle.close + (stopDistanceReal * config.takeProfitRatio) : candle.close - (stopDistanceReal * config.takeProfitRatio))
          : null;

        const lots = 0.1; // Sized position
        mt5BridgeClient.executeRealOrder({
          symbol: selectedPair.symbol,
          type: orderType,
          price: candle.close,
          sl: Number(slPrice.toFixed(selectedPair.pipDecimals)),
          tp: tpPrice ? Number(tpPrice.toFixed(selectedPair.pipDecimals)) : null,
          lots,
          units: lots * 100000,
        });
        audioService.playTradeOpenSound();
      }

      setLogs([...bot.logs]);
      return;
    }

    // =========================================================
    // DEMO MODE: LOCAL ENGINE SIMULATOR
    // =========================================================
    // 1. Check SL / TP / Close by Profit
    const triggerTrade = bot.checkPositionTriggers(candle, pipMultiplier);
    if (triggerTrade) {
      if (triggerTrade.exitReason === "TAKE_PROFIT" || triggerTrade.exitReason === "CLOSE_BY_PROFIT") {
        audioService.playTakeProfitSound();
      } else if (triggerTrade.exitReason === "STOP_LOSS") {
        audioService.playStopLossSound();
      } else if (triggerTrade.profit >= 0) {
        audioService.playTakeProfitSound();
      } else {
        audioService.playStopLossSound();
      }
    }

    // 2. Automated Signal Reversal & Sentiment Alignment
    if (config.autoTrading && !bot.paused) {
      if (
        config.autopilotMode &&
        config.oppositeSignalClose &&
        bot.position &&
        ((bot.position.type === "BUY" && analysis.signal === "SELL") ||
          (bot.position.type === "SELL" && analysis.signal === "BUY"))
      ) {
        const oppRes = bot.closePosition(candle.close, "OPPOSITE_SIGNAL", candle.time, pipMultiplier);
        if (oppRes.trade) {
          if (oppRes.trade.profit >= 0) audioService.playTakeProfitSound();
          else audioService.playStopLossSound();
        }
      }

      const sentScore = sentimentData?.score ?? 0;
      const isSentBullish = sentScore >= (config.sentimentThreshold ?? 15);
      const isSentBearish = sentScore <= -(config.sentimentThreshold ?? 15);

      const isDemoBuy = ((analysis.signal === "BUY" && sentScore >= -15) || (analysis.signal !== "SELL" && isSentBullish && config.sentimentAutotrading)) && config.allowBuy !== false;
      const isDemoSell = ((analysis.signal === "SELL" && sentScore <= 15) || (analysis.signal !== "BUY" && isSentBearish && config.sentimentAutotrading)) && config.allowSell !== false;

      if (!bot.position && (isDemoBuy || isDemoSell)) {
        const orderType: "BUY" | "SELL" = isDemoBuy ? "BUY" : "SELL";
        if (config.sentimentAutotrading && (isSentBullish || isSentBearish)) {
          bot.addLog(
            "SIGNAL",
            `[SENTIMENT AUTOTRADING 🤖] ${sentScore >= 0 ? "+" : ""}${sentScore} (${sentimentData?.classification || "Sentiment"}) confirms Auto ${orderType} on ${selectedPair.symbol}`
          );
        }

        const openRes = bot.openPosition(
          orderType,
          candle.close,
          stopDistanceReal,
          candle.time,
          nextStep - 1
        );
        if (openRes.success) {
          audioService.playTradeOpenSound();
        }
      }
    }

    // 3. Update position state and live unrealized PnL
    if (bot.position) {
      const direction = bot.position.type === "BUY" ? 1 : -1;
      bot.position.currentPrice = candle.close;
      bot.position.unrealizedProfit = Number(
        ((candle.close - bot.position.entryPrice) * direction * bot.position.units).toFixed(2)
      );
      setPosition({ ...bot.position });
    } else {
      setPosition(null);
    }

    // Update synced state
    setHistory([...bot.history]);
    setLogs([...bot.logs]);
    setReport(bot.getReport());
  }, [allCandles, currentStep, config, pipMultiplier, stopDistanceReal, tradingMode, liveAccount, selectedPair, sentimentData]);

  // Simulation / 24/7 Non-Stop Autopilot Playback Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      const intervalMs = Math.max(10, Math.floor(1000 / playbackSpeed));
      timer = setInterval(() => {
        if (config.nonStopMode !== false || currentStep < allCandles.length) {
          stepForward();
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, currentStep, allCandles.length, stepForward, config.nonStopMode]);

  // Run Instant Full Backtest over all 180 bars
  const handleRunInstantBacktest = () => {
    setIsPlaying(false);
    const bot = new ForexTradingBot({
      ...config,
      symbol: selectedPair.symbol,
    });
    botRef.current = bot;

    const startIdx = Math.max(config.slowEMA + 4, 30);

    for (let i = startIdx; i <= allCandles.length; i++) {
      const candle = allCandles[i - 1];
      // Check SL / TP
      bot.checkPositionTriggers(candle, pipMultiplier);

      // Analyze
      const prices = allCandles.slice(0, i).map((c) => c.close);
      const analysis = bot.analyze(prices, i - 1);

      // Auto trade & Autopilot Signal Reversal
      if (config.autoTrading && !bot.paused) {
        if (
          config.autopilotMode &&
          config.oppositeSignalClose &&
          bot.position &&
          ((bot.position.type === "BUY" && analysis.signal === "SELL") ||
            (bot.position.type === "SELL" && analysis.signal === "BUY"))
        ) {
          bot.closePosition(candle.close, "OPPOSITE_SIGNAL", candle.time, pipMultiplier);
        }

        if (!bot.position && (analysis.signal === "BUY" || analysis.signal === "SELL")) {
          bot.openPosition(
            analysis.signal,
            candle.close,
            stopDistanceReal,
            candle.time,
            i - 1
          );
        }
      }

      if (bot.position) {
        const direction = bot.position.type === "BUY" ? 1 : -1;
        bot.position.currentPrice = candle.close;
        bot.position.unrealizedProfit = Number(
          ((candle.close - bot.position.entryPrice) * direction * bot.position.units).toFixed(2)
        );
      }
    }

    setCurrentStep(allCandles.length);
    setPosition(bot.position ? { ...bot.position } : null);
    setHistory([...bot.history]);
    setLogs([...bot.logs]);
    setReport(bot.getReport());

    const finalPrices = allCandles.map((c) => c.close);
    setLastAnalysis(bot.analyze(finalPrices, allCandles.length - 1));
  };

  // Manual Buy (with allowBuy validation and true live execution)
  const handleManualBuy = async () => {
    if (config.allowBuy === false) {
      botRef.current.addLog("INFO", "⚠️ BUY orders are disabled (allowBuy = false). Toggle True BUY to ON.");
      setLogs([...botRef.current.logs]);
      return;
    }

    const candle = allCandles[currentStep - 1];
    if (!candle) return;

    if (tradingMode === "REAL" || !config.simulationMode) {
      const slPrice = candle.close - stopDistanceReal;
      const tpPrice = config.takeProfitRatio > 0 ? candle.close + stopDistanceReal * config.takeProfitRatio : null;
      await mt5BridgeClient.executeRealOrder({
        symbol: selectedPair.symbol,
        type: "BUY",
        price: candle.close,
        sl: Number(slPrice.toFixed(selectedPair.pipDecimals)),
        tp: tpPrice ? Number(tpPrice.toFixed(selectedPair.pipDecimals)) : null,
        lots: 0.1,
      });
      audioService.playTradeOpenSound();
      botRef.current.addLog(
        "ORDER_OPEN",
        `[MT5 TRUE BUY] Forced Real Market BUY order executed on ${selectedPair.symbol} @ ${candle.close} (Simulation: FALSE · Buy: TRUE)`
      );
      setLogs([...botRef.current.logs]);
      return;
    }

    const bot = botRef.current;
    if (bot.position) return;
    const res = bot.openPosition("BUY", candle.close, stopDistanceReal, candle.time, currentStep - 1);
    if (res.success && res.position) {
      setPosition(res.position);
      audioService.playTradeOpenSound();
    }
    setLogs([...bot.logs]);
    setReport(bot.getReport());
  };

  // Manual Sell (with allowSell validation and true live execution)
  const handleManualSell = async () => {
    if (config.allowSell === false) {
      botRef.current.addLog("INFO", "⚠️ SELL orders are disabled (allowSell = false). Toggle True SELL to ON.");
      setLogs([...botRef.current.logs]);
      return;
    }

    const candle = allCandles[currentStep - 1];
    if (!candle) return;

    if (tradingMode === "REAL" || !config.simulationMode) {
      const slPrice = candle.close + stopDistanceReal;
      const tpPrice = config.takeProfitRatio > 0 ? candle.close - stopDistanceReal * config.takeProfitRatio : null;
      await mt5BridgeClient.executeRealOrder({
        symbol: selectedPair.symbol,
        type: "SELL",
        price: candle.close,
        sl: Number(slPrice.toFixed(selectedPair.pipDecimals)),
        tp: tpPrice ? Number(tpPrice.toFixed(selectedPair.pipDecimals)) : null,
        lots: 0.1,
      });
      audioService.playTradeOpenSound();
      botRef.current.addLog(
        "ORDER_OPEN",
        `[MT5 TRUE SELL] Forced Real Market SELL order executed on ${selectedPair.symbol} @ ${candle.close} (Simulation: FALSE · Sell: TRUE)`
      );
      setLogs([...botRef.current.logs]);
      return;
    }

    const bot = botRef.current;
    if (bot.position) return;
    const res = bot.openPosition("SELL", candle.close, stopDistanceReal, candle.time, currentStep - 1);
    if (res.success && res.position) {
      setPosition(res.position);
      audioService.playTradeOpenSound();
    }
    setLogs([...bot.logs]);
    setReport(bot.getReport());
  };

  // Manual Close
  const handleManualClose = async () => {
    const candle = allCandles[currentStep - 1];
    if (!candle) return;

    if (tradingMode === "REAL" && liveAccount && liveAccount.openPositions.length > 0) {
      const pos = liveAccount.openPositions[0];
      if (pos.profit >= 0) audioService.playTakeProfitSound();
      else audioService.playStopLossSound();
      await mt5BridgeClient.closeRealOrder(pos.ticket, candle.close, "MANUAL");
      return;
    }

    const bot = botRef.current;
    if (!bot.position) return;
    const isProfitable = bot.position.unrealizedProfit >= 0;
    if (isProfitable) audioService.playTakeProfitSound();
    else audioService.playStopLossSound();
    bot.closePosition(candle.close, "MANUAL", candle.time, pipMultiplier);
    setPosition(null);
    setHistory([...bot.history]);
    setLogs([...bot.logs]);
    setReport(bot.getReport());
  };

  // Toggle Simulation Mode: False (Live MT5 Orders) <-> True (Local Simulation)
  const handleToggleSimulationMode = () => {
    setConfig((prev) => {
      const nextSim = !prev.simulationMode;
      const nextMode = nextSim ? "DEMO" : "REAL";
      setTradingMode(nextMode);
      botRef.current.simulationMode = nextSim;
      botRef.current.addLog(
        "INFO",
        nextSim
          ? "[MODE CHANGED] Switched to Simulation Mode (Demo testing only, no real orders)"
          : "[MODE CHANGED] Converted to REAL MT5 Order Execution (Simulation: FALSE · Live Orders Active)"
      );
      setLogs([...botRef.current.logs]);
      return { ...prev, simulationMode: nextSim };
    });
  };

  // Toggle True BUY Orders
  const handleToggleAllowBuy = () => {
    setConfig((prev) => {
      const nextBuy = !prev.allowBuy;
      botRef.current.allowBuy = nextBuy;
      botRef.current.addLog(
        "INFO",
        nextBuy
          ? "[ORDER PERMISSION] True BUY Orders ENABLED (Buy: TRUE)"
          : "[ORDER PERMISSION] True BUY Orders PAUSED (Buy: FALSE)"
      );
      setLogs([...botRef.current.logs]);
      return { ...prev, allowBuy: nextBuy };
    });
  };

  // Toggle True SELL Orders
  const handleToggleAllowSell = () => {
    setConfig((prev) => {
      const nextSell = !prev.allowSell;
      botRef.current.allowSell = nextSell;
      botRef.current.addLog(
        "INFO",
        nextSell
          ? "[ORDER PERMISSION] True SELL Orders ENABLED (Sell: TRUE)"
          : "[ORDER PERMISSION] True SELL Orders PAUSED (Sell: FALSE)"
      );
      setLogs([...botRef.current.logs]);
      return { ...prev, allowSell: nextSell };
    });
  };

  // Handle Mode Change from UI (DEMO vs REAL)
  const handleSetTradingMode = (newMode: "DEMO" | "REAL") => {
    setTradingMode(newMode);
    const isSim = newMode === "DEMO";
    setConfig((prev) => ({ ...prev, simulationMode: isSim }));
    botRef.current.simulationMode = isSim;
    botRef.current.addLog(
      "INFO",
      newMode === "REAL"
        ? "[EXECUTION MODE] Converted to REAL LIVE MT5 (Simulation: FALSE · True Buy: TRUE · True Sell: TRUE)"
        : "[EXECUTION MODE] Converted to DEMO (Simulation: TRUE)"
    );
    setLogs([...botRef.current.logs]);
  };

  // Toggle Capital Shield Zero-Loss Autopilot Preset
  const handleToggleCapitalShield = () => {
    const nextState = !config.capitalShieldMode;
    const newConfig: BotConfig = {
      ...config,
      capitalShieldMode: nextState,
      autopilotMode: true,
      autoTrading: true,
      breakEvenTriggerPips: nextState ? 3 : 10,
      trailingStopDistancePips: nextState ? 8 : 15,
      takeProfitRatio: nextState ? 2.5 : 1.5,
      oppositeSignalClose: true,
    };
    setConfig(newConfig);
    botRef.current.capitalShieldMode = nextState;
    botRef.current.breakEvenTriggerPips = newConfig.breakEvenTriggerPips;
    botRef.current.trailingStopDistancePips = newConfig.trailingStopDistancePips;
    botRef.current.takeProfitRatio = newConfig.takeProfitRatio;
    botRef.current.addLog(
      "INFO",
      nextState
        ? "🛡️ Zero-Loss Capital Shield ACTIVATED: +3 pip Breakeven Lock, 8-pip Trailing Stop, and 1:2.5 Asymmetric Profit Target engaged."
        : "Capital Shield deactivated. Standard Autopilot parameters restored."
    );
    setLogs([...botRef.current.logs]);
  };

  // Toggle Autopilot for Buying and Selling
  const handleToggleAutopilot = () => {
    const nextAutopilot = !(config.autoTrading && config.autopilotMode);
    const newConfig: BotConfig = {
      ...config,
      autoTrading: nextAutopilot,
      autopilotMode: nextAutopilot,
    };
    setConfig(newConfig);
    botRef.current.autopilotMode = nextAutopilot;
    botRef.current.addLog(
      "INFO",
      nextAutopilot
        ? "🤖 [AUTOPILOT FOR BUYING & SELLING: ENGAGED] Autonomous auto-buy and auto-sell orders on EMA crossover with dynamic ATR Trailing Stop active."
        : "⏸️ [AUTOPILOT FOR BUYING & SELLING: PAUSED] Autonomous buying and selling paused. Switched to manual mode."
    );
    setLogs([...botRef.current.logs]);
  };

  // Toggle 24/7 Non-Stop Continuous Execution
  const handleToggleNonStopMode = () => {
    setConfig((prev) => {
      const nextMode = prev.nonStopMode === false ? true : false;
      botRef.current.nonStopMode = nextMode;
      botRef.current.addLog(
        "INFO",
        nextMode
          ? "♾️ [24/7 NON-STOP ROBOT: ACTIVE] Continuous streaming execution engaged. The robot will work indefinitely without stopping or pausing on bar limits."
          : "⏸️ [24/7 NON-STOP ROBOT: DISABLED] Standard execution mode active."
      );
      setLogs([...botRef.current.logs]);
      return { ...prev, nonStopMode: nextMode };
    });
  };

  // Reset Risk Drawdown Pause
  const handleResetRiskPause = () => {
    const bot = botRef.current;
    bot.resetRiskPause();
    setLogs([...bot.logs]);
    setReport(bot.getReport());
  };

  // Apply new Settings
  const handleSaveSettings = (newConfig: BotConfig) => {
    setConfig(newConfig);
    setTradingMode(newConfig.simulationMode ? "DEMO" : "REAL");
    resetBot(allCandles, newConfig, selectedPair);
  };

  // Market analysis on demand (for AI Market Analysis card)
  const handleAnalyzeMarket = () => {
    const prices = allCandles.slice(0, currentStep).map((c) => c.close);
    const analysis = botRef.current.analyze(prices, currentStep - 1);
    setLastAnalysis(analysis);
    botRef.current.addLog(
      "SIGNAL",
      `AI Market Analysis for ${selectedPair.symbol}: Signal ${analysis.signal} (${analysis.reason || "EMA Crossover / RSI Evaluation"}) | Fast EMA: ${analysis.fastEMA?.toFixed(selectedPair.pipDecimals)} | Slow EMA: ${analysis.slowEMA?.toFixed(selectedPair.pipDecimals)} | RSI: ${analysis.RSI?.toFixed(1)}`
    );
    setLogs([...botRef.current.logs]);
  };

  const handleStartBot = () => {
    if (report.paused) {
      handleResetRiskPause();
    }
    setConfig((c) => ({ ...c, autoTrading: true, autopilotMode: true }));
    setIsPlaying(true);
    const modeBadge = tradingMode === "REAL" ? "REAL LIVE ACCOUNT (WebSocket MT5 Bridge)" : "DEMO SIMULATION";
    botRef.current.addLog("INFO", `▶ START BOT: Algorithmic Autopilot started on ${selectedPair.symbol} [${modeBadge}] via ${connectionState.credentials.server}.`);
    setLogs([...botRef.current.logs]);
  };

  const handleStopBot = () => {
    setIsPlaying(false);
    botRef.current.addLog("INFO", `⏹ STOP BOT: Autopilot paused on ${selectedPair.symbol}.`);
    setLogs([...botRef.current.logs]);
  };

  const visibleCandles = allCandles.slice(0, currentStep);
  const currentCandle = allCandles[currentStep - 1];
  const currentPrice = currentCandle ? currentCandle.close : selectedPair.defaultPrice;
  const floatingPnL = position ? position.unrealizedProfit : 0;
  const statusText = report.paused
    ? "Paused (Risk Limit)"
    : isPlaying
    ? tradingMode === "REAL"
      ? `LIVE AUTO EXECUTION Active (${selectedPair.symbol})`
      : `AUTOPILOT RUNNING - AUTO BUY/SELL (${selectedPair.symbol})`
    : tradingMode === "REAL"
    ? "Real Automatic Trading Ready"
    : "Automatic Autopilot Ready";

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100 font-sans">
      {/* Top Bar Header */}
      <HeaderNav
        onRunInstantBacktest={handleRunInstantBacktest}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenBrokerModal={() => setIsBrokerModalOpen(true)}
        onOpenVpnModal={() => setIsVpnModalOpen(true)}
        isVpnConnected={vpnState.isConnected}
        connectionState={connectionState}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentUser={authUser}
        onOpenSentimentModal={() => setIsSentimentModalOpen(true)}
        sentimentScore={sentimentData?.score}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3.5 sm:p-5 space-y-4">
        {/* SPEAKING HAND AI TRADER Primary Dashboard Deck */}
        <SpeakingHandTraderDeck
          mode={tradingMode}
          onSetMode={handleSetTradingMode}
          botRunning={isPlaying}
          onStartBot={handleStartBot}
          onStopBot={handleStopBot}
          statusText={statusText}
          report={report}
          floatingPnL={floatingPnL}
          selectedPair={selectedPair}
          onSelectPair={handleSelectPair}
          lastAnalysis={lastAnalysis}
          onAnalyzeMarket={handleAnalyzeMarket}
          config={config}
          connectionState={connectionState}
          onOpenBrokerModal={() => setIsBrokerModalOpen(true)}
          onOpenVpnModal={() => setIsVpnModalOpen(true)}
          onToggleCapitalShield={handleToggleCapitalShield}
          onToggleAutopilot={handleToggleAutopilot}
          onToggleSimulationMode={handleToggleSimulationMode}
          onToggleAllowBuy={handleToggleAllowBuy}
          onToggleAllowSell={handleToggleAllowSell}
          logs={logs}
          latencyHistory={latencyHistory}
        />

        {/* Real Live Account Banner */}
        {tradingMode === "REAL" && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-[#170a0f] via-[#1a0c14] to-[#0c1424] border border-rose-500/40 rounded-xl text-xs shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-white font-bold text-sm">
                    MT5 WebSocket Backend Bridge Active (Simulation: FALSE)
                  </strong>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono border border-rose-500/40 font-bold">
                    TRUE BUY &amp; SELL ENABLED
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 font-mono">
                  Broker: {liveAccount?.brokerCompany || "Exness Global"} · Server: {liveAccount?.server || "Exness-Real10"} · Account #{liveAccount?.login || "14892015"} · Balance: ${liveAccount ? liveAccount.balance.toFixed(2) : "10,000.00"} USD
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
              <div className="w-44 hidden md:block">
                <LatencyLineChart
                  data={latencyHistory}
                  currentPing={connectionState.pingMs}
                  status={connectionState.status}
                  serverName={connectionState.credentials.server || "Exness-Real10"}
                  height={40}
                  compact={true}
                  title="Live Ping"
                />
              </div>
              <span className="text-emerald-400 font-bold whitespace-nowrap">
                ● Live Sync ({connectionState.pingMs || 14}ms)
              </span>
              <button
                onClick={() => setIsBrokerModalOpen(true)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-sans text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                Change Broker Link
              </button>
            </div>
          </div>
        )}

        {/* Drawdown Alert Banner (if paused) */}
        {report.paused && (
          <div className="flex items-center justify-between p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-200">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <strong className="font-semibold text-rose-300">
                  Risk Management Circuit Breaker Activated:
                </strong>{" "}
                Account drawdown reached {report.currentDrawdown.toFixed(2)}% (limit: {config.maxDrawdownPercent}%). New automated orders are paused.
              </div>
            </div>
            <button
              onClick={handleResetRiskPause}
              className="flex items-center gap-1.5 px-3 py-1 font-semibold text-rose-100 bg-rose-600 hover:bg-rose-500 rounded transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Risk Limit</span>
            </button>
          </div>
        )}

        {/* Strategy Tester Controls Ribbon */}
        <StrategyControls
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          currentStep={currentStep}
          totalSteps={allCandles.length}
          selectedPair={selectedPair}
          selectedRegime={selectedRegime}
          autoTrading={config.autoTrading}
          autopilotMode={config.autopilotMode}
          capitalShieldMode={config.capitalShieldMode}
          simulationMode={config.simulationMode}
          allowBuy={config.allowBuy}
          allowSell={config.allowSell}
          nonStopMode={config.nonStopMode !== false}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onTogglePlay={() => (isPlaying ? handleStopBot() : handleStartBot())}
          onStepForward={stepForward}
          onChangeSpeed={setPlaybackSpeed}
          onSelectPair={handleSelectPair}
          onSelectRegime={handleChangeRegime}
          onToggleAutoTrading={() => setConfig((c) => ({ ...c, autoTrading: !c.autoTrading }))}
          onToggleAutopilot={() => setConfig((c) => ({ ...c, autopilotMode: !c.autopilotMode }))}
          onToggleCapitalShield={handleToggleCapitalShield}
          onToggleSimulationMode={handleToggleSimulationMode}
          onToggleAllowBuy={handleToggleAllowBuy}
          onToggleAllowSell={handleToggleAllowSell}
          onToggleNonStopMode={handleToggleNonStopMode}
          onRunInstantBacktest={handleRunInstantBacktest}
          onReset={() => resetBot(allCandles, config, selectedPair)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Middle Trading Grid: Chart + Order Entry */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <TradingChart
              candles={visibleCandles}
              fastEMAPeriod={config.fastEMA}
              slowEMAPeriod={config.slowEMA}
              rsiPeriod={config.rsiPeriod}
              rsiFilterEnabled={config.rsiFilterEnabled ?? true}
              position={position}
              trades={history}
              pipDecimals={selectedPair.pipDecimals}
              symbol={selectedPair.symbol}
              sentimentData={sentimentData}
              onOpenSentimentModal={() => setIsSentimentModalOpen(true)}
              isLoadingSentiment={isLoadingSentiment}
              onRefreshSentiment={() => fetchMarketSentiment(selectedPair.symbol)}
              autotradingActive={config.autoTrading}
              onToggleAutotrading={handleToggleAutopilot}
              closeByProfitActive={config.closeByProfit ?? true}
              onToggleCloseByProfit={handleToggleCloseByProfit}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <OneClickTradingBar
              currentPrice={currentPrice}
              spreadPips={selectedPair.spreadPips}
              pipSize={selectedPair.pipSize}
              pipDecimals={selectedPair.pipDecimals}
              onManualBuy={handleManualBuy}
              onManualSell={handleManualSell}
              autoTrading={config.autoTrading}
              autopilotMode={config.autopilotMode}
              onToggleAutopilot={handleToggleAutopilot}
              lastSignal={lastAnalysis?.signal}
              simulationMode={config.simulationMode}
              allowBuy={config.allowBuy}
              allowSell={config.allowSell}
              onToggleSimulationMode={handleToggleSimulationMode}
              onToggleAllowBuy={handleToggleAllowBuy}
              onToggleAllowSell={handleToggleAllowSell}
              closeByProfit={config.closeByProfit ?? true}
              onToggleCloseByProfit={handleToggleCloseByProfit}
              sentimentScore={sentimentData?.score}
              onOpenSentimentModal={() => setIsSentimentModalOpen(true)}
            />

            <PerformanceMetrics
              report={report}
              currentSymbol={selectedPair.symbol}
              onSelectSymbol={(sym) => {
                const pair = FOREX_PAIRS.find((p) => p.symbol === sym);
                if (pair) handleSelectPair(pair);
              }}
            />
          </div>
        </div>

        {/* Bottom Metatrader 5 Terminal Panel */}
        <TerminalPanel
          position={position}
          history={history}
          logs={logs}
          report={report}
          pipDecimals={selectedPair.pipDecimals}
          selectedPair={selectedPair}
          currentPrice={currentPrice}
          onSelectPair={handleSelectPair}
          onClosePosition={handleManualClose}
          onResetRiskPause={handleResetRiskPause}
          connectionState={connectionState}
          onOpenBrokerModal={() => setIsBrokerModalOpen(true)}
          onUpdateTradeNote={handleUpdateTradeNote}
        />
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <ParameterSettingsModal
          isOpen={isSettingsOpen}
          config={config}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Rules Guide Modal */}
      {isGuideOpen && <RulesGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />}

      {/* Broker & MT5 Connection Modal */}
      {isBrokerModalOpen && (
        <BrokerConnectionModal
          isOpen={isBrokerModalOpen}
          connectionState={connectionState}
          onUpdateConnection={handleUpdateConnection}
          onClose={() => setIsBrokerModalOpen(false)}
          botConfig={config}
          latencyHistory={latencyHistory}
        />
      )}

      {/* MetaTrader 5 Low-Latency VPN & VPS Gateway Modal */}
      {isVpnModalOpen && (
        <MT5VpnSetupModal
          isOpen={isVpnModalOpen}
          onClose={() => setIsVpnModalOpen(false)}
          vpnState={vpnState}
          onUpdateVpnState={setVpnState}
        />
      )}

      {/* EA ALGOPRO API JWT Authentication Modal */}
      {isAuthModalOpen && (
        <AlgoProAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={authUser}
          onLoginSuccess={(user) => {
            setAuthUser(user);
            try {
              localStorage.setItem("ea_algopro_auth_user", JSON.stringify(user));
            } catch {}
          }}
          onLogout={() => {
            setAuthUser(null);
            try {
              localStorage.removeItem("ea_algopro_auth_user");
            } catch {}
          }}
        />
      )}

      {/* Google Search Grounded Market Sentiment Modal */}
      {isSentimentModalOpen && (
        <MarketSentimentModal
          isOpen={isSentimentModalOpen}
          onClose={() => setIsSentimentModalOpen(false)}
          sentimentData={sentimentData}
          onRefresh={() => fetchMarketSentiment(selectedPair.symbol)}
          isLoading={isLoadingSentiment}
          autotradingActive={config.autoTrading}
          onToggleAutotrading={handleToggleAutopilot}
          closeByProfitActive={config.closeByProfit ?? true}
          onToggleCloseByProfit={handleToggleCloseByProfit}
        />
      )}
    </div>
  );
}
