import React, { useState } from "react";
import { BotConfig } from "../types/trading";
import {
  X,
  Save,
  RotateCcw,
  Activity,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

interface ParameterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BotConfig;
  onSave: (updatedConfig: BotConfig) => void;
}

const EMA_INTERVAL_PRESETS = [
  { label: "Scalp (5 / 13)", fast: 5, slow: 13, tag: "Ultra-Fast" },
  { label: "Day Trade (9 / 21)", fast: 9, slow: 21, tag: "Default" },
  { label: "Swing (12 / 26)", fast: 12, slow: 26, tag: "MACD Cross" },
  { label: "Trend (20 / 50)", fast: 20, slow: 50, tag: "Medium Trend" },
  { label: "Macro (50 / 200)", fast: 50, slow: 200, tag: "Golden Cross" },
];

export const ParameterSettingsModal: React.FC<ParameterSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<BotConfig>({ ...config });
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: keyof BotConfig, value: number) => {
    setValidationError(null);
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyPreset = (fast: number, slow: number) => {
    setValidationError(null);
    setFormData((prev) => ({
      ...prev,
      fastEMA: fast,
      slowEMA: slow,
    }));
  };

  const handleAdjustFast = (delta: number) => {
    const nextVal = Math.max(2, Math.min(100, (formData.fastEMA || 9) + delta));
    handleChange("fastEMA", nextVal);
  };

  const handleAdjustSlow = (delta: number) => {
    const nextVal = Math.max(5, Math.min(250, (formData.slowEMA || 21) + delta));
    handleChange("slowEMA", nextVal);
  };

  const handleResetDefaults = () => {
    setValidationError(null);
    setFormData({
      ...formData,
      fastEMA: 9,
      slowEMA: 21,
      rsiPeriod: 14,
      rsiBuyThreshold: 70,
      rsiSellThreshold: 30,
      initialBalance: 1000,
      riskPercent: 1,
      maxDrawdownPercent: 10,
      stopDistancePips: 20,
      takeProfitRatio: 1.5,
      simulationMode: false,
      allowBuy: true,
      allowSell: true,
      rsiFilterEnabled: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.fastEMA >= formData.slowEMA) {
      setValidationError(
        `Fast EMA (${formData.fastEMA}) must be smaller than Slow EMA (${formData.slowEMA}) for crossover calculation.`
      );
      return;
    }
    onSave(formData);
    onClose();
  };

  const emaSpread = formData.slowEMA - formData.fastEMA;
  const isEmaInvalid = formData.fastEMA >= formData.slowEMA;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-[#0e121a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0a0d13]">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-400" />
              <span>Bot Strategy &amp; Risk Configuration</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              EMA crossover intervals, RSI filter, position sizing &amp; autopilot controls
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto text-xs flex-1">
          {/* Validation Banner if Invalid */}
          {(validationError || isEmaInvalid) && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/60 text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs">
                <span className="font-bold block">Invalid EMA Interval Configuration:</span>
                <span>
                  {validationError ||
                    `Fast EMA (${formData.fastEMA}) must be strictly less than Slow EMA (${formData.slowEMA}) to calculate valid crossover signals.`}
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: EMA PERIOD INTERVALS & SIGNAL CALCULATION LOGIC */}
          <div className="p-4 rounded-xl bg-gradient-to-b from-[#111927] to-[#0c121d] border border-sky-500/30 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>EMA Period Intervals (Signal Calculation Logic)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Crossover between Fast and Slow Exponential Moving Averages generates automated BUY and SELL trade entries.
                </p>
              </div>

              {/* Interval Spread Badge */}
              <div className="text-right shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    isEmaInvalid
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                  }`}
                >
                  {isEmaInvalid ? "Spread: INVALID" : `Δ Spread: ${emaSpread} bars`}
                </span>
              </div>
            </div>

            {/* Quick 1-Click Preset Interval Selector */}
            <div>
              <span className="text-[10.5px] font-semibold text-slate-300 block mb-1.5">
                Quick Preset Interval Pairs:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {EMA_INTERVAL_PRESETS.map((preset) => {
                  const isSelected =
                    formData.fastEMA === preset.fast && formData.slowEMA === preset.slow;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset.fast, preset.slow)}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-sky-500/20 border-sky-400 text-sky-200 shadow-xs"
                          : "bg-[#090d14] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-mono font-bold text-[11px] leading-tight block">
                        {preset.fast} / {preset.slow}
                      </span>
                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">
                        {preset.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Interval Adjustment Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Fast EMA Period */}
              <div className="p-3 rounded-lg bg-[#080d16] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold text-[11.5px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    <span>Fast EMA Period</span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-800/40">
                    Lead Line
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustFast(-1)}
                    disabled={formData.fastEMA <= 2}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Decrease Fast EMA period"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={formData.fastEMA}
                    onChange={(e) => handleChange("fastEMA", Number(e.target.value))}
                    className="flex-1 bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold text-center text-sm focus:border-sky-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustFast(1)}
                    disabled={formData.fastEMA >= 100}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Increase Fast EMA period"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 leading-snug">
                  Fast reactive line. Shorter intervals increase sensitivity to immediate price shifts.
                </p>
              </div>

              {/* Slow EMA Period */}
              <div className="p-3 rounded-lg bg-[#080d16] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-200 font-semibold text-[11.5px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                    <span>Slow EMA Period</span>
                  </label>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-800/40">
                    Baseline Filter
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustSlow(-1)}
                    disabled={formData.slowEMA <= 5}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Decrease Slow EMA period"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min={5}
                    max={250}
                    value={formData.slowEMA}
                    onChange={(e) => handleChange("slowEMA", Number(e.target.value))}
                    className="flex-1 bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono font-bold text-center text-sm focus:border-sky-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustSlow(1)}
                    disabled={formData.slowEMA >= 250}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
                    title="Increase Slow EMA period"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 leading-snug">
                  Baseline trend filter. Longer intervals smooth out noise and eliminate false whipsaws.
                </p>
              </div>
            </div>

            {/* Live Signal Logic Summary Card */}
            <div className="p-2.5 rounded-lg bg-[#060a10] border border-slate-800/80 space-y-1.5">
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400 block">
                Resulting Signal Execution Logic:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                <div className="flex items-start gap-1.5 text-emerald-300">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    <strong>BUY:</strong> Fast EMA ({formData.fastEMA}) crosses <u>above</u> Slow EMA ({formData.slowEMA})
                    {formData.rsiFilterEnabled !== false ? ` + RSI < ${formData.rsiBuyThreshold}` : " (RSI Filter Bypassed)"}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    <strong>SELL:</strong> Fast EMA ({formData.fastEMA}) crosses <u>below</u> Slow EMA ({formData.slowEMA})
                    {formData.rsiFilterEnabled !== false ? ` + RSI > ${formData.rsiSellThreshold}` : " (RSI Filter Bypassed)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: RSI MOMENTUM FILTER (INDEPENDENT TOGGLE) */}
          <div className="p-3.5 rounded-xl bg-[#090e17] border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>RSI Threshold Filter</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Filters out bad entries at overbought peaks and oversold bottoms. Can be toggled independently from EMA intervals.
                </p>
              </div>

              {/* Independent Toggle Switch */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-400">
                  {formData.rsiFilterEnabled !== false ? "FILTER ON" : "BYPASSED"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      rsiFilterEnabled: prev.rsiFilterEnabled === false,
                    }))
                  }
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer border ${
                    formData.rsiFilterEnabled !== false
                      ? "bg-purple-600 border-purple-400"
                      : "bg-slate-800 border-slate-700"
                  }`}
                  role="switch"
                  aria-checked={formData.rsiFilterEnabled !== false}
                  title="Toggle RSI threshold filter independently from EMA crossover logic"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.rsiFilterEnabled !== false ? "translate-x-6.5" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Status explanation */}
            {formData.rsiFilterEnabled === false ? (
              <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-600/40 text-amber-300 text-[11px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>
                  <strong>RSI Filter Bypassed:</strong> Signals trigger immediately upon Fast/Slow EMA crossovers regardless of whether the RSI is overbought or oversold.
                </span>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-600/30 text-purple-300 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>
                  <strong>RSI Threshold Active:</strong> Blocks BUY when RSI &ge; {formData.rsiBuyThreshold} (overbought) and blocks SELL when RSI &le; {formData.rsiSellThreshold} (oversold).
                </span>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-3 transition-opacity ${formData.rsiFilterEnabled === false ? "opacity-45" : "opacity-100"}`}>
              <div>
                <label className="block text-slate-300 mb-1">RSI Lookback Period</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={formData.rsiPeriod}
                  onChange={(e) => handleChange("rsiPeriod", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 14 bars</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Threshold Guardrails</label>
                <div className="flex gap-1.5">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={50}
                      max={90}
                      disabled={formData.rsiFilterEnabled === false}
                      value={formData.rsiBuyThreshold}
                      onChange={(e) => handleChange("rsiBuyThreshold", Number(e.target.value))}
                      className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono text-center focus:outline-none disabled:bg-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 block text-center">Buy &lt; {formData.rsiBuyThreshold}</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={10}
                      max={50}
                      disabled={formData.rsiFilterEnabled === false}
                      value={formData.rsiSellThreshold}
                      onChange={(e) => handleChange("rsiSellThreshold", Number(e.target.value))}
                      className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono text-center focus:outline-none disabled:bg-slate-900"
                    />
                    <span className="text-[10px] text-slate-500 block text-center">Sell &gt; {formData.rsiSellThreshold}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Account & Risk Management */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Risk & Capital Sizing
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Initial Balance ($)</label>
                <input
                  type="number"
                  step={500}
                  min={100}
                  value={formData.initialBalance}
                  onChange={(e) => handleChange("initialBalance", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Risk Per Trade (%)</label>
                <input
                  type="number"
                  step={0.5}
                  min={0.1}
                  max={10}
                  value={formData.riskPercent}
                  onChange={(e) => handleChange("riskPercent", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Units = (Balance × Risk%) / SL</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Max Drawdown Limit (%)</label>
                <input
                  type="number"
                  step={1}
                  min={2}
                  max={50}
                  value={formData.maxDrawdownPercent}
                  onChange={(e) => handleChange("maxDrawdownPercent", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Emergency auto-pause threshold</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Stop Loss (Pips)</label>
                <input
                  type="number"
                  min={5}
                  max={150}
                  value={formData.stopDistancePips}
                  onChange={(e) => handleChange("stopDistancePips", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Fixed stop distance</span>
              </div>

              <div className="col-span-2">
                <label className="block text-slate-300 mb-1">
                  Take Profit Target (Risk:Reward Ratio)
                </label>
                <select
                  value={formData.takeProfitRatio}
                  onChange={(e) => handleChange("takeProfitRatio", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1.0}>1:1.0 (Equal risk/reward)</option>
                  <option value={1.5}>1:1.5 (Standard conservative)</option>
                  <option value={2.0}>1:2.0 (High reward target)</option>
                  <option value={3.0}>1:3.0 (Trend runner)</option>
                  <option value={0}>Exit only on opposite EMA crossover signal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Algorithmic Autopilot Management */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center justify-between">
              <span>Algorithmic Autopilot Rules</span>
              <span className="text-[10px] text-slate-400 font-normal font-sans">
                Autonomous Trade Engine
              </span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">Trailing Stop Distance (Pips)</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={formData.trailingStopDistancePips || 15}
                  onChange={(e) => handleChange("trailingStopDistancePips", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Trails SL behind winning price</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Breakeven Lock Trigger (Pips)</label>
                <input
                  type="number"
                  min={3}
                  max={50}
                  value={formData.breakEvenTriggerPips || 10}
                  onChange={(e) => handleChange("breakEvenTriggerPips", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Secures SL at Entry + 1 pip</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Max Spread Filter (Pips)</label>
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  max={10}
                  value={formData.maxSpreadFilterPips || 2.0}
                  onChange={(e) => handleChange("maxSpreadFilterPips", Number(e.target.value))}
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Skips trades during wide news spreads</span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Opposite Signal Auto-Close</label>
                <select
                  value={formData.oppositeSignalClose ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      oppositeSignalClose: e.target.value === "true",
                    }))
                  }
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-purple-500 focus:outline-none"
                >
                  <option value="true">Enabled (Close on reverse crossover)</option>
                  <option value="false">Disabled (Hold until SL or TP)</option>
                </select>
                <span className="text-[10px] text-slate-500">Prevents holding counter-trend</span>
              </div>
            </div>

            {/* Smart Trailing Stop (ATR Volatility-based) */}
            <div className="mt-3 p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-purple-300 text-xs">Smart Trailing Stop (ATR-Based)</span>
                  <p className="text-[10px] text-slate-400">
                    Dynamically expands SL in high market fluctuations and tightens in quiet ranges
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      smartTrailingStop: !prev.smartTrailingStop,
                    }))
                  }
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    formData.smartTrailingStop
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {formData.smartTrailingStop ? "ACTIVE" : "FIXED PIPS"}
                </button>
              </div>

              {formData.smartTrailingStop && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1">ATR Volatility Period</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={formData.atrPeriod || 14}
                      onChange={(e) => handleChange("atrPeriod", Number(e.target.value))}
                      className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Default: 14 bars</span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">ATR Distance Multiplier</label>
                    <input
                      type="number"
                      step={0.1}
                      min={0.5}
                      max={5.0}
                      value={formData.atrMultiplier || 1.8}
                      onChange={(e) => handleChange("atrMultiplier", Number(e.target.value))}
                      className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-purple-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Trails at ATR × Multiplier</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Order Execution & Simulation Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Order Execution & Simulation Controls</span>
              <span className="text-[10px] text-slate-400 font-normal font-sans">
                Real MT5 vs Simulation
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Simulation Mode Toggle */}
              <div>
                <label className="block text-slate-300 mb-1">Simulation Mode</label>
                <select
                  value={formData.simulationMode ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      simulationMode: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    !formData.simulationMode
                      ? "border-rose-500 text-rose-300"
                      : "border-amber-500 text-amber-300"
                  }`}
                >
                  <option value="false">FALSE (Real MT5 Orders)</option>
                  <option value="true">TRUE (Offline Simulation)</option>
                </select>
                <span className="text-[10px] text-slate-500">Set FALSE for real broker execution</span>
              </div>

              {/* True BUY Orders */}
              <div>
                <label className="block text-slate-300 mb-1">True BUY Orders</label>
                <select
                  value={formData.allowBuy !== false ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      allowBuy: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    formData.allowBuy !== false
                      ? "border-emerald-500 text-emerald-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <option value="true">TRUE (Buy Active)</option>
                  <option value="false">FALSE (Buy Blocked)</option>
                </select>
                <span className="text-[10px] text-slate-500">Enables automated & manual BUY</span>
              </div>

              {/* True SELL Orders */}
              <div>
                <label className="block text-slate-300 mb-1">True SELL Orders</label>
                <select
                  value={formData.allowSell !== false ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      allowSell: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    formData.allowSell !== false
                      ? "border-rose-500 text-rose-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <option value="true">TRUE (Sell Active)</option>
                  <option value="false">FALSE (Sell Blocked)</option>
                </select>
                <span className="text-[10px] text-slate-500">Enables automated & manual SELL</span>
              </div>

              {/* Non-Stop Continuous Robot */}
              <div>
                <label className="block text-slate-300 mb-1">Non-Stop Robot</label>
                <select
                  value={formData.nonStopMode !== false ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      nonStopMode: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    formData.nonStopMode !== false
                      ? "border-emerald-500 text-emerald-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <option value="true">24/7 ACTIVE (Never Stop)</option>
                  <option value="false">STANDARD (Pause on Limits)</option>
                </select>
                <span className="text-[10px] text-slate-500">Continuous execution without halting</span>
              </div>
            </div>
          </div>

          {/* Section 5: Market Sentiment Autotrading & Close by Profit */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              <span>Sentiment Autotrading &amp; Close by Profit</span>
              <span className="text-[10px] text-slate-400 font-normal font-sans">
                Google News Grounding
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Close by Profit Toggle */}
              <div>
                <label className="block text-slate-300 mb-1">Close by Profit</label>
                <select
                  value={formData.closeByProfit !== false ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      closeByProfit: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    formData.closeByProfit !== false
                      ? "border-amber-500 text-amber-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <option value="true">ENABLED (Auto-Lock)</option>
                  <option value="false">DISABLED</option>
                </select>
                <span className="text-[10px] text-slate-500">Auto-exit at profit goal</span>
              </div>

              {/* Profit Dollar Target */}
              <div>
                <label className="block text-slate-300 mb-1">Profit Target ($)</label>
                <input
                  type="number"
                  min={5}
                  max={1000}
                  value={formData.closeProfitDollarTarget ?? 25}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      closeProfitDollarTarget: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: $25.00</span>
              </div>

              {/* Profit Pips Target */}
              <div>
                <label className="block text-slate-300 mb-1">Profit Target (Pips)</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={formData.closeProfitPipsTarget ?? 12}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      closeProfitPipsTarget: Number(e.target.value),
                    }))
                  }
                  className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500">Default: 12 pips</span>
              </div>

              {/* Sentiment Autotrading Toggle */}
              <div>
                <label className="block text-slate-300 mb-1">Sentiment Autotrading</label>
                <select
                  value={formData.sentimentAutotrading !== false ? "true" : "false"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sentimentAutotrading: e.target.value === "true",
                    }))
                  }
                  className={`w-full bg-[#0a0d13] border rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                    formData.sentimentAutotrading !== false
                      ? "border-emerald-500 text-emerald-300"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  <option value="true">ACTIVE (Aligned)</option>
                  <option value="false">OFF</option>
                </select>
                <span className="text-[10px] text-slate-500">Alters entry by news score</span>
              </div>
            </div>
          </div>

          {/* Buttons Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply & Re-run</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
