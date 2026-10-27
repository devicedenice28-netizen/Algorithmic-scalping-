import React from "react";
import {
  Play,
  Pause,
  SkipForward,
  FastForward,
  RotateCcw,
  SlidersHorizontal,
  Bot,
  Zap,
  Radio,
  Shield,
  ShieldCheck,
  Infinity,
  Volume2,
  VolumeX,
} from "lucide-react";
import { FOREX_PAIRS, MARKET_REGIMES, MarketRegime } from "../lib/marketData";
import { ForexPairInfo } from "../types/trading";

interface StrategyControlsProps {
  isPlaying: boolean;
  playbackSpeed: number;
  currentStep: number;
  totalSteps: number;
  selectedPair: ForexPairInfo;
  selectedRegime: MarketRegime;
  autoTrading: boolean;
  autopilotMode?: boolean;
  capitalShieldMode?: boolean;
  simulationMode?: boolean;
  allowBuy?: boolean;
  allowSell?: boolean;
  nonStopMode?: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onChangeSpeed: (speed: number) => void;
  onSelectPair: (pair: ForexPairInfo) => void;
  onSelectRegime: (regime: MarketRegime) => void;
  onToggleAutoTrading: () => void;
  onToggleAutopilot?: () => void;
  onToggleCapitalShield?: () => void;
  onToggleSimulationMode?: () => void;
  onToggleAllowBuy?: () => void;
  onToggleAllowSell?: () => void;
  onToggleNonStopMode?: () => void;
  onRunInstantBacktest: () => void;
  onReset: () => void;
  onOpenSettings: () => void;
}

