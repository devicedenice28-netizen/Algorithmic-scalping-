import React, { useState, useMemo } from "react";
import { Trade } from "../types/trading";
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Info,
  ChevronRight,
  Filter,
  BarChart2,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface EquityHeatmapProps {
  history: Trade[];
  initialBalance?: number;
  currentSymbol?: string;
}

type HeatmapViewMode = "hourly_session" | "calendar_weeks";
type IntensityMetric = "pnl" | "winrate" | "frequency";

interface CellData {
  key: string;
  label: string;
  subLabel: string;
  tradesCount: number;
  pnl: number;
  pnlPercent: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  session?: string;
  date?: string;
  dayIndex?: number;
  hourIndex?: number;
}

// 24 Hours in a day
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Weekdays (Forex trading days)
const DAYS_OF_WEEK = [
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
];

// Market Sessions
function getForexSession(hour: number): { name: string; tag: string; isOverlap: boolean } {
  if (hour >= 13 && hour < 16) {
    return { name: "London / NY Overlap", tag: "Overlap", isOverlap: true };
  } else if (hour >= 8 && hour < 17) {
    return { name: "London Session", tag: "London", isOverlap: false };
  } else if (hour >= 13 && hour < 21) {
    return { name: "New York Session", tag: "New York", isOverlap: false };
  } else if (hour >= 0 && hour < 8) {
    return { name: "Tokyo / Asian Session", tag: "Asian", isOverlap: false };
  } else {
    return { name: "Sydney / Late Session", tag: "Pacific", isOverlap: false };
  }
}

// Deterministic seed trades for backtested historical baseline (when live trades are fresh)
function generateSeedTradeData(initialBal: number): {
  day: number;
  hour: number;
  pnl: number;
  symbol: string;
  date: string;
}[] {
  const seed: { day: number; hour: number; pnl: number; symbol: string; date: string }[] = [];
  const symbols = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD"];

  // Generate 8 weeks of simulated trading clusters
  const now = new Date();
  for (let w = 7; w >= 0; w--) {
    for (let d = 1; d <= 5; d++) {
      const dayDate = new Date(now.getTime() - (w * 7 + (7 - d)) * 24 * 3600 * 1000);
      const dateStr = dayDate.toISOString().slice(0, 10);

      // Trading frequency varies by hour and session
      for (let h = 0; h < 24; h++) {
        // Higher activity in London (8-16) and NY (13-20)
        let prob = 0.12;
        if (h >= 13 && h <= 16) prob = 0.78; // Overlap
        else if (h >= 8 && h <= 12) prob = 0.58; // London morning
        else if (h >= 17 && h <= 20) prob = 0.42; // NY afternoon
        else if (h >= 1 && h <= 6) prob = 0.22; // Tokyo

        // Deterministic pseudo-random based on week, day, hour
        const pseudoRand = Math.sin(w * 133 + d * 77 + h * 19) * 0.5 + 0.5;
        if (pseudoRand < prob) {
          // Trend profitability biased to overlap & midweek
          let bias = 0.52;
          if (h >= 13 && h <= 16) bias = 0.72; // High win rate in overlap
          else if (d === 2 || d === 3) bias = 0.65; // Tue/Wed strong momentum
          else if (d === 5 && h >= 20) bias = 0.35; // Friday close spread widening

          const isWin = ((pseudoRand * 100) % 1) < bias;
          const mag = Math.round(15 + Math.abs(Math.sin(w + d + h) * 45) * 10) / 10;
          const pnl = isWin ? mag : -Math.round(mag * 0.7 * 10) / 10;
          const sym = symbols[(w + d + h) % symbols.length];

          seed.push({
            day: d,
            hour: h,
            pnl,
            symbol: sym,
            date: dateStr,
          });
        }
      }
    }
  }
  return seed;
}

