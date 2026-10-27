import React from "react";
import { ArrowUp, ArrowDown, Bot, ShieldCheck, Zap, Radio, CheckCircle2, Sliders, Shield, Target, Globe } from "lucide-react";

interface OneClickTradingBarProps {
  currentPrice: number;
  spreadPips: number;
  pipSize: number;
  pipDecimals: number;
  onManualBuy: () => void;
  onManualSell: () => void;
  disabled?: boolean;
  autoTrading?: boolean;
  autopilotMode?: boolean;
  onToggleAutopilot?: () => void;
  lastSignal?: string | null;
  // Converted Simulation & True Buy/Sell Controls
  simulationMode?: boolean;
  allowBuy?: boolean;
  allowSell?: boolean;
  onToggleSimulationMode?: () => void;
  onToggleAllowBuy?: () => void;
  onToggleAllowSell?: () => void;
  // Close by Profit & Market Sentiment
  closeByProfit?: boolean;
  onToggleCloseByProfit?: () => void;
  sentimentScore?: number;
  onOpenSentimentModal?: () => void;
}

export const OneClickTradingBar: React.FC<OneClickTradingBarProps> = ({
  currentPrice,
  spreadPips,
  pipSize,
  pipDecimals,
  onManualBuy,
  onManualSell,
  disabled = false,
  autoTrading = true,
  autopilotMode = true,
  onToggleAutopilot,
  lastSignal,
  simulationMode = false,
  allowBuy = true,
  allowSell = true,
  onToggleSimulationMode,
  onToggleAllowBuy,
  onToggleAllowSell,
  closeByProfit = true,
  onToggleCloseByProfit,
  sentimentScore = 48,
  onOpenSentimentModal,
}) => {
  const bidPrice = currentPrice;
  const askPrice = currentPrice + spreadPips * pipSize;
  const isAutopilotActive = autoTrading && autopilotMode;

  return (
    <div className="flex flex-col gap-2.5 bg-[#0a0d13]/95 backdrop-blur-xs border border-slate-800 p-3 rounded-xl shadow-xl text-xs">
      {/* Simulation & Order Execution Master Ribbon */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded border ${simulationMode ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-[#00e5a8]/10 text-[#00e5a8] border-[#00e5a8]/30"}`}>
            <Bot className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-100 uppercase tracking-wider block">
                Order Execution
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-black tracking-normal uppercase border ${
                  simulationMode
                    ? "bg-amber-950/60 border-amber-600/40 text-amber-300"
                    : "bg-rose-950/70 border-rose-500/50 text-rose-300 shadow-xs"
                }`}
              >
                Simulation: {simulationMode ? "TRUE" : "FALSE"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-sans block">
              {simulationMode
                ? "Simulated Virtual Execution (Offline)"
                : "Real Live Broker MT5 Execution (Simulation: FALSE)"}
            </span>
          </div>
        </div>

        {/* Master Autopilot Toggle */}
        <button
          onClick={onToggleAutopilot}
          type="button"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono transition-all cursor-pointer border ${
            isAutopilotActive
              ? "bg-emerald-500/20 text-[#00e5a8] border-emerald-500/50 shadow-xs shadow-emerald-500/10 hover:bg-emerald-500/30"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
          }`}
          title="Toggle Autopilot for automatic buying and selling"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAutopilotActive ? "bg-[#00e5a8] animate-ping" : "bg-slate-500"
            }`}
          />
          <span>{isAutopilotActive ? "AUTOPILOT: ON" : "AUTOPILOT: OFF"}</span>
        </button>
      </div>

      {/* Simulation False & True Buy/Sell Control Strip */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-lg bg-[#070a10] border border-slate-800/80">
        {/* Toggle 1: Simulation Mode (Target: False) */}
        <button
          type="button"
          onClick={onToggleSimulationMode}
          className={`px-2 py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
            !simulationMode
              ? "bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-xs"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
          }`}
          title="Click to toggle Simulation Mode between FALSE (Live MT5 Orders) and TRUE (Offline Demo)"
        >
          <span className="text-[9px] text-slate-400 uppercase font-sans">Simulation</span>
          <span className="text-[11px] font-black">{simulationMode ? "TRUE (Demo)" : "FALSE (Live)"}</span>
        </button>

        {/* Toggle 2: True Buy (Target: True) */}
        <button
          type="button"
          onClick={onToggleAllowBuy}
          className={`px-2 py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
            allowBuy
              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-xs"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 opacity-60"
          }`}
          title="Click to toggle True Buy Orders (TRUE = Enabled, FALSE = Disabled)"
        >
          <span className="text-[9px] text-slate-400 uppercase font-sans">True Buy</span>
          <span className="text-[11px] font-black">{allowBuy ? "TRUE (Active)" : "FALSE (Off)"}</span>
        </button>

        {/* Toggle 3: True Sell (Target: True) */}
        <button
          type="button"
          onClick={onToggleAllowSell}
          className={`px-2 py-1.5 rounded text-[10px] font-mono font-bold flex flex-col items-center justify-center transition-all cursor-pointer border ${
            allowSell
              ? "bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-xs"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 opacity-60"
          }`}
          title="Click to toggle True Sell Orders (TRUE = Enabled, FALSE = Disabled)"
        >
          <span className="text-[9px] text-slate-400 uppercase font-sans">True Sell</span>
          <span className="text-[11px] font-black">{allowSell ? "TRUE (Active)" : "FALSE (Off)"}</span>
        </button>
      </div>

      {/* Autopilot Status Callout */}
      <div
        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-sans flex items-center justify-between ${
          isAutopilotActive
            ? "bg-emerald-950/25 border-emerald-500/30 text-emerald-300"
            : "bg-slate-900 border-slate-800 text-slate-400"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Radio className={`w-3.5 h-3.5 ${isAutopilotActive ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
          <span>
            {isAutopilotActive
              ? `Autopilot: Auto ${allowBuy ? "BUY" : ""}${allowBuy && allowSell ? " & " : ""}${allowSell ? "SELL" : ""} ${simulationMode ? "(Simulated)" : "(REAL LIVE EXECUTION)"}`
              : "Autopilot is PAUSED. Orders must be clicked manually."}
          </span>
        </span>
        <span className="font-mono text-[10px] font-bold uppercase">
          {simulationMode ? "SIM: TRUE" : "SIM: FALSE"}
        </span>
      </div>

      {/* DUAL DISPATCH CARDS (TRUE SELL & TRUE BUY) */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        {/* TRUE SELL CARD */}
        <div
          className={`flex flex-col justify-between p-2.5 rounded-lg border transition-all ${
            !allowSell
              ? "opacity-50 bg-slate-900/40 border-slate-800"
              : lastSignal === "SELL"
              ? "bg-rose-500/20 border-rose-500 text-rose-200 ring-2 ring-rose-500/40"
              : "bg-rose-500/5 border-rose-500/20 text-rose-300 hover:border-rose-500/40"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                <span>TRUE SELL: {allowSell ? "TRUE" : "FALSE"}</span>
              </span>
              {lastSignal === "SELL" && allowSell && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-rose-500 text-white font-bold animate-pulse">
                  AUTO TRIGGER
                </span>
              )}
            </div>
            <div className="text-base font-bold font-mono text-slate-100">
              {bidPrice.toFixed(pipDecimals)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              {allowSell
                ? `Auto-sells when Fast EMA < Slow EMA & RSI > 30 (${simulationMode ? "Simulation" : "REAL MT5"})`
                : "Sell execution disabled (allowSell = false)"}
            </p>
          </div>

          <button
            onClick={onManualSell}
            disabled={disabled || !allowSell}
            type="button"
            className={`mt-2 w-full py-1.5 px-2 text-[10px] font-bold font-sans uppercase rounded text-white transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              allowSell
                ? "bg-rose-600 hover:bg-rose-500 shadow-xs shadow-rose-900/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            title="Execute a True Sell Order immediately"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>{simulationMode ? "Simulate Sell" : "True SELL Now"}</span>
          </button>
        </div>

        {/* TRUE BUY CARD */}
        <div
          className={`flex flex-col justify-between p-2.5 rounded-lg border transition-all ${
            !allowBuy
              ? "opacity-50 bg-slate-900/40 border-slate-800"
              : lastSignal === "BUY"
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40"
              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-300 hover:border-emerald-500/40"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>TRUE BUY: {allowBuy ? "TRUE" : "FALSE"}</span>
              </span>
              {lastSignal === "BUY" && allowBuy && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500 text-white font-bold animate-pulse">
                  AUTO TRIGGER
                </span>
              )}
            </div>
            <div className="text-base font-bold font-mono text-slate-100">
              {askPrice.toFixed(pipDecimals)}
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
              {allowBuy
                ? `Auto-buys when Fast EMA > Slow EMA & RSI < 70 (${simulationMode ? "Simulation" : "REAL MT5"})`
                : "Buy execution disabled (allowBuy = false)"}
            </p>
          </div>

          <button
            onClick={onManualBuy}
            disabled={disabled || !allowBuy}
            type="button"
            className={`mt-2 w-full py-1.5 px-2 text-[10px] font-bold font-sans uppercase rounded text-white transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              allowBuy
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-xs shadow-emerald-900/30"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
            title="Execute a True Buy Order immediately"
          >
            <Zap className="w-3 h-3 fill-current" />
            <span>{simulationMode ? "Simulate Buy" : "True BUY Now"}</span>
          </button>
        </div>
      </div>

      {/* Spread & Autopilot Protection Safeguards */}
      <div className="p-2 bg-[#080b10] border border-slate-800/80 rounded-lg space-y-1 text-[10px] text-slate-400 font-sans">
        <div className="flex items-center justify-between font-mono">
          <span className="text-slate-500 uppercase">Live Spread:</span>
          <span className="text-slate-200 font-bold">{spreadPips.toFixed(1)} pips</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <span className="flex items-center gap-1 text-slate-300">
            <CheckCircle2 className="w-3 h-3 text-[#00e5a8]" />
            <span>Auto Breakeven Shield</span>
          </span>
          <span className="text-emerald-400 font-mono font-semibold">+0.5 pip Lock</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-slate-300">
            <ShieldCheck className="w-3 h-3 text-purple-400" />
            <span>Smart Trailing Stop</span>
          </span>
          <span className="text-purple-300 font-mono font-semibold">ATR Volatility Adapt</span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <button
            type="button"
            onClick={onToggleCloseByProfit}
            className="flex items-center gap-1 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
            title="Auto-exit when position reaches profit threshold (+$25 / +12 pips)"
          >
            <Target className={`w-3 h-3 ${closeByProfit ? "text-amber-400" : "text-slate-500"}`} />
            <span>Close by Profit</span>
          </button>
          <button
            type="button"
            onClick={onToggleCloseByProfit}
            className={`font-mono font-bold px-1.5 py-0.2 rounded text-[9px] cursor-pointer transition-colors ${
              closeByProfit
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {closeByProfit ? "+$25 LOCK" : "OFF"}
          </button>
        </div>
        {onOpenSentimentModal && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenSentimentModal}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Google News Macro Sentiment Grounding"
            >
              <Globe className="w-3 h-3 text-sky-400 animate-pulse" />
              <span>Google News Sentiment</span>
            </button>
            <button
              type="button"
              onClick={onOpenSentimentModal}
              className={`font-mono font-bold px-1.5 py-0.2 rounded text-[9px] cursor-pointer transition-colors border ${
                sentimentScore >= 0
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
            >
              {sentimentScore >= 0 ? `+${sentimentScore}` : sentimentScore}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
