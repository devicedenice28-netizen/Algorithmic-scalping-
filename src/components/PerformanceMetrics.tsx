import React, { useState, useMemo } from "react";
import { BotReport } from "../types/trading";
import {
  TrendingUp,
  BarChart2,
  Grid,
  BarChart3,
  Layers,
  Calendar,
  PieChart,
  ShieldAlert,
  Calculator,
  Zap,
  Info,
  Flame,
} from "lucide-react";
import { TradeDistributionChart } from "./TradeDistributionChart";
import { ProfitDistributionHistogram } from "./ProfitDistributionHistogram";
import { CorrelationMatrix } from "./CorrelationMatrix";
import { EquityHeatmap } from "./EquityHeatmap";
import { TradeEfficiencyRadialChart } from "./TradeEfficiencyRadialChart";
import { CumulativeBalanceLineChart } from "./CumulativeBalanceLineChart";
import { DrawdownAreaChart } from "./DrawdownAreaChart";
import { SessionVolatilityHeatmap } from "./SessionVolatilityHeatmap";

interface PerformanceMetricsProps {
  report: BotReport;
  currentSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  report,
  currentSymbol = "EUR/USD",
  onSelectSymbol,
}) => {
  const [activeModule, setActiveModule] = useState<
    "drawdown" | "distribution" | "volatility" | "correlation" | "heatmap" | "efficiency" | "equity" | "timeline"
  >("drawdown");

  const {
    initialBalance,
    currentBalance,
    peakBalance,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    grossProfit,
    grossLoss,
    netProfit,
    returnPercent,
    maxRecordedDrawdown,
    currentDrawdown,
    history,
  } = report;

  // -------------------------------------------------------------
  // Trade Expectancy Metric Calculation:
  // Trade Expectancy = (Average Win * Win Probability) - (Average Loss * Loss Probability)
  // -------------------------------------------------------------
  const winProbability = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const lossProbability = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const averageWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const averageLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;

  const tradeExpectancy = (averageWin * winProbability) - (averageLoss * lossProbability);

  // Expectancy in pips
  const expectancyPips = useMemo(() => {
    if (history.length === 0) return 0;
    const wins = history.filter((t) => t.profit > 0);
    const losses = history.filter((t) => t.profit < 0);
    const avgWinP = wins.length > 0 ? wins.reduce((acc, t) => acc + Math.max(0, t.pips), 0) / wins.length : 0;
    const avgLossP = losses.length > 0 ? losses.reduce((acc, t) => acc + Math.abs(Math.min(0, t.pips)), 0) / losses.length : 0;
    return (avgWinP * winProbability) - (avgLossP * lossProbability);
  }, [history, winProbability, lossProbability]);

  // Strategy viability qualitative grading
  const viability = useMemo(() => {
    if (totalTrades === 0) return { label: "Awaiting Data", color: "text-slate-400", badgeBg: "bg-slate-800" };
    if (tradeExpectancy >= 15) return { label: "High Positive Edge", color: "text-emerald-400", badgeBg: "bg-emerald-950/60 border-emerald-500/50" };
    if (tradeExpectancy > 0) return { label: "Viable (Positive Edge)", color: "text-teal-400", badgeBg: "bg-teal-950/60 border-teal-500/50" };
    if (tradeExpectancy === 0) return { label: "Break-Even", color: "text-amber-400", badgeBg: "bg-amber-950/60 border-amber-500/50" };
    return { label: "Negative Edge (Sub-optimal)", color: "text-rose-400", badgeBg: "bg-rose-950/60 border-rose-500/50" };
  }, [tradeExpectancy, totalTrades]);

  return (
    <div className="bg-[#0e121a] border border-slate-800/80 rounded-lg p-3.5 space-y-3.5">
      {/* Metric Cards Row: 5 Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* 1. Net Profit */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-slate-800">
          <div className="text-[11px] text-slate-400">Net Profit / ROI</div>
          <div
            className={`text-base font-bold font-mono tracking-tight ${
              netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
            <span className="text-xs ml-1 font-medium font-sans">
              ({returnPercent >= 0 ? "+" : ""}{returnPercent}%)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Initial: ${initialBalance.toLocaleString()}
          </div>
        </div>

        {/* 2. Win Rate */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-slate-800">
          <div className="text-[11px] text-slate-400">Win Rate</div>
          <div className="text-base font-bold font-mono text-slate-100">
            {winRate}%
            <span className="text-xs ml-1.5 font-normal text-slate-400 font-sans">
              ({winningTrades}W / {losingTrades}L)
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Total Trades: {totalTrades}
          </div>
        </div>

        {/* 3. Trade Expectancy (NEW FEATURED STRATEGY VIABILITY METRIC) */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-emerald-500/30 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <Calculator className="w-3 h-3 text-emerald-400" />
              <span>Trade Expectancy</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-mono border ${viability.badgeBg} ${viability.color}`}
            >
              {viability.label}
            </span>
          </div>
          <div
            className={`text-base font-bold font-mono tracking-tight mt-0.5 ${
              tradeExpectancy >= 0 ? "text-emerald-300" : "text-rose-400"
            }`}
          >
            {tradeExpectancy >= 0 ? "+" : ""}${tradeExpectancy.toFixed(2)}
            <span className="text-[11px] ml-1 font-normal text-slate-400">/ trade</span>
          </div>
          <div className="text-[9.5px] text-slate-400 font-mono mt-0.5 truncate" title={`(${averageWin.toFixed(1)} * ${(winProbability * 100).toFixed(0)}%) - (${averageLoss.toFixed(1)} * ${(lossProbability * 100).toFixed(0)}%)`}>
            Avg Win: ${averageWin.toFixed(0)} | Avg Loss: ${averageLoss.toFixed(0)}
          </div>
        </div>

        {/* 4. Profit Factor */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-slate-800">
          <div className="text-[11px] text-slate-400">Profit Factor</div>
          <div className="text-base font-bold font-mono text-slate-100">
            {profitFactor >= 999 ? "∞" : profitFactor.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            +${grossProfit.toFixed(0)} / -${grossLoss.toFixed(0)}
          </div>
        </div>

        {/* 5. Max Drawdown */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400">Max Recorded Drawdown</div>
          <div
            className={`text-base font-bold font-mono ${
              maxRecordedDrawdown >= 8 ? "text-rose-400" : "text-amber-400"
            }`}
          >
            {maxRecordedDrawdown.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Peak: ${peakBalance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Trade Expectancy Math Breakdown Pill */}
      <div className="px-3 py-2 rounded-md bg-[#0a0d13] border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-slate-300 font-semibold">Mathematical Trade Expectancy: </span>
            <span className="text-emerald-300 font-bold">
              ({averageWin > 0 ? `$${averageWin.toFixed(2)}` : "$0"} × {(winProbability * 100).toFixed(1)}%) − ({averageLoss > 0 ? `$${averageLoss.toFixed(2)}` : "$0"} × {(lossProbability * 100).toFixed(1)}%) = {tradeExpectancy >= 0 ? "+" : ""}${tradeExpectancy.toFixed(2)}
            </span>
            <span className="text-slate-500 ml-2">
              ({expectancyPips >= 0 ? `+${expectancyPips.toFixed(1)}` : expectancyPips.toFixed(1)} pips/trade)
            </span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          Strategy Viability: <strong className={viability.color}>{viability.label}</strong>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* 1. Drawdown History (D3 Area Chart) */}
          <button
            onClick={() => setActiveModule("drawdown")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "drawdown"
                ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Drawdown History (D3 Area)</span>
          </button>

          <button
            onClick={() => setActiveModule("distribution")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "distribution"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Profit Distribution (Histogram)</span>
          </button>

          {/* Market Volatility Section (D3 Session Heatmap) */}
          <button
            onClick={() => setActiveModule("volatility")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "volatility"
                ? "bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Market Volatility (Session Heatmap)</span>
          </button>

          <button
            onClick={() => setActiveModule("correlation")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "correlation"
                ? "bg-sky-950/80 text-sky-300 border border-sky-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Correlation Matrix</span>
          </button>

          <button
            onClick={() => setActiveModule("heatmap")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "heatmap"
                ? "bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Equity Heatmap</span>
          </button>

          <button
            onClick={() => setActiveModule("efficiency")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "efficiency"
                ? "bg-purple-950/80 text-purple-300 border border-purple-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Trade Efficiency (Radial)</span>
          </button>

          <button
            onClick={() => setActiveModule("equity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "equity"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Cumulative Balance (Line Chart)</span>
          </button>

          <button
            onClick={() => setActiveModule("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
              activeModule === "timeline"
                ? "bg-slate-800 text-slate-200 border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Trade Timeline</span>
          </button>
        </div>
      </div>

      {/* Module Content Rendering */}
      {activeModule === "drawdown" && (
        <DrawdownAreaChart
          history={history}
          initialBalance={initialBalance}
          peakBalance={peakBalance}
          maxRecordedDrawdown={maxRecordedDrawdown}
          currentSymbol={currentSymbol}
          maxDrawdownLimitPercent={5.0}
        />
      )}

      {activeModule === "distribution" && (
        <ProfitDistributionHistogram history={history} />
      )}

      {activeModule === "volatility" && (
        <SessionVolatilityHeatmap
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
        />
      )}

      {activeModule === "correlation" && (
        <CorrelationMatrix
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
        />
      )}

      {activeModule === "heatmap" && (
        <EquityHeatmap
          history={history}
          initialBalance={initialBalance}
          currentSymbol={currentSymbol}
        />
      )}

      {activeModule === "efficiency" && (
        <TradeEfficiencyRadialChart
          history={history}
          currentSymbol={currentSymbol}
          onSelectSymbol={onSelectSymbol}
        />
      )}

      {activeModule === "timeline" && (
        <TradeDistributionChart history={history} />
      )}

      {activeModule === "equity" && (
        <CumulativeBalanceLineChart
          history={history}
          initialBalance={initialBalance}
          peakBalance={peakBalance}
          currentSymbol={currentSymbol}
        />
      )}
    </div>
  );
};