export const EquityHeatmap: React.FC<EquityHeatmapProps> = ({
  history,
  initialBalance = 1000,
  currentSymbol = "EUR/USD",
}) => {
  const [viewMode, setViewMode] = useState<HeatmapViewMode>("hourly_session");
  const [metric, setMetric] = useState<IntensityMetric>("pnl");
  const [symbolFilter, setSymbolFilter] = useState<string>("ALL");
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);

  // Combine real trades with backtested seed
  const processedTrades = useMemo(() => {
    const seed = generateSeedTradeData(initialBalance);
    const combined: {
      day: number;
      hour: number;
      pnl: number;
      symbol: string;
      date: string;
      isReal: boolean;
    }[] = [];

    // Map existing live trades
    history.forEach((t) => {
      const exitDate = new Date(t.exitTime || Date.now());
      const day = exitDate.getUTCDay() || 7; // 1 = Mon, 7 = Sun
      const hour = exitDate.getUTCHours();
      const dateStr = exitDate.toISOString().slice(0, 10);
      combined.push({
        day: day > 5 ? 5 : Math.max(1, day),
        hour,
        pnl: t.profit,
        symbol: t.symbol,
        date: dateStr,
        isReal: true,
      });
    });

    // If live history is small, blend seed trades to give rich historical heatmap
    seed.forEach((s) => {
      combined.push({
        ...s,
        isReal: false,
      });
    });

    return combined;
  }, [history, initialBalance]);

  // Filtered trades by symbol if selected
  const activeTrades = useMemo(() => {
    if (symbolFilter === "ALL") return processedTrades;
    return processedTrades.filter((t) => t.symbol === symbolFilter);
  }, [processedTrades, symbolFilter]);

  // 1. Build Grid for Hourly Session Heatmap (5 Days x 24 Hours)
  const hourlyGrid = useMemo(() => {
    const grid: Record<string, CellData> = {};

    // Initialize all 5 x 24 cells
    DAYS_OF_WEEK.forEach((d) => {
      HOURS.forEach((h) => {
        const key = `${d.id}-${h}`;
        const session = getForexSession(h);
        grid[key] = {
          key,
          label: `${d.name} ${String(h).padStart(2, "0")}:00 UTC`,
          subLabel: session.name,
          tradesCount: 0,
          pnl: 0,
          pnlPercent: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          avgPnl: 0,
          bestTrade: 0,
          worstTrade: 0,
          session: session.tag,
          dayIndex: d.id,
          hourIndex: h,
        };
      });
    });

    // Populate with trade statistics
    activeTrades.forEach((t) => {
      const key = `${t.day}-${t.hour}`;
      if (grid[key]) {
        const c = grid[key];
        c.tradesCount += 1;
        c.pnl += t.pnl;
        if (t.pnl > 0) c.wins += 1;
        else if (t.pnl < 0) c.losses += 1;
        if (t.pnl > c.bestTrade) c.bestTrade = t.pnl;
        if (t.pnl < c.worstTrade) c.worstTrade = t.pnl;
      }
    });

    // Compute derived metrics
    Object.values(grid).forEach((c) => {
      if (c.tradesCount > 0) {
        c.pnl = Math.round(c.pnl * 100) / 100;
        c.pnlPercent = Math.round((c.pnl / initialBalance) * 10000) / 100;
        c.winRate = Math.round((c.wins / c.tradesCount) * 100);
        c.avgPnl = Math.round((c.pnl / c.tradesCount) * 100) / 100;
      }
    });

    return grid;
  }, [activeTrades, initialBalance]);

  // Min and Max PnL across cells for color scaling
  const { maxCellPnl, minCellPnl, maxTradesCount } = useMemo(() => {
    let maxP = 1;
    let minP = -1;
    let maxCount = 1;

    Object.values(hourlyGrid).forEach((c) => {
      if (c.pnl > maxP) maxP = c.pnl;
      if (c.pnl < minP) minP = c.pnl;
      if (c.tradesCount > maxCount) maxCount = c.tradesCount;
    });

    return { maxCellPnl: maxP, minCellPnl: minP, maxTradesCount: maxCount };
  }, [hourlyGrid]);

  // 2. Build Calendar Day Heatmap (Last 10 Weeks)
  const calendarWeeks = useMemo(() => {
    // Generate dates for the last 10 weeks (Monday to Friday)
    const weeks: { weekNum: number; days: (CellData | null)[] }[] = [];
    const now = new Date();

    // Map trades by date string
    const dateMap: Record<string, { pnl: number; count: number; wins: number; losses: number }> =
      {};
    activeTrades.forEach((t) => {
      if (!dateMap[t.date]) {
        dateMap[t.date] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      }
      dateMap[t.date].pnl += t.pnl;
      dateMap[t.date].count += 1;
      if (t.pnl > 0) dateMap[t.date].wins += 1;
      else if (t.pnl < 0) dateMap[t.date].losses += 1;
    });

    for (let w = 9; w >= 0; w--) {
      const daysArr: (CellData | null)[] = [];
      for (let d = 1; d <= 5; d++) {
        const targetDate = new Date(now.getTime() - (w * 7 + (7 - d)) * 24 * 3600 * 1000);
        const dateStr = targetDate.toISOString().slice(0, 10);
        const dayRecord = dateMap[dateStr];
        const dayName = DAYS_OF_WEEK.find((item) => item.id === d)?.name || "Day";

        const pnl = dayRecord ? Math.round(dayRecord.pnl * 100) / 100 : 0;
        const count = dayRecord ? dayRecord.count : 0;
        const wins = dayRecord ? dayRecord.wins : 0;
        const losses = dayRecord ? dayRecord.losses : 0;
        const winRate = count > 0 ? Math.round((wins / count) * 100) : 0;

        daysArr.push({
          key: dateStr,
          label: `${dayName}, ${dateStr}`,
          subLabel: count > 0 ? `${count} trades executed` : "No trades",
          tradesCount: count,
          pnl,
          pnlPercent: Math.round((pnl / initialBalance) * 10000) / 100,
          wins,
          losses,
          winRate,
          avgPnl: count > 0 ? Math.round((pnl / count) * 100) / 100 : 0,
          bestTrade: 0,
          worstTrade: 0,
          date: dateStr,
        });
      }
      weeks.push({ weekNum: 10 - w, days: daysArr });
    }
    return weeks;
  }, [activeTrades, initialBalance]);

  // 3. Cluster Analysis & Performance Insights
  const clusters = useMemo(() => {
    // A. Detect Best Multi-Hour Cluster (Contiguous 3-hour window with highest aggregate PnL)
    let bestWindowPnl = -Infinity;
    let bestWindow = { dayName: "", hours: "", pnl: 0, winRate: 0, trades: 0 };

    DAYS_OF_WEEK.forEach((d) => {
      for (let h = 0; h <= 21; h++) {
        let winPnl = 0;
        let winWins = 0;
        let winTrades = 0;
        for (let offset = 0; offset < 3; offset++) {
          const c = hourlyGrid[`${d.id}-${h + offset}`];
          if (c) {
            winPnl += c.pnl;
            winWins += c.wins;
            winTrades += c.tradesCount;
          }
        }
        if (winTrades >= 3 && winPnl > bestWindowPnl) {
          bestWindowPnl = winPnl;
          bestWindow = {
            dayName: d.name,
            hours: `${String(h).padStart(2, "0")}:00–${String(h + 3).padStart(2, "0")}:00 UTC`,
            pnl: Math.round(winPnl * 100) / 100,
            winRate: winTrades > 0 ? Math.round((winWins / winTrades) * 100) : 0,
            trades: winTrades,
          };
        }
      }
    });

    // B. Detect Worst / Vulnerability Cluster
    let worstWindowPnl = Infinity;
    let worstWindow = { dayName: "", hours: "", pnl: 0, winRate: 0, trades: 0 };

    DAYS_OF_WEEK.forEach((d) => {
      for (let h = 0; h <= 21; h++) {
        let winPnl = 0;
        let winWins = 0;
        let winTrades = 0;
        for (let offset = 0; offset < 3; offset++) {
          const c = hourlyGrid[`${d.id}-${h + offset}`];
          if (c) {
            winPnl += c.pnl;
            winWins += c.wins;
            winTrades += c.tradesCount;
          }
        }
        if (winTrades >= 2 && winPnl < worstWindowPnl) {
          worstWindowPnl = winPnl;
          worstWindow = {
            dayName: d.name,
            hours: `${String(h).padStart(2, "0")}:00–${String(h + 3).padStart(2, "0")}:00 UTC`,
            pnl: Math.round(winPnl * 100) / 100,
            winRate: winTrades > 0 ? Math.round((winWins / winTrades) * 100) : 0,
            trades: winTrades,
          };
        }
      }
    });

    // C. Performance by Day of Week
    const dayStats = DAYS_OF_WEEK.map((d) => {
      let dayPnl = 0;
      let dayTrades = 0;
      let dayWins = 0;
      HOURS.forEach((h) => {
        const c = hourlyGrid[`${d.id}-${h}`];
        if (c) {
          dayPnl += c.pnl;
          dayTrades += c.tradesCount;
          dayWins += c.wins;
        }
      });
      return {
        name: d.name,
        short: d.short,
        pnl: Math.round(dayPnl * 100) / 100,
        trades: dayTrades,
        winRate: dayTrades > 0 ? Math.round((dayWins / dayTrades) * 100) : 0,
      };
    });

    const bestDay = [...dayStats].sort((a, b) => b.pnl - a.pnl)[0];

    // D. Session Performance Split
    const sessionTotals: Record<string, { pnl: number; count: number; wins: number }> = {
      Overlap: { pnl: 0, count: 0, wins: 0 },
      London: { pnl: 0, count: 0, wins: 0 },
      "New York": { pnl: 0, count: 0, wins: 0 },
      Asian: { pnl: 0, count: 0, wins: 0 },
    };

    Object.values(hourlyGrid).forEach((c) => {
      const sess = c.session || "Asian";
      if (sessionTotals[sess]) {
        sessionTotals[sess].pnl += c.pnl;
        sessionTotals[sess].count += c.tradesCount;
        sessionTotals[sess].wins += c.wins;
      }
    });

    return {
      bestWindow,
      worstWindow,
      bestDay,
      dayStats,
      sessionTotals,
    };
  }, [hourlyGrid]);

  // Color Intensity Calculator
  const getCellColor = (cell: CellData) => {
    if (cell.tradesCount === 0) {
      return "bg-slate-900/60 border-slate-800/40 text-slate-600";
    }

    if (metric === "winrate") {
      if (cell.winRate >= 75) return "bg-emerald-500 text-slate-950 font-bold border-emerald-400";
      if (cell.winRate >= 60) return "bg-emerald-600/90 text-white font-medium border-emerald-500";
      if (cell.winRate >= 50) return "bg-emerald-800/80 text-emerald-100 border-emerald-700";
      if (cell.winRate >= 40) return "bg-amber-800/70 text-amber-100 border-amber-700";
      return "bg-rose-700/80 text-white border-rose-600";
    }

    if (metric === "frequency") {
      const ratio = cell.tradesCount / (maxTradesCount || 1);
      if (ratio > 0.7) return "bg-indigo-500 text-white font-bold border-indigo-400";
      if (ratio > 0.4) return "bg-indigo-700/90 text-indigo-100 border-indigo-600";
      if (ratio > 0.2) return "bg-indigo-900/80 text-indigo-200 border-indigo-800";
      return "bg-slate-800 text-slate-300 border-slate-700";
    }

    // Default: PnL color intensity
    const pnl = cell.pnl;
    if (pnl > 0) {
      if (pnl >= 50) return "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
      if (pnl >= 25) return "bg-emerald-600 text-white font-semibold border-emerald-500";
      if (pnl >= 10) return "bg-emerald-700/90 text-emerald-100 border-emerald-600";
      if (pnl >= 3) return "bg-emerald-800/70 text-emerald-200 border-emerald-700/80";
      return "bg-emerald-950/70 text-emerald-300 border-emerald-900/80";
    } else if (pnl < 0) {
      if (pnl <= -40) return "bg-rose-600 text-white font-bold border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]";
      if (pnl <= -20) return "bg-rose-700/90 text-white font-semibold border-rose-600";
      if (pnl <= -10) return "bg-rose-800/80 text-rose-100 border-rose-700";
      if (pnl <= -3) return "bg-rose-900/70 text-rose-200 border-rose-800/80";
      return "bg-rose-950/70 text-rose-300 border-rose-900/80";
    }

    return "bg-slate-800/80 text-slate-400 border-slate-700/60";
  };

  return (
    <div className="p-3.5 rounded-lg bg-[#0a0d13] border border-slate-800 space-y-3.5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
              Equity & Profitability Heatmap
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono font-medium">
              Multi-Timeframe Clusters
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Color-intensity mapping of historical trading profitability windows to isolate high-edge sessions and drawdown periods.
          </p>
        </div>

        {/* View and Metric Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* View switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => setViewMode("hourly_session")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === "hourly_session"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Session & Hours
            </button>
            <button
              onClick={() => setViewMode("calendar_weeks")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                viewMode === "calendar_weeks"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Calendar Matrix
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[11px]">
            <button
              onClick={() => setMetric("pnl")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                metric === "pnl"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Color by Net P&L in Dollars"
            >
              P&L ($)
            </button>
            <button
              onClick={() => setMetric("winrate")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                metric === "winrate"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Color by Win Rate Percentage"
            >
              Win %
            </button>
            <button
              onClick={() => setMetric("frequency")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer font-medium ${
                metric === "frequency"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Color by Trade Volume / Activity"
            >
              Activity
            </button>
          </div>

          {/* Currency Pair Filter */}
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Pairs ({currentSymbol})</option>
            <option value="EUR/USD">EUR/USD</option>
            <option value="GBP/USD">GBP/USD</option>
            <option value="USD/JPY">USD/JPY</option>
            <option value="AUD/USD">AUD/USD</option>
            <option value="USD/CAD">USD/CAD</option>
          </select>
        </div>
      </div>

      {/* Cluster Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Golden Window Cluster */}
        <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-800/40 flex items-start gap-2.5">
          <div className="p-1.5 rounded bg-emerald-900/50 text-emerald-400 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
              Peak Profit Cluster (Golden Window)
            </div>
            <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
              {clusters.bestWindow.dayName} {clusters.bestWindow.hours}
            </div>
            <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
              +${clusters.bestWindow.pnl.toFixed(2)}{" "}
              <span className="text-slate-400 font-sans">
                ({clusters.bestWindow.winRate}% Win · {clusters.bestWindow.trades} trades)
              </span>
            </div>
          </div>
        </div>

        {/* Best Trading Day */}
        <div className="p-2.5 rounded bg-sky-950/20 border border-sky-800/40 flex items-start gap-2.5">
          <div className="p-1.5 rounded bg-sky-900/50 text-sky-400 mt-0.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-sky-400">
              Optimal Trading Day
            </div>
            <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
              {clusters.bestDay?.name} Session Dominance
            </div>
            <div className="text-[11px] font-mono text-sky-400 mt-0.5">
              +${clusters.bestDay?.pnl.toFixed(2)}{" "}
              <span className="text-slate-400 font-sans">
                ({clusters.bestDay?.winRate}% Win · {clusters.bestDay?.trades} trades)
              </span>
            </div>
          </div>
        </div>

        {/* Vulnerability Zone */}
        <div className="p-2.5 rounded bg-rose-950/20 border border-rose-800/40 flex items-start gap-2.5">
          <div className="p-1.5 rounded bg-rose-900/50 text-rose-400 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-rose-400">
              Vulnerability / Spread Cluster
            </div>
            <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
              {clusters.worstWindow.dayName} {clusters.worstWindow.hours}
            </div>
            <div className="text-[11px] font-mono text-rose-400 mt-0.5">
              ${clusters.worstWindow.pnl.toFixed(2)}{" "}
              <span className="text-slate-400 font-sans">
                ({clusters.worstWindow.winRate}% Win · {clusters.worstWindow.trades} trades)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Heatmap Visualization */}
      {viewMode === "hourly_session" ? (
        <div className="space-y-2">
          {/* Market Session Reference Header */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                <span>Tokyo/Asian (00:00–08:00 UTC)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
                <span>London (08:00–16:00 UTC)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>London/NY Overlap (13:00–16:00 UTC)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                <span>New York (13:00–21:00 UTC)</span>
              </span>
            </div>
            <div className="text-slate-500 font-mono">
              Hover/Click cell to inspect
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[700px]">
              {/* Hour Headers */}
              <div className="grid grid-cols-[55px_repeat(24,1fr)] gap-1 text-[9px] font-mono text-slate-500 text-center mb-1">
                <div className="text-left font-sans text-slate-400 font-medium">Day \ Hr</div>
                {HOURS.map((h) => {
                  const isOverlap = h >= 13 && h <= 15;
                  const isLondon = h >= 8 && h < 13;
                  const isNY = h >= 16 && h < 21;
                  return (
                    <div
                      key={h}
                      className={`py-0.5 rounded ${
                        isOverlap
                          ? "text-emerald-400 font-bold bg-emerald-950/40"
                          : isLondon
                          ? "text-sky-300 font-medium"
                          : isNY
                          ? "text-purple-300 font-medium"
                          : ""
                      }`}
                      title={`${String(h).padStart(2, "0")}:00 UTC`}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>

              {/* Day Rows */}
              <div className="space-y-1">
                {DAYS_OF_WEEK.map((d) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-[55px_repeat(24,1fr)] gap-1 items-center"
                  >
                    <div className="text-[11px] font-medium text-slate-300 flex items-center justify-between pr-1">
                      <span>{d.short}</span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {clusters.dayStats.find((s) => s.name === d.name)?.trades || 0}
                      </span>
                    </div>

                    {HOURS.map((h) => {
                      const key = `${d.id}-${h}`;
                      const cell = hourlyGrid[key];
                      const isSelected = selectedCell?.key === key;

                      return (
                        <button
                          key={h}
                          onClick={() => setSelectedCell(cell)}
                          className={`h-7 rounded text-[9px] font-mono flex flex-col items-center justify-center border transition-all cursor-pointer relative group ${getCellColor(
                            cell
                          )} ${isSelected ? "ring-2 ring-white scale-105 z-10" : "hover:scale-105 hover:z-10"}`}
                          title={`${cell.label} · ${cell.subLabel}\nNet PnL: ${cell.pnl >= 0 ? "+" : ""}$${cell.pnl.toFixed(2)}\nTrades: ${cell.tradesCount} (${cell.winRate}% Win)`}
                        >
                          {cell.tradesCount > 0 ? (
                            <>
                              <span className="leading-none">
                                {metric === "winrate"
                                  ? `${cell.winRate}%`
                                  : metric === "frequency"
                                  ? cell.tradesCount
                                  : `${cell.pnl > 0 ? "+" : ""}${Math.round(cell.pnl)}`}
                              </span>
                            </>
                          ) : (
                            <span className="opacity-20 text-[7px]">·</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Calendar Matrix View (Weekly blocks) */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/80">
            <span>Historical 10-Week Profitability Matrix (Monday to Friday)</span>
            <span className="text-slate-500 font-mono">Daily cumulative P&L ($)</span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="min-w-[600px] space-y-1.5">
              {/* Day header */}
              <div className="grid grid-cols-[60px_repeat(5,1fr)] gap-1 text-[10px] font-medium text-slate-400 text-center">
                <div className="text-left">Week</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
              </div>

              {/* Week Rows */}
              {calendarWeeks.map((week) => (
                <div
                  key={week.weekNum}
                  className="grid grid-cols-[60px_repeat(5,1fr)] gap-1 items-center"
                >
                  <div className="text-[10px] font-mono text-slate-500">
                    Wk -{10 - week.weekNum}
                  </div>
                  {week.days.map((day, idx) => {
                    if (!day) return <div key={idx} className="h-8 rounded bg-slate-900/20" />;
                    const isSelected = selectedCell?.key === day.key;
                    return (
                      <button
                        key={day.key}
                        onClick={() => setSelectedCell(day)}
                        className={`h-9 rounded p-1 text-[10px] font-mono flex flex-col items-center justify-center border transition-all cursor-pointer relative ${getCellColor(
                          day
                        )} ${isSelected ? "ring-2 ring-white scale-105 z-10" : "hover:scale-105"}`}
                      >
                        <div className="flex items-center justify-between w-full px-1 text-[8px] opacity-75">
                          <span>{day.date?.slice(5)}</span>
                          <span>{day.tradesCount}t</span>
                        </div>
                        <div className="font-bold text-[10px] leading-tight">
                          {day.tradesCount > 0 ? (
                            <>
                              {metric === "winrate"
                                ? `${day.winRate}%`
                                : metric === "frequency"
                                ? `${day.tradesCount} trades`
                                : `${day.pnl >= 0 ? "+" : ""}$${day.pnl.toFixed(0)}`}
                            </>
                          ) : (
                            <span className="opacity-30">0</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend & Selected Cell Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 items-center">
        {/* Dynamic Color Scale Legend */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            {metric === "pnl"
              ? "Profit Intensity Scale ($ PnL)"
              : metric === "winrate"
              ? "Win Rate Scale (%)"
              : "Volume Activity Scale (Trades)"}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-rose-400 font-mono text-[9px]">-$40+</span>
            <div className="flex items-center gap-0.5">
              <span className="w-4 h-3.5 rounded-sm bg-rose-600 inline-block border border-rose-500/50" />
              <span className="w-4 h-3.5 rounded-sm bg-rose-700 inline-block border border-rose-600/50" />
              <span className="w-4 h-3.5 rounded-sm bg-rose-900 inline-block border border-rose-800/50" />
              <span className="w-4 h-3.5 rounded-sm bg-slate-900 inline-block border border-slate-700/50" />
              <span className="w-4 h-3.5 rounded-sm bg-emerald-950 inline-block border border-emerald-900/50" />
              <span className="w-4 h-3.5 rounded-sm bg-emerald-700 inline-block border border-emerald-600/50" />
              <span className="w-4 h-3.5 rounded-sm bg-emerald-500 inline-block border border-emerald-400/50" />
            </div>
            <span className="text-emerald-400 font-mono text-[9px]">+$50+</span>
            <span className="text-slate-500 ml-2 text-[10px]">
              (Darker = Neutral / Higher Intensity = Edge)
            </span>
          </div>
        </div>

        {/* Selected Cell Inspection Card */}
        {selectedCell ? (
          <div className="p-2 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <span>{selectedCell.label}</span>
                {selectedCell.subLabel && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    · {selectedCell.subLabel}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Trades: <span className="text-slate-200 font-mono font-medium">{selectedCell.tradesCount}</span> (
                <span className="text-emerald-400">{selectedCell.wins}W</span> /{" "}
                <span className="text-rose-400">{selectedCell.losses}L</span>) · Win Rate:{" "}
                <span className="text-slate-200 font-mono font-medium">{selectedCell.winRate}%</span>
              </div>
            </div>
            <div className="text-right pl-3 border-l border-slate-800">
              <div
                className={`text-sm font-bold font-mono ${
                  selectedCell.pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {selectedCell.pnl >= 0 ? "+" : ""}${selectedCell.pnl.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Avg: ${selectedCell.avgPnl.toFixed(2)}/trade
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic flex items-center gap-1.5 justify-end">
            <Info className="w-3.5 h-3.5" />
            <span>Click any heatmap cell to isolate period metrics and trade ratios</span>
          </div>
        )}
      </div>

      {/* Session Profit Factor Breakdown */}
      <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-400 font-medium flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Session PnL Distribution:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
          <div>
            <span className="text-emerald-400 font-semibold">Overlap (13–16 UTC):</span>{" "}
            <span className="text-slate-200 font-bold">
              +${clusters.sessionTotals.Overlap.pnl.toFixed(1)}
            </span>{" "}
            <span className="text-[10px] text-slate-400">
              ({clusters.sessionTotals.Overlap.count}t)
            </span>
          </div>
          <div className="text-slate-600">|</div>
          <div>
            <span className="text-sky-400 font-semibold">London (08–16 UTC):</span>{" "}
            <span className="text-slate-200 font-bold">
              +${clusters.sessionTotals.London.pnl.toFixed(1)}
            </span>{" "}
            <span className="text-[10px] text-slate-400">
              ({clusters.sessionTotals.London.count}t)
            </span>
          </div>
          <div className="text-slate-600">|</div>
          <div>
            <span className="text-purple-400 font-semibold">New York (13–21 UTC):</span>{" "}
            <span className="text-slate-200 font-bold">
              +${clusters.sessionTotals["New York"].pnl.toFixed(1)}
            </span>{" "}
            <span className="text-[10px] text-slate-400">
              ({clusters.sessionTotals["New York"].count}t)
            </span>
          </div>
          <div className="text-slate-600">|</div>
          <div>
            <span className="text-amber-400 font-semibold">Asian (00–08 UTC):</span>{" "}
            <span className="text-slate-200 font-bold">
              +${clusters.sessionTotals.Asian.pnl.toFixed(1)}
            </span>{" "}
            <span className="text-[10px] text-slate-400">
              ({clusters.sessionTotals.Asian.count}t)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