export const StrategyControls: React.FC<StrategyControlsProps> = ({
  isPlaying,
  playbackSpeed,
  currentStep,
  totalSteps,
  selectedPair,
  selectedRegime,
  autoTrading,
  autopilotMode = true,
  capitalShieldMode = false,
  simulationMode = false,
  allowBuy = true,
  allowSell = true,
  nonStopMode = true,
  soundEnabled = true,
  onToggleSound,
  onTogglePlay,
  onStepForward,
  onChangeSpeed,
  onSelectPair,
  onSelectRegime,
  onToggleAutoTrading,
  onToggleAutopilot,
  onToggleCapitalShield,
  onToggleSimulationMode,
  onToggleAllowBuy,
  onToggleAllowSell,
  onToggleNonStopMode,
  onRunInstantBacktest,
  onReset,
  onOpenSettings,
}) => {
  const speeds = [1, 2, 5, 10, 25, 40, 60, 100];

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#0e121a] border border-slate-800/80 rounded-lg text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Group 1: Symbol & Scenario Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Symbol Select */}
          <div className="flex items-center gap-1.5 bg-[#0a0d13] border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400 font-medium">Symbol:</span>
            <select
              value={selectedPair.symbol}
              onChange={(e) => {
                const pair = FOREX_PAIRS.find((p) => p.symbol === e.target.value);
                if (pair) onSelectPair(pair);
              }}
              className="bg-transparent text-slate-100 font-semibold focus:outline-none cursor-pointer"
            >
              {FOREX_PAIRS.map((p) => (
                <option key={p.symbol} value={p.symbol} className="bg-[#0e121a] text-slate-100">
                  {p.symbol} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Market Condition / Scenario Select */}
          <div className="flex items-center gap-1.5 bg-[#0a0d13] border border-slate-800 rounded px-2.5 py-1">
            <span className="text-slate-400 font-medium">Regime:</span>
            <select
              value={selectedRegime}
              onChange={(e) => onSelectRegime(e.target.value as MarketRegime)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer text-xs"
            >
              {MARKET_REGIMES.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#0e121a] text-slate-100">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Zero-Loss Capital Shield Mode Button */}
          {onToggleCapitalShield && (
            <button
              onClick={onToggleCapitalShield}
              title="Capital Shield: Ultra-fast +3 pip breakeven lock & trailing stop to compound profit while eliminating loss"
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded border transition-colors cursor-pointer ${
                capitalShieldMode
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${capitalShieldMode ? "text-emerald-400" : "text-slate-500"}`} />
              <span>Zero-Loss Shield: {capitalShieldMode ? "ACTIVE" : "OFF"}</span>
            </button>
          )}

          {/* Autopilot Master Engine Toggle for Buying & Selling */}
          {onToggleAutopilot && (
            <button
              onClick={onToggleAutopilot}
              title="Autopilot for buying and selling automatically upon EMA crossover with Smart Trailing Stop"
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded border transition-colors cursor-pointer ${
                autopilotMode && autoTrading
                  ? "bg-[#00e5a8]/20 border-[#00e5a8]/60 text-[#00e5a8] shadow-xs"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className={`w-3.5 h-3.5 ${autopilotMode && autoTrading ? "text-[#00e5a8] animate-pulse" : "text-slate-500"}`} />
              <span>Autopilot (Buy &amp; Sell): {autopilotMode && autoTrading ? "ENGAGED" : "OFF"}</span>
            </button>
          )}

          {/* Non-Stop Robot 24/7 Continuous Execution Toggle */}
          {onToggleNonStopMode && (
            <button
              onClick={onToggleNonStopMode}
              title="Non-Stop Robot: Runs continuously 24/7 without stopping or pausing on bar limits"
              className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded border transition-colors cursor-pointer ${
                nonStopMode
                  ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-xs"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Infinity className={`w-3.5 h-3.5 ${nonStopMode ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              <span>Non-Stop Robot: {nonStopMode ? "24/7 ACTIVE" : "OFF"}</span>
            </button>
          )}

          {/* Simulation Mode Toggle (Target: False = Real MT5 Orders) */}
          {onToggleSimulationMode && (
            <button
              onClick={onToggleSimulationMode}
              title="Simulation Mode: FALSE executes Real Live Orders on MT5 broker, TRUE runs offline simulator"
              className={`flex items-center gap-1.5 px-2.5 py-1 font-mono font-bold rounded border transition-colors cursor-pointer ${
                !simulationMode
                  ? "bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-xs"
                  : "bg-amber-500/15 border-amber-500/50 text-amber-300"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${!simulationMode ? "text-rose-400 animate-pulse" : "text-amber-400"}`} />
              <span>Simulation: {simulationMode ? "TRUE (Demo)" : "FALSE (Real)"}</span>
            </button>
          )}

          {/* True Buy Orders Toggle (Target: True) */}
          {onToggleAllowBuy && (
            <button
              onClick={onToggleAllowBuy}
              title="Toggle True Buy execution (True = Buy orders placed, False = Buy orders blocked)"
              className={`px-2 py-1 font-mono font-semibold rounded border transition-colors cursor-pointer ${
                allowBuy
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 line-through opacity-60"
              }`}
            >
              <span>Buy: {allowBuy ? "TRUE" : "FALSE"}</span>
            </button>
          )}

          {/* True Sell Orders Toggle (Target: True) */}
          {onToggleAllowSell && (
            <button
              onClick={onToggleAllowSell}
              title="Toggle True Sell execution (True = Sell orders placed, False = Sell orders blocked)"
              className={`px-2 py-1 font-mono font-semibold rounded border transition-colors cursor-pointer ${
                allowSell
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-400 line-through opacity-60"
              }`}
            >
              <span>Sell: {allowSell ? "TRUE" : "FALSE"}</span>
            </button>
          )}
        </div>

        {/* Group 2: Simulation Visual Playback Player */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-white rounded transition-colors cursor-pointer ${
              isPlaying
                ? "bg-amber-600 hover:bg-amber-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? "Pause" : "Play Simulation"}</span>
          </button>

          {/* Step 1 Bar */}
          <button
            onClick={onStepForward}
            disabled={isPlaying || currentStep >= totalSteps}
            title="Step Forward 1 Bar"
            className="flex items-center gap-1 px-2.5 py-1.5 font-medium text-slate-300 bg-[#0a0d13] hover:bg-slate-800 border border-slate-800 rounded disabled:opacity-40 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Step</span>
          </button>

          {/* Speed Segmented Buttons */}
          <div className="flex items-center bg-[#0a0d13] border border-slate-800 rounded p-0.5">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                  playbackSpeed === s
                    ? "bg-slate-700 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Audio Alert Sound Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              title={soundEnabled ? "Audio Alerts: ACTIVE (Trade Open / TP / SL notification sounds enabled) - Click to mute" : "Audio Alerts: MUTED - Click to enable sound alerts"}
              className={`flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono rounded border transition-colors cursor-pointer ${
                soundEnabled
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800/60 border-slate-700 text-slate-500 hover:text-slate-300"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">{soundEnabled ? "Audio ON" : "Muted"}</span>
            </button>
          )}

          {/* Candle Progress Counter */}
          <span className="font-mono text-xs text-slate-400 ml-1">
            Bar {currentStep}/{totalSteps}
          </span>
        </div>

        {/* Group 3: Instant Backtest, Reset, Settings */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRunInstantBacktest}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Run Instant Backtest</span>
          </button>

          <button
            onClick={onReset}
            title="Reset Simulation"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenSettings}
            title="Configure Bot Parameters"
            className="flex items-center gap-1 px-2.5 py-1.5 text-slate-300 hover:text-white bg-[#0a0d13] hover:bg-slate-800 border border-slate-800 rounded transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Bot Parameters</span>
          </button>
        </div>
      </div>

      {/* Autopilot Sub-Ribbon Telemetry */}
      {autopilotMode && (
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1 ${capitalShieldMode ? "text-emerald-300 font-semibold" : "text-sky-300"}`}>
              {capitalShieldMode ? <ShieldCheck className="w-3 h-3 text-emerald-400" /> : <Shield className="w-3 h-3 text-sky-400" />}
              <span>{capitalShieldMode ? "Zero-Loss Capital Shield Active:" : "Autopilot Active Rules:"}</span>
            </span>
            <span>{capitalShieldMode ? "Instant Breakeven Lock (+3p)" : "Breakeven Lock (+10p)"}</span>
            <span className="text-slate-600">·</span>
            <span>{capitalShieldMode ? "Rapid Trailing Lock (8p)" : "Trailing Stop (15p)"}</span>
            <span className="text-slate-600">·</span>
            <span>{capitalShieldMode ? "Asymmetric Reward (1:2.5)" : "Opposite Crossover Reversal"}</span>
            <span className="text-slate-600">·</span>
            <span>Max Spread Filter (2.0p)</span>
          </div>

          <div className="text-slate-500 text-[10px] font-sans">
            {capitalShieldMode
              ? "Zero-loss protection active: entries locked at profit immediately"
              : "Autonomous order routing & position management active"}
          </div>
        </div>
      )}
    </div>
  );
};
