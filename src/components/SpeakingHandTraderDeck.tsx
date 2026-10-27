import React, { useState, useRef, useEffect } from "react";
import {
  ForexPairInfo,
  BotAnalysisResult,
  BotReport,
  BotConfig,
  BotLog,
} from "../types/trading";
import { MT5ConnectionState, LatencyPoint } from "../types/broker";
import { FOREX_PAIRS } from "../lib/marketData";
import { LatencyLineChart } from "./LatencyLineChart";
import {
  Sparkles,
  Play,
  Square,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  Activity,
  Zap,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Wifi,
  Lock,
  Shield,
} from "lucide-react";

interface SpeakingHandTraderDeckProps {
  mode: "DEMO" | "REAL";
  onSetMode: (mode: "DEMO" | "REAL") => void;
  botRunning: boolean;
  onStartBot: () => void;
  onStopBot: () => void;
  statusText: string;
  report: BotReport;
  floatingPnL: number;
  selectedPair: ForexPairInfo;
  onSelectPair: (pair: ForexPairInfo) => void;
  lastAnalysis: BotAnalysisResult | null;
  onAnalyzeMarket: () => void;
  config: BotConfig;
  connectionState: MT5ConnectionState;
  onOpenBrokerModal: () => void;
  onOpenVpnModal?: () => void;
  onToggleCapitalShield?: () => void;
  onToggleAutopilot?: () => void;
  onToggleSimulationMode?: () => void;
  onToggleAllowBuy?: () => void;
  onToggleAllowSell?: () => void;
  logs: BotLog[];
  latencyHistory?: LatencyPoint[];
}

