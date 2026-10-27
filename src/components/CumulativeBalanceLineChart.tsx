import React, { useState, useMemo } from "react";
import { Trade } from "../types/trading";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  DollarSign,
  ShieldAlert,
  Sliders,
} from "lucide-react";

interface CumulativeBalanceLineChartProps {
  history: Trade[];
  initialBalance: number;
  peakBalance?: number;
  currentSymbol?: string;
  height?: number;
}

interface ChartDataPoint {
  index: number;
  tradeNumber: number;
  label: string;
  ticket: number | string;
  time: string;
  symbol: string;
  type: string;
  tradeProfit: number;
  tradePips: number;
  balance: number;
  cumulativeProfit: number;
  returnPct: number;
  runningPeak: number;
  drawdownPct: number;
  drawdownAmount: number;
  exitReason: string;
}

export const CumulativeBalanceLineChart: React.FC<CumulativeBalanceLineChartProps> = ({
  history,
  initialBalance = 10000,
  peakBalance,
  currentSymbol = "EUR/USD",
  height = 240,
}) => {
  const [viewMode, setViewMode] = useState<"dollar" | "percent">("dollar");
  const [rangeFilter, setRangeFilter] = useState<"ALL" | "50" | "25" | "10">("ALL");
  const [showPeakLine, setShowPeakLine] = useState<boolean>(true);
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [showGradientFill, setShowGradientFill] = useState<boolean>(true);

  // Compute cumulative balance curve data points
  const rawDataPoints = useMemo<ChartDataPoint[]>(() => {
    let currentBal = initialBalance;
    let runningPeak = initialBalance;

    // Initial Deposit Point (Trade #0)
    const points: ChartDataPoint[] = [
      {
        index: 0,
        tradeNumber: 0,
        label: "Start",
        ticket: "DEPOSIT",
        time: "Initial",
        symbol: currentSymbol,
        type: "-",
        tradeProfit: 0,
        tradePips: 0,
        balance: initialBalance,
        cumulativeProfit: 0,
        returnPct: 0,
        runningPeak: initialBalance,
        drawdownPct: 0,
        drawdownAmount: 0,
        exitReason: "INITIAL_BALANCE",
      },
    ];

    if (history.length > 0) {
      history.forEach((trade, idx) => {
        currentBal = trade.balance !== undefined ? trade.balance : currentBal + trade.profit;
        if (currentBal > runningPeak) {
          runningPeak = currentBal;
        }

        const drawdownAmt = Math.max(0, runningPeak - currentBal);
        const drawdownPct = runningPeak > 0 ? (drawdownAmt / runningPeak) * 100 : 0;
        const cumProfit = currentBal - initialBalance;
        const returnPct = initialBalance > 0 ? (cumProfit / initialBalance) * 100 : 0;

        points.push({
          index: idx + 1,
          tradeNumber: idx + 1,
          label: `#${idx + 1}`,
          ticket: trade.ticket || idx + 1,
          time: trade.exitTime || `T${idx + 1}`,
          symbol: trade.symbol || currentSymbol,
          type: trade.type,
          tradeProfit: Number(trade.profit.toFixed(2)),
          tradePips: trade.pips || 0,
          balance: Number(currentBal.toFixed(2)),
          cumulativeProfit: Number(cumProfit.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          runningPeak: Number(runningPeak.toFixed(2)),
          drawdownPct: Number(drawdownPct.toFixed(2)),
          drawdownAmount: Number(drawdownAmt.toFixed(2)),
          exitReason: trade.exitReason || "EXIT",
        });
      });
    } else {
      // Seed initial progression curve for demo display before trades execute
      const seedSteps = [
        { profit: 42.5, pips: 4.2, type: "BUY" },
        { profit: 78.0, pips: 7.8, type: "BUY" },
        { profit: -31.5, pips: -3.1, type: "SELL" },
        { profit: 95.2, pips: 9.5, type: "BUY" },
        { profit: 54.0, pips: 5.4, type: "BUY" },
        { profit: -22.0, pips: -2.2, type: "SELL" },
        { profit: 112.5, pips: 11.2, type: "BUY" },
        { profit: 64.0, pips: 6.4, type: "SELL" },
      ];

      seedSteps.forEach((s, idx) => {
        currentBal += s.profit;
        if (currentBal > runningPeak) runningPeak = currentBal;
        const drawdownAmt = Math.max(0, runningPeak - currentBal);
        const drawdownPct = runningPeak > 0 ? (drawdownAmt / runningPeak) * 100 : 0;
        const cumProfit = currentBal - initialBalance;
        const returnPct = (cumProfit / initialBalance) * 100;

        points.push({
          index: idx + 1,
          tradeNumber: idx + 1,
          label: `#${idx + 1}`,
          ticket: 10010 + idx,
          time: `T+${idx + 1}`,
          symbol: currentSymbol,
          type: s.type,
          tradeProfit: s.profit,
          tradePips: s.pips,
          balance: Number(currentBal.toFixed(2)),
          cumulativeProfit: Number(cumProfit.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          runningPeak: Number(runningPeak.toFixed(2)),
          drawdownPct: Number(drawdownPct.toFixed(2)),
          drawdownAmount: Number(drawdownAmt.toFixed(2)),
          exitReason: s.profit >= 0 ? "TAKE_PROFIT" : "STOP_LOSS",
        });
      });
    }

    return points;
  }, [history, initialBalance, currentSymbol]);

  // Apply Range Filtering
  const filteredData = useMemo(() => {
    if (rangeFilter === "ALL") return rawDataPoints;
    const count = parseInt(rangeFilter, 10);
    // Keep initial point 0 for baseline reference, plus last N trades
    if (rawDataPoints.length <= count + 1) return rawDataPoints;
    return [rawDataPoints[0], ...rawDataPoints.slice(-count)];
  }, [rawDataPoints, rangeFilter]);

  // High-level Session Stats
  const stats = useMemo(() => {
    const lastPoint = rawDataPoints[rawDataPoints.length - 1];
    const netProfit = lastPoint.cumulativeProfit;
    const netRoi = lastPoint.returnPct;
    const sessionPeak = peakBalance || Math.max(...rawDataPoints.map((p) => p.balance));
    const maxDrawdownPct = Math.max(...rawDataPoints.map((p) => p.drawdownPct));
    const maxDrawdownAmt = Math.max(...rawDataPoints.map((p) => p.drawdownAmount));
    const minBalance = Math.min(...rawDataPoints.map((p) => p.balance));
    const isProfitable = netProfit >= 0;

    return {
      currentBalance: lastPoint.balance,
      netProfit,
      netRoi,
      sessionPeak,
      maxDrawdownPct,
      maxDrawdownAmt,
      minBalance,
      isProfitable,
      tradeCount: rawDataPoints.length - 1,
    };
  }, [rawDataPoints, peakBalance]);

  // Dynamic Y-axis domains
  const yDomain = useMemo(() => {
    if (viewMode === "dollar") {
      const vals = filteredData.map((d) => d.balance);
      const minVal = Math.min(...vals, initialBalance);
      const maxVal = Math.max(...vals, initialBalance);
      const padding = Math.max(30, (maxVal - minVal) * 0.12);
      return [Math.floor(minVal - padding), Math.ceil(maxVal + padding)];
    } else {
      const vals = filteredData.map((d) => d.returnPct);
      const minVal = Math.min(...vals, 0);
      const maxVal = Math.max(...vals, 0);
      const padding = Math.max(0.5, (maxVal - minVal) * 0.15);
      return [Number((minVal - padding).toFixed(2)), Number((maxVal + padding).toFixed(2))];
    }
  }, [filteredData, viewMode, initialBalance]);

  // Primary Line & Fill Colors
  const isPositiveGrowth = stats.isProfitable;
  const strokeColor = isPositiveGrowth ? "#10b981" : "#f43f5e"; // Emerald vs Rose
  const gradientId = isPositiveGrowth ? "balanceGrowthEmerald" : "balanceGrowthRose";

  return (
    <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-slate-800/90 space-y-3 select-none">
      {/* Top Header & Interactive Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                Cumulative Balance Growth
              </h4>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {history.length > 0 ? "Live Session" : "Simulation Baseline"}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Track equity trajectory, capital high-water mark, and drawdown recovery over time
            </p>
          </div>
        </div>

        {/* View Mode & Range Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Unit Toggle: $ vs % */}
          <div className="flex items-center bg-[#070a10] border border-slate-800 rounded-md p-0.5 text-[10.5px]">
            <button
              type="button"
              onClick={() => setViewMode("dollar")}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                viewMode === "dollar"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              $ Balance
            </button>
            <button
              type="button"
              onClick={() => setViewMode("percent")}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                viewMode === "percent"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              % Return
            </button>
          </div>

          {/* Trade Range Selector */}
          <div className="flex items-center bg-[#070a10] border border-slate-800 rounded-md p-0.5 text-[10.5px]">
            {(["ALL", "50", "25", "10"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRangeFilter(r)}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  rangeFilter === r
                    ? "bg-slate-700 text-slate-100 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r === "ALL" ? "All" : `${r}T`}
              </button>
            ))}
          </div>

          {/* Visual Options Dropdown / Toggles */}
          <button
            type="button"
            onClick={() => setShowPeakLine(!showPeakLine)}
            className={`px-2 py-1 rounded text-[10.5px] font-mono border transition-colors cursor-pointer ${
              showPeakLine
                ? "bg-sky-950/60 border-sky-500/40 text-sky-300"
                : "bg-slate-800/40 border-slate-700/60 text-slate-400"
            }`}
            title="Toggle High-Water Mark Peak Reference Line"
          >
            Peak
          </button>

          <button
            type="button"
            onClick={() => setShowGradientFill(!showGradientFill)}
            className={`px-2 py-1 rounded text-[10.5px] font-mono border transition-colors cursor-pointer ${
              showGradientFill
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800/40 border-slate-700/60 text-slate-400"
            }`}
            title="Toggle Gradient Fill"
          >
            Fill
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-[#070a10] border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Current Balance
          </span>
          <div className="text-sm font-bold font-mono text-slate-100 mt-0.5">
            ${stats.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span
            className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 mt-0.5 ${
              stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {stats.netProfit >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {stats.netProfit >= 0 ? "+" : ""}${stats.netProfit.toFixed(2)} ({stats.netRoi >= 0 ? "+" : ""}
            {stats.netRoi.toFixed(2)}%)
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#070a10] border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            High-Water Mark (Peak)
          </span>
          <div className="text-sm font-bold font-mono text-sky-300 mt-0.5">
            ${stats.sessionPeak.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            Initial: ${initialBalance.toLocaleString()}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#070a10] border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Max Recorded Drawdown
          </span>
          <div
            className={`text-sm font-bold font-mono mt-0.5 ${
              stats.maxDrawdownPct > 5 ? "text-rose-400" : "text-amber-400"
            }`}
          >
            -{stats.maxDrawdownPct.toFixed(2)}%
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            -${stats.maxDrawdownAmt.toFixed(2)} from peak
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#070a10] border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
            Closed Trades Plotted
          </span>
          <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
            {stats.tradeCount} Trades
          </div>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5 block">
            Symbol: {currentSymbol}
          </span>
        </div>
      </div>

      {/* Main Recharts Balance Line Chart Canvas */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 12, right: 18, left: 10, bottom: 6 }}>
            <defs>
              {/* Emerald Positive Profit Gradient */}
              <linearGradient id="balanceGrowthEmerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#10b981" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>

              {/* Rose Negative Drawdown Gradient */}
              <linearGradient id="balanceGrowthRose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#f43f5e" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} opacity={0.65} />

            <XAxis
              dataKey="label"
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "monospace" }}
              interval="preserveStartEnd"
              minTickGap={20}
            />

            <YAxis
              domain={yDomain}
              stroke="#64748b"
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tick={{ fontSize: 10, fill: "#94a3b8", fontFamily: "monospace" }}
              tickFormatter={(v: number) => (viewMode === "dollar" ? `$${v.toLocaleString()}` : `${v}%`)}
              orientation="right"
              width={65}
            />

            <Tooltip
              content={<CustomCumulativeBalanceTooltip viewMode={viewMode} initialBalance={initialBalance} />}
            />

            {/* Baseline Reference Line (Initial Balance / 0% Return) */}
            {showBaseline && (
              <ReferenceLine
                y={viewMode === "dollar" ? initialBalance : 0}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: viewMode === "dollar" ? `Base $${initialBalance.toLocaleString()}` : "Base 0%",
                  fill: "#94a3b8",
                  fontSize: 10,
                  position: "insideTopLeft",
                  fontFamily: "monospace",
                }}
              />
            )}

            {/* Peak High-Water Mark Reference Line */}
            {showPeakLine && stats.sessionPeak > initialBalance && (
              <ReferenceLine
                y={
                  viewMode === "dollar"
                    ? stats.sessionPeak
                    : Number((((stats.sessionPeak - initialBalance) / initialBalance) * 100).toFixed(2))
                }
                stroke="#38bdf8"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value:
                    viewMode === "dollar"
                      ? `Peak $${stats.sessionPeak.toLocaleString()}`
                      : `Peak +${(((stats.sessionPeak - initialBalance) / initialBalance) * 100).toFixed(1)}%`,
                  fill: "#38bdf8",
                  fontSize: 10,
                  position: "insideTopRight",
                  fontFamily: "monospace",
                }}
              />
            )}

            {/* Gradient Area Fill Under Curve */}
            {showGradientFill && (
              <Area
                type="monotone"
                dataKey={viewMode === "dollar" ? "balance" : "returnPct"}
                fill={`url(#${gradientId})`}
                stroke="none"
                isAnimationActive={false}
              />
            )}

            {/* Primary Cumulative Balance Line */}
            <Line
              type="monotone"
              dataKey={viewMode === "dollar" ? "balance" : "returnPct"}
              stroke={strokeColor}
              strokeWidth={2.2}
              dot={
                filteredData.length <= 35
                  ? {
                      r: 2.5,
                      fill: strokeColor,
                      stroke: "#0a0d13",
                      strokeWidth: 1.5,
                    }
                  : false
              }
              activeDot={{
                r: 5,
                fill: strokeColor,
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Insights Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Starting Capital: ${initialBalance.toLocaleString()}</span>
        </span>
        <span className="text-slate-400">
          Net Growth:{" "}
          <strong className={stats.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {stats.netProfit >= 0 ? "+" : ""}${stats.netProfit.toFixed(2)}
          </strong>
        </span>
      </div>
    </div>
  );
};

// Custom interactive Tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  viewMode: "dollar" | "percent";
  initialBalance: number;
}

const CustomCumulativeBalanceTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  viewMode,
  initialBalance,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint;
    const isWin = data.tradeProfit >= 0;
    const isOverallProfit = data.cumulativeProfit >= 0;

    return (
      <div className="bg-[#070a10]/95 backdrop-blur-md border border-slate-700/90 rounded-lg p-2.5 shadow-2xl text-xs font-mono space-y-1.5 z-50 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
          <span className="font-sans font-bold text-slate-100 flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                data.tradeNumber === 0 ? "bg-slate-400" : isWin ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span>{data.tradeNumber === 0 ? "Initial Deposit" : `Trade #${data.tradeNumber}`}</span>
          </span>
          <span className="text-[10px] text-slate-400">{data.time}</span>
        </div>

        {/* Current Balance */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Account Balance:</span>
          <span className="font-bold text-slate-100 text-sm">
            ${data.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Cumulative Profit & Return */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Cumulative ROI:</span>
          <span className={`font-bold ${isOverallProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {isOverallProfit ? "+" : ""}
            {data.returnPct}% ({isOverallProfit ? "+" : ""}${data.cumulativeProfit.toFixed(2)})
          </span>
        </div>

        {/* Trade-specific PnL if not initial deposit */}
        {data.tradeNumber > 0 && (
          <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 font-sans">Trade P/L:</span>
              <span className={`font-semibold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
                {isWin ? "+" : ""}${data.tradeProfit.toFixed(2)} ({data.tradePips >= 0 ? "+" : ""}
                {data.tradePips} pips)
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 font-sans">Symbol / Side:</span>
              <span className="text-slate-300">
                {data.symbol} · <strong className={data.type === "BUY" ? "text-emerald-400" : "text-rose-400"}>{data.type}</strong>
              </span>
            </div>

            {data.drawdownPct > 0 && (
              <div className="flex items-center justify-between gap-4 text-amber-400 text-[10.5px]">
                <span className="font-sans">Drawdown from Peak:</span>
                <span>-{data.drawdownPct}% (-${data.drawdownAmount.toFixed(2)})</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};