export const SpeakingHandTraderDeck: React.FC<SpeakingHandTraderDeckProps> = ({
  mode,
  onSetMode,
  botRunning,
  onStartBot,
  onStopBot,
  statusText,
  report,
  floatingPnL,
  selectedPair,
  onSelectPair,
  lastAnalysis,
  onAnalyzeMarket,
  config,
  connectionState,
  onOpenBrokerModal,
  onOpenVpnModal,
  onToggleCapitalShield,
  onToggleAutopilot,
  onToggleSimulationMode,
  onToggleAllowBuy,
  onToggleAllowSell,
  logs,
  latencyHistory,
}) => {
  const [realNoticeOpen, setRealNoticeOpen] = useState(false);
  const [showArchitecturePipeline, setShowArchitecturePipeline] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs container to bottom on update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const equity = report.currentBalance + floatingPnL;
  const margin = Math.max(0, report.currentBalance * 0.01);
  const freeMargin = Math.max(0, equity - margin);

  const handleRealModeClick = () => {
    onSetMode("REAL");
  };

  const isReal = mode === "REAL";

  const pipelineSteps = [
    { label: "Dashboard", sub: "React UI", active: true },
    { label: "Node.js API", sub: "trading-bot.js", active: true },
    { label: "MT5 Connector", sub: isReal ? "REAL Orders Active" : "IPC Bridge", active: true },
    {
      label: "EXNESS MT5",
      sub: connectionState.credentials.server || "Exness-Real10",
      active: true,
    },
    { label: "Market Prices", sub: selectedPair.symbol, active: true },
    { label: "AI ANALYZER", sub: "Scalper EMA+RSI", active: true },
    { label: "SCALPING", sub: "Fast M1/M5", active: true },
    { label: "RISK MGMT", sub: `DD ≤ ${config.maxDrawdownPercent}%`, active: true },
    {
      label: mode + " MODE",
      sub: isReal ? (botRunning ? "LIVE AUTOPILOT" : "REAL STANDBY") : (botRunning ? "ACTIVE" : "STANDBY"),
      active: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Brand Header */}
      <div className="text-center py-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[#00e5a8] tracking-wider uppercase drop-shadow-sm flex items-center justify-center gap-2">
          <span>SPEAKING HAND AI TRADER</span>
          {isReal && (
            <span className="text-xs px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold tracking-normal animate-pulse">
              LIVE REAL ACCOUNT
            </span>
          )}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Algorithmic Forex Autopilot for MetaTrader 5 · Real Automated Order Execution Engine
        </p>
      </div>

      {/* EXNESS REAL ALGORITHMIC TRADING EA CONNECTION STRIP */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#131f2f] to-[#0c1420] border border-amber-500/40 rounded-xl p-3 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <span>Exness Real Algorithmic Trading EA</span>
              </span>
              <a
                href="https://www.exness.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10.5px] font-mono font-bold text-amber-300 hover:text-amber-200 underline inline-flex items-center gap-0.5"
              >
                <span>https://www.exness.com/</span>
                <ArrowRight className="w-2.5 h-2.5 rotate-[-45deg]" />
              </a>
              <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold">
                LD4 9.8ms
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live MT5 Server: <strong className="text-slate-200 font-mono">{connectionState.credentials.server || "Exness-Real10"}</strong> · Account #{connectionState.credentials.login || "14892015"} · Real Autopilot Execution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenBrokerModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>Exness EA Setup</span>
          </button>
          <a
            href="https://trade.exness.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-[#142338] hover:bg-[#1a2e4a] text-slate-200 border border-slate-700 rounded-lg text-xs transition-colors flex items-center gap-1"
          >
            <span>WebTerminal</span>
          </a>
        </div>
      </div>

      {/* SYSTEM ARCHITECTURE PIPELINE */}
      <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#00e5a8]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              System Architecture & Live Order Pipeline
            </span>
            {isReal && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded font-mono font-semibold">
                DIRECT MT5 LIVE BRIDGE
              </span>
            )}
          </div>
          <button
            onClick={() => setShowArchitecturePipeline(!showArchitecturePipeline)}
            className="text-[11px] text-slate-400 hover:text-[#00e5a8] cursor-pointer transition-colors"
          >
            {showArchitecturePipeline ? "Collapse" : "Expand"}
          </button>
        </div>

        {showArchitecturePipeline && (
          <div className="overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-slate-700">
            <div className="flex items-center justify-between min-w-[780px] gap-1.5 text-center text-xs">
              {pipelineSteps.map((step, idx) => (
                <React.Fragment key={step.label}>
                  <div
                    className={`flex-1 p-2 rounded-lg border transition-all ${
                      step.active
                        ? isReal
                          ? "bg-[#111927] border-rose-500/40 shadow-xs shadow-rose-500/10"
                          : "bg-[#0b1524] border-[#00e5a8]/40 shadow-xs shadow-[#00e5a8]/10"
                        : "bg-[#0a111c] border-slate-800 text-slate-500"
                    }`}
                  >
                    <div
                      className={`font-mono font-bold text-[11px] truncate ${
                        step.label.includes(mode)
                          ? mode === "REAL"
                            ? "text-rose-400"
                            : "text-[#00e5a8]"
                          : "text-slate-100"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                      {step.sub}
                    </div>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <div className={`${isReal ? "text-rose-400/70" : "text-[#00e5a8]/60"} shrink-0 px-0.5`}>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 Core Control & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 select-none">
        {/* CARD 1: TRADING MODE */}
        <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <span>Trading Mode</span>
              </h2>
              <span
                id="mode"
                className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                  mode === "DEMO"
                    ? "bg-[#00e5a8]/20 text-[#00e5a8] border border-[#00e5a8]/40"
                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black animate-pulse"
                }`}
              >
                {mode === "REAL" ? "REAL (LIVE ACCOUNT)" : "DEMO"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => onSetMode("DEMO")}
                className={`demo py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === "DEMO"
                    ? "bg-[#00c896] text-[#08111f] shadow-md shadow-[#00c896]/20 font-extrabold"
                    : "bg-[#0e1a2c] text-slate-300 hover:text-white hover:bg-[#1a2d48] border border-[#1e3456]"
                }`}
              >
                DEMO MODE
              </button>

              <button
                onClick={handleRealModeClick}
                className={`real py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === "REAL"
                    ? "bg-[#e74c3c] text-white shadow-md shadow-rose-900/40 font-extrabold ring-1 ring-rose-400"
                    : "bg-[#0e1a2c] text-rose-300 hover:text-white hover:bg-rose-950/40 border border-rose-900/50"
                }`}
              >
                REAL MODE
              </button>
            </div>
          </div>

          <div className="space-y-1.5 text-xs pt-2 border-t border-[#1e3456]/60">
            {/* Autopilot For Buying & Selling Master Toggle */}
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-[#0e1a2c] border border-[#1e3456]">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${config.autoTrading && config.autopilotMode ? "bg-[#00e5a8] animate-ping" : "bg-slate-500"}`} />
                <span className="text-[10px] font-bold text-slate-200">
                  AUTOPILOT (BUY & SELL):
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleAutopilot}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  config.autoTrading && config.autopilotMode
                    ? "bg-[#00c896] text-[#08111f] shadow-xs font-black"
                    : "bg-slate-700 text-slate-300 hover:text-white"
                }`}
              >
                {config.autoTrading && config.autopilotMode ? "ENGAGED" : "OFF"}
              </button>
            </div>

            {/* Simulation Mode & True Buy/Sell Toggle Strip */}
            <div className="grid grid-cols-3 gap-1 pt-1">
              {/* Simulation Mode Toggle (Target: False) */}
              <button
                type="button"
                onClick={onToggleSimulationMode}
                className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  !config.simulationMode
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-xs"
                    : "bg-[#0e1a2c] border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
                title="Toggle Simulation: FALSE = Real Orders, TRUE = Demo Simulator"
              >
                <span className="text-[8px] text-slate-400 uppercase font-sans">Sim:</span>
                <span>{config.simulationMode ? "TRUE" : "FALSE"}</span>
              </button>

              {/* True Buy Toggle */}
              <button
                type="button"
                onClick={onToggleAllowBuy}
                className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  config.allowBuy !== false
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-xs"
                    : "bg-[#0e1a2c] border-slate-700 text-slate-400 opacity-60"
                }`}
                title="Toggle True Buy: TRUE = Allowed, FALSE = Blocked"
              >
                <span className="text-[8px] text-slate-400 uppercase font-sans">Buy:</span>
                <span>{config.allowBuy !== false ? "TRUE" : "FALSE"}</span>
              </button>

              {/* True Sell Toggle */}
              <button
                type="button"
                onClick={onToggleAllowSell}
                className={`px-1.5 py-1 rounded text-[9px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
                  config.allowSell !== false
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-xs"
                    : "bg-[#0e1a2c] border-slate-700 text-slate-400 opacity-60"
                }`}
                title="Toggle True Sell: TRUE = Allowed, FALSE = Blocked"
              >
                <span className="text-[8px] text-slate-400 uppercase font-sans">Sell:</span>
                <span>{config.allowSell !== false ? "TRUE" : "FALSE"}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Status:</span>
              <span id="status" className={`status font-semibold text-[11px] truncate max-w-[150px] ${isReal ? "text-rose-400" : "text-[#00e5a8]"}`}>
                {statusText}
              </span>
            </div>

            {/* MT5 Connection Status & Real-time Latency Line Chart */}
            <div className="pt-2 border-t border-[#1e3456]/60 space-y-1.5">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${connectionState.status === "CONNECTED" ? "bg-[#00e5a8] animate-ping" : "bg-slate-500"}`} />
                  <span>MT5 Connection:</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenBrokerModal}
                  className="text-slate-300 hover:text-[#00e5a8] underline cursor-pointer truncate max-w-[150px] font-mono text-[10.5px] transition-colors"
                  title="Configure MT5 Broker & IPC parameters"
                >
                  {connectionState.status === "CONNECTED"
                    ? `${connectionState.credentials.server} (#${connectionState.credentials.login})`
                    : `${connectionState.credentials.server || "Exness-Real10"} (Click to link)`}
                </button>
              </div>

              {/* Real-time Latency Line Chart (Recharts) */}
              <LatencyLineChart
                data={latencyHistory || connectionState.latencyHistory || []}
                currentPing={connectionState.pingMs}
                status={connectionState.status}
                serverName={connectionState.credentials.server || "Exness-Real10"}
                height={52}
                compact={true}
                onOpenSettings={onOpenBrokerModal}
                title="MT5 Latency & Jitter"
              />

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-sky-400 font-medium">
                  <Shield className="w-3 h-3 text-sky-400" />
                  <span>MT5 Low-Latency VPN:</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenVpnModal || onOpenBrokerModal}
                  className="text-sky-300 hover:text-sky-200 font-mono text-[10.5px] underline cursor-pointer transition-colors"
                  title="Configure MetaTrader 5 Low-Latency VPN Tunnel"
                >
                  London LD4 (9.2ms) · Active
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: ACCOUNT OVERVIEW */}
        <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Account Overview
              </h2>
              {isReal ? (
                <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/50 px-1.5 py-0.2 rounded border border-rose-800/40">
                  REAL / LIVE BROKER
                </span>
              ) : (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded">
                  DEMO EQUITY
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Balance</p>
            <div
              id="balance"
              className={`balance text-3xl font-extrabold font-mono tracking-tight ${
                isReal ? "text-emerald-400" : "text-[#00e5a8]"
              }`}
            >
              ${report.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[#1e3456]/60 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans text-slate-400">Equity:</span>
              <span
                id="equity"
                className={`font-bold ${
                  equity >= report.initialBalance ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                ${equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans text-slate-400">Free Margin:</span>
              <span id="margin" className="text-slate-200">
                ${freeMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-sans text-slate-400">Floating P/L:</span>
              <span
                className={`font-bold ${
                  floatingPnL >= 0 ? "text-[#00e5a8]" : "text-rose-400"
                }`}
              >
                {floatingPnL >= 0 ? "+" : ""}${floatingPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: AI MARKET ANALYSIS */}
        <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#00e5a8]" />
                <span>AI Market Analysis</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Scalper (EMA+RSI)</span>
            </div>

            <div className="flex flex-col gap-1.5 mb-2">
              <label htmlFor="pair" className="text-[11px] text-slate-400">
                Currency Pair:
              </label>
              <div className="flex items-center gap-2">
                <select
                  id="pair"
                  value={selectedPair.symbol}
                  onChange={(e) => {
                    const pair = FOREX_PAIRS.find((p) => p.symbol === e.target.value);
                    if (pair) onSelectPair(pair);
                  }}
                  className="flex-1 bg-[#0e1a2c] border border-[#1e3456] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-[#00e5a8] cursor-pointer"
                >
                  {FOREX_PAIRS.map((p) => (
                    <option key={p.symbol} value={p.symbol} className="bg-[#142238]">
                      {p.symbol}
                    </option>
                  ))}
                </select>

                <button
                  onClick={onAnalyzeMarket}
                  className="demo px-3 py-1.5 text-xs font-bold text-[#08111f] bg-[#00c896] hover:bg-[#00e5a8] rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  ANALYZE
                </button>
              </div>
            </div>
          </div>

          {/* Live Signal Output */}
          <div className="p-2 rounded bg-[#0a1424] border border-[#1b2f4c] text-[11px] leading-snug">
            {lastAnalysis ? (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{selectedPair.symbol}</span>
                  <span
                    id="signal"
                    className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      lastAnalysis.signal === "BUY"
                        ? "bg-emerald-500/20 text-[#00e5a8]"
                        : lastAnalysis.signal === "SELL"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-slate-700/40 text-slate-300"
                    }`}
                  >
                    {lastAnalysis.signal}
                  </span>
                </div>
                <p className="text-slate-400 text-[10px] truncate" title={lastAnalysis.reason}>
                  {lastAnalysis.reason || "Analyzing moving averages & momentum"}
                </p>
              </div>
            ) : (
              <p id="signal" className="text-slate-500 italic">Waiting for analysis...</p>
            )}
          </div>
        </div>

        {/* CARD 4: RISK MANAGEMENT */}
        <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Risk Management
              </h2>
              <span className="text-[10px] font-mono text-rose-400 font-semibold">
                Limit: {config.maxDrawdownPercent}%
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-2.5">
              Maximum drawdown protection: <span className="font-bold text-slate-200">{config.maxDrawdownPercent}%</span>
            </p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={onStopBot}
                disabled={!botRunning}
                className="stop py-2 px-3 text-xs font-bold rounded-lg bg-[#f1c40f] hover:bg-amber-400 text-[#08111f] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>STOP BOT</span>
              </button>

              <button
                onClick={onStartBot}
                disabled={botRunning}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1 font-extrabold ${
                  isReal
                    ? "bg-[#e74c3c] hover:bg-rose-500 text-white shadow-md shadow-rose-900/30"
                    : "demo bg-[#00c896] hover:bg-[#00e5a8] text-[#08111f]"
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>
                  {botRunning
                    ? isReal
                      ? "LIVE RUNNING"
                      : "RUNNING"
                    : isReal
                    ? "START REAL AUTOPILOT"
                    : "START SIMULATOR"}
                </span>
              </button>
            </div>
          </div>

          {/* Circuit Breaker Status */}
          <div className="pt-2 border-t border-[#1e3456]/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Drawdown:</span>
            <span className="font-mono text-slate-200 font-semibold">
              {report.currentDrawdown.toFixed(2)}%
            </span>
            <span
              className={`font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                report.paused ? "bg-rose-900/40 text-rose-300" : "bg-[#00e5a8]/20 text-[#00e5a8]"
              }`}
            >
              {report.paused ? "CIRCUIT BREAKER PAUSED" : "PROTECTED"}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 5: SYSTEM LOGS */}
      <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00e5a8]" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              System Logs & Live Execution Feed
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isReal && (
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                REAL ORDERS ENABLED
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-400">
              {logs.length > 0 ? `${logs.length} events logged` : "Ready"}
            </span>
          </div>
        </div>

        <div
          ref={logContainerRef}
          id="logs"
          className="bg-[#0a1424] border border-[#1b2f4c] rounded-lg p-3 text-xs font-mono text-slate-300 h-28 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700"
        >
          {logs.length === 0 ? (
            <div className="text-slate-400">System initialized.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="leading-relaxed flex items-start gap-2">
                <span className="text-slate-500 shrink-0 text-[11px]">[{log.time}]</span>
                <span
                  className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                    log.type === "ORDER_OPEN"
                      ? "bg-emerald-500/20 text-[#00e5a8]"
                      : log.type === "ORDER_CLOSE"
                      ? "bg-blue-500/20 text-blue-300"
                      : log.type === "RISK_ALERT"
                      ? "bg-rose-500/20 text-rose-300"
                      : log.type === "SIGNAL"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-slate-700/30 text-slate-400"
                  }`}
                >
                  {log.type}
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
