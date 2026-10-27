import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  Flame,
  Clock,
  Globe,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
} from "lucide-react";

export interface SessionVolatilityHeatmapProps {
  currentSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

export interface TradingSessionInfo {
  id: string;
  name: string;
  shortName: string;
  utcHours: string;
  startHourUtc: number;
  endHourUtc: number;
  description: string;
  liquidityTier: "MAXIMUM" | "HIGH" | "MODERATE" | "LOW";
}

export interface PairSessionVolatility {
  sessionId: string;
  symbol: string;
  avgPips: number;
  atrMultiple: number; // e.g. 2.4x
  spreadPips: number;
  newsFrequency: "EXTREME" | "HIGH" | "MODERATE" | "LOW";
  optimalStrategy: string;
}

const SESSIONS: TradingSessionInfo[] = [
  {
    id: "asian",
    name: "Asian / Tokyo Session",
    shortName: "Tokyo / Asian",
    utcHours: "00:00 - 08:00 UTC",
    startHourUtc: 0,
    endHourUtc: 8,
    description: "Centred around Tokyo, Sydney, and Singapore. Steady consolidation and range trading.",
    liquidityTier: "MODERATE",
  },
  {
    id: "london_open",
    name: "London Morning Session",
    shortName: "London Open",
    utcHours: "08:00 - 13:00 UTC",
    startHourUtc: 8,
    endHourUtc: 13,
    description: "European financial hub open. Heavy institutional volume and major trend initiations.",
    liquidityTier: "HIGH",
  },
  {
    id: "london_ny_overlap",
    name: "London / NY Overlap",
    shortName: "London / NY Overlap",
    utcHours: "13:00 - 17:00 UTC",
    startHourUtc: 13,
    endHourUtc: 17,
    description: "Peak global forex liquidity. Simultaneous London fix and US morning economic releases.",
    liquidityTier: "MAXIMUM",
  },
  {
    id: "ny_afternoon",
    name: "New York Afternoon",
    shortName: "New York PM",
    utcHours: "17:00 - 21:00 UTC",
    startHourUtc: 17,
    endHourUtc: 21,
    description: "US domestic trading, afternoon momentum, closing fixes, and Fed remarks.",
    liquidityTier: "HIGH",
  },
  {
    id: "pacific_rollover",
    name: "Pacific & Bank Rollover",
    shortName: "Pacific / Rollover",
    utcHours: "21:00 - 00:00 UTC",
    startHourUtc: 21,
    endHourUtc: 24,
    description: "Lowest liquidity window, wider spreads, and interbank daily swap rollover.",
    liquidityTier: "LOW",
  },
];

const CURRENCY_PAIRS = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", baseAtr: 28 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", baseAtr: 36 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", baseAtr: 26 },
  { symbol: "XAU/USD", name: "Gold / US Dollar", baseAtr: 110 },
  { symbol: "AUD/USD", name: "Australian Dollar / USD", baseAtr: 25 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", baseAtr: 24 },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", baseAtr: 34 },
  { symbol: "GBP/JPY", name: "British Pound / Yen", baseAtr: 45 },
];

// Matrix of empirical volatility metrics per session & pair
const VOLATILITY_MATRIX: PairSessionVolatility[] = [
  // Asian
  { sessionId: "asian", symbol: "EUR/USD", avgPips: 14.8, atrMultiple: 0.65, spreadPips: 0.4, newsFrequency: "LOW", optimalStrategy: "Mean-Reversion Range" },
  { sessionId: "asian", symbol: "GBP/USD", avgPips: 18.5, atrMultiple: 0.62, spreadPips: 0.8, newsFrequency: "LOW", optimalStrategy: "Support/Resistance Bounce" },
  { sessionId: "asian", symbol: "USD/JPY", avgPips: 27.2, atrMultiple: 1.15, spreadPips: 0.3, newsFrequency: "HIGH", optimalStrategy: "BoJ Flow & Trend Crossover" },
  { sessionId: "asian", symbol: "XAU/USD", avgPips: 52.0, atrMultiple: 0.60, spreadPips: 1.8, newsFrequency: "MODERATE", optimalStrategy: "Asian Session Range Scalp" },
  { sessionId: "asian", symbol: "AUD/USD", avgPips: 28.4, atrMultiple: 1.25, spreadPips: 0.5, newsFrequency: "HIGH", optimalStrategy: "RBA News & Trend Continuation" },
  { sessionId: "asian", symbol: "USD/CAD", avgPips: 15.2, atrMultiple: 0.68, spreadPips: 0.9, newsFrequency: "LOW", optimalStrategy: "Range Channel Trading" },
  { sessionId: "asian", symbol: "EUR/JPY", avgPips: 24.6, atrMultiple: 0.85, spreadPips: 0.8, newsFrequency: "MODERATE", optimalStrategy: "Cross-Yen Scalping" },
  { sessionId: "asian", symbol: "GBP/JPY", avgPips: 32.4, atrMultiple: 0.82, spreadPips: 1.2, newsFrequency: "MODERATE", optimalStrategy: "Tokyo Open Breakout" },

  // London Open
  { sessionId: "london_open", symbol: "EUR/USD", avgPips: 36.4, atrMultiple: 1.55, spreadPips: 0.1, newsFrequency: "HIGH", optimalStrategy: "EMA Crossover + Breakout" },
  { sessionId: "london_open", symbol: "GBP/USD", avgPips: 49.8, atrMultiple: 1.70, spreadPips: 0.4, newsFrequency: "EXTREME", optimalStrategy: "London Open Breakout + Trailing SL" },
  { sessionId: "london_open", symbol: "USD/JPY", avgPips: 29.5, atrMultiple: 1.18, spreadPips: 0.2, newsFrequency: "MODERATE", optimalStrategy: "Trend Continuation" },
  { sessionId: "london_open", symbol: "XAU/USD", avgPips: 98.6, atrMultiple: 1.45, spreadPips: 1.2, newsFrequency: "HIGH", optimalStrategy: "Volatility Momentum" },
  { sessionId: "london_open", symbol: "AUD/USD", avgPips: 30.8, atrMultiple: 1.30, spreadPips: 0.4, newsFrequency: "MODERATE", optimalStrategy: "European Sentiment Follow" },
  { sessionId: "london_open", symbol: "USD/CAD", avgPips: 26.4, atrMultiple: 1.12, spreadPips: 0.6, newsFrequency: "MODERATE", optimalStrategy: "Oil & Macro Alignment" },
  { sessionId: "london_open", symbol: "EUR/JPY", avgPips: 46.2, atrMultiple: 1.62, spreadPips: 0.5, newsFrequency: "HIGH", optimalStrategy: "ECB & Risk-On Momentum" },
  { sessionId: "london_open", symbol: "GBP/JPY", avgPips: 61.5, atrMultiple: 1.78, spreadPips: 0.8, newsFrequency: "HIGH", optimalStrategy: "Dragon Momentum Breakout" },

  // London / NY Overlap (Peak Volatility)
  { sessionId: "london_ny_overlap", symbol: "EUR/USD", avgPips: 48.2, atrMultiple: 2.15, spreadPips: 0.1, newsFrequency: "EXTREME", optimalStrategy: "Fast EMA(9/21) Cross + News Filter" },
  { sessionId: "london_ny_overlap", symbol: "GBP/USD", avgPips: 62.4, atrMultiple: 2.28, spreadPips: 0.2, newsFrequency: "EXTREME", optimalStrategy: "Autopilot Trailing Stop Breakout" },
  { sessionId: "london_ny_overlap", symbol: "USD/JPY", avgPips: 38.6, atrMultiple: 1.65, spreadPips: 0.2, newsFrequency: "HIGH", optimalStrategy: "US Yield Correlation Breakout" },
  { sessionId: "london_ny_overlap", symbol: "XAU/USD", avgPips: 168.0, atrMultiple: 2.45, spreadPips: 1.0, newsFrequency: "EXTREME", optimalStrategy: "Smart ATR Trailing Stop Run" },
  { sessionId: "london_ny_overlap", symbol: "AUD/USD", avgPips: 39.5, atrMultiple: 1.72, spreadPips: 0.3, newsFrequency: "HIGH", optimalStrategy: "Commodity & USD Dynamic Run" },
  { sessionId: "london_ny_overlap", symbol: "USD/CAD", avgPips: 41.2, atrMultiple: 1.85, spreadPips: 0.5, newsFrequency: "HIGH", optimalStrategy: "WTI Crude / EIA Inventory Drift" },
  { sessionId: "london_ny_overlap", symbol: "EUR/JPY", avgPips: 54.8, atrMultiple: 1.95, spreadPips: 0.4, newsFrequency: "HIGH", optimalStrategy: "Global Risk-On/Risk-Off Wave" },
  { sessionId: "london_ny_overlap", symbol: "GBP/JPY", avgPips: 72.8, atrMultiple: 2.12, spreadPips: 0.7, newsFrequency: "EXTREME", optimalStrategy: "High-Alpha Crossover Expansion" },

  // NY Afternoon
  { sessionId: "ny_afternoon", symbol: "EUR/USD", avgPips: 24.2, atrMultiple: 1.05, spreadPips: 0.2, newsFrequency: "MODERATE", optimalStrategy: "Trend Continuation & Close" },
  { sessionId: "ny_afternoon", symbol: "GBP/USD", avgPips: 31.8, atrMultiple: 1.10, spreadPips: 0.5, newsFrequency: "MODERATE", optimalStrategy: "London Close Reversion" },
  { sessionId: "ny_afternoon", symbol: "USD/JPY", avgPips: 23.4, atrMultiple: 0.98, spreadPips: 0.3, newsFrequency: "MODERATE", optimalStrategy: "Fed Remarks Response" },
  { sessionId: "ny_afternoon", symbol: "XAU/USD", avgPips: 78.5, atrMultiple: 1.15, spreadPips: 1.4, newsFrequency: "HIGH", optimalStrategy: "COMEX Pit Settlement Drift" },
  { sessionId: "ny_afternoon", symbol: "AUD/USD", avgPips: 21.6, atrMultiple: 0.92, spreadPips: 0.5, newsFrequency: "LOW", optimalStrategy: "Quiet Channel Drift" },
  { sessionId: "ny_afternoon", symbol: "USD/CAD", avgPips: 28.5, atrMultiple: 1.25, spreadPips: 0.7, newsFrequency: "MODERATE", optimalStrategy: "North American Session Wind-down" },
  { sessionId: "ny_afternoon", symbol: "EUR/JPY", avgPips: 29.8, atrMultiple: 1.05, spreadPips: 0.6, newsFrequency: "LOW", optimalStrategy: "Trend Exhaustion Retracement" },
  { sessionId: "ny_afternoon", symbol: "GBP/JPY", avgPips: 37.6, atrMultiple: 1.12, spreadPips: 0.9, newsFrequency: "LOW", optimalStrategy: "Support/Resistance Protection" },

  // Pacific & Rollover
  { sessionId: "pacific_rollover", symbol: "EUR/USD", avgPips: 9.8, atrMultiple: 0.42, spreadPips: 1.2, newsFrequency: "LOW", optimalStrategy: "Bot Idle / Capital Shield Active" },
  { sessionId: "pacific_rollover", symbol: "GBP/USD", avgPips: 12.4, atrMultiple: 0.40, spreadPips: 1.6, newsFrequency: "LOW", optimalStrategy: "Avoid Market Orders (High Spread)" },
  { sessionId: "pacific_rollover", symbol: "USD/JPY", avgPips: 11.5, atrMultiple: 0.45, spreadPips: 1.0, newsFrequency: "LOW", optimalStrategy: "Spread Filter Pause" },
  { sessionId: "pacific_rollover", symbol: "XAU/USD", avgPips: 29.4, atrMultiple: 0.38, spreadPips: 3.5, newsFrequency: "LOW", optimalStrategy: "Stand Down / Hold Positions" },
  { sessionId: "pacific_rollover", symbol: "AUD/USD", avgPips: 15.8, atrMultiple: 0.65, spreadPips: 1.1, newsFrequency: "LOW", optimalStrategy: "Sydney Early Open Tick" },
  { sessionId: "pacific_rollover", symbol: "USD/CAD", avgPips: 10.6, atrMultiple: 0.45, spreadPips: 1.5, newsFrequency: "LOW", optimalStrategy: "Rollover Swap Management" },
  { sessionId: "pacific_rollover", symbol: "EUR/JPY", avgPips: 13.8, atrMultiple: 0.48, spreadPips: 1.8, newsFrequency: "LOW", optimalStrategy: "Liquidity Thin - Defensive Stop" },
  { sessionId: "pacific_rollover", symbol: "GBP/JPY", avgPips: 18.2, atrMultiple: 0.52, spreadPips: 2.2, newsFrequency: "LOW", optimalStrategy: "Widened Spread Hold" },
];

export const SessionVolatilityHeatmap: React.FC<SessionVolatilityHeatmapProps> = ({
  currentSymbol = "EUR/USD",
  onSelectSymbol,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [metricMode, setMetricMode] = useState<"PIPS" | "ATR_MULTIPLE" | "SPREAD">("PIPS");
  const [hoveredCell, setHoveredCell] = useState<PairSessionVolatility | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 720, height: 260 });

  // Current live UTC hour and active session detection
  const currentUtcHour = useMemo(() => new Date().getUTCHours(), []);
  const activeSessionId = useMemo(() => {
    if (currentUtcHour >= 13 && currentUtcHour < 17) return "london_ny_overlap";
    if (currentUtcHour >= 8 && currentUtcHour < 13) return "london_open";
    if (currentUtcHour >= 17 && currentUtcHour < 21) return "ny_afternoon";
    if (currentUtcHour >= 0 && currentUtcHour < 8) return "asian";
    return "pacific_rollover";
  }, [currentUtcHour]);

  // Handle responsive resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions((prev) => ({
            ...prev,
            width: Math.max(340, entry.contentRect.width),
          }));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute D3 Color Scale based on selected metric
  const colorScale = useMemo(() => {
    if (metricMode === "PIPS") {
      // Normalize pips: 10 to 170
      return d3
        .scaleLinear<string>()
        .domain([10, 30, 65, 170])
        .range(["#0d1527", "#0284c7", "#f59e0b", "#f43f5e"])
        .clamp(true);
    } else if (metricMode === "ATR_MULTIPLE") {
      // 0.4x to 2.5x
      return d3
        .scaleLinear<string>()
        .domain([0.4, 1.0, 1.7, 2.5])
        .range(["#09131e", "#0d9488", "#eab308", "#ef4444"])
        .clamp(true);
    } else {
      // SPREAD: Inverted! Low spread = emerald/cyan, High spread = fiery crimson
      return d3
        .scaleLinear<string>()
        .domain([0.1, 0.5, 1.2, 3.5])
        .range(["#059669", "#0284c7", "#d97706", "#dc2626"])
        .clamp(true);
    }
  }, [metricMode]);

  // Draw Heatmap with D3
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 38, right: 20, bottom: 20, left: 145 };
    const chartWidth = Math.max(180, dimensions.width - margin.left - margin.right);
    const chartHeight = Math.max(140, dimensions.height - margin.top - margin.bottom);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xSymbols = CURRENCY_PAIRS.map((p) => p.symbol);
    const ySessions = SESSIONS.map((s) => s.id);

    // X scale for currency pairs
    const xScale = d3
      .scaleBand()
      .domain(xSymbols)
      .range([0, chartWidth])
      .padding(0.08);

    // Y scale for sessions
    const yScale = d3
      .scaleBand()
      .domain(ySessions)
      .range([0, chartHeight])
      .padding(0.1);

    // Column Headers (Currency Pairs at Top)
    g.selectAll(".col-header")
      .data(xSymbols)
      .enter()
      .append("g")
      .attr("class", "col-header")
      .attr("transform", (d) => `translate(${(xScale(d) ?? 0) + xScale.bandwidth() / 2}, -10)`)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        if (onSelectSymbol) onSelectSymbol(d);
      })
      .each(function (d) {
        const sel = d3.select(this);
        const isCurrent = d === currentSymbol;

        sel
          .append("text")
          .attr("text-anchor", "middle")
          .attr("font-family", "ui-monospace, monospace")
          .attr("font-size", isCurrent ? "11px" : "10px")
          .attr("font-weight", isCurrent ? "700" : "600")
          .attr("fill", isCurrent ? "#38bdf8" : "#94a3b8")
          .text(d);

        if (isCurrent) {
          sel
            .append("circle")
            .attr("cy", -14)
            .attr("r", 2.5)
            .attr("fill", "#38bdf8");
        }
      });

    // Row Headers (Sessions on Left)
    g.selectAll(".row-header")
      .data(SESSIONS)
      .enter()
      .append("g")
      .attr("class", "row-header")
      .attr("transform", (d) => `translate(-12, ${(yScale(d.id) ?? 0) + yScale.bandwidth() / 2})`)
      .each(function (d) {
        const sel = d3.select(this);
        const isActive = d.id === activeSessionId;

        // Session short title
        sel
          .append("text")
          .attr("text-anchor", "end")
          .attr("dy", "-2")
          .attr("font-family", "sans-serif")
          .attr("font-size", "11px")
          .attr("font-weight", isActive ? "700" : "500")
          .attr("fill", isActive ? "#00e5a8" : "#cbd5e1")
          .text(d.shortName);

        // Session UTC hours badge
        sel
          .append("text")
          .attr("text-anchor", "end")
          .attr("dy", "10")
          .attr("font-family", "ui-monospace, monospace")
          .attr("font-size", "8.5px")
          .attr("fill", isActive ? "#6ee7b7" : "#64748b")
          .text(d.utcHours);

        if (isActive) {
          sel
            .append("circle")
            .attr("cx", -margin.left + 18)
            .attr("cy", 2)
            .attr("r", 3)
            .attr("fill", "#00e5a8")
            .attr("class", "animate-pulse");
        }
      });

    // Render Matrix Cells
    const cellGroups = g
      .selectAll(".cell")
      .data(VOLATILITY_MATRIX)
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr(
        "transform",
        (d) => `translate(${xScale(d.symbol) ?? 0}, ${yScale(d.sessionId) ?? 0})`
      )
      .style("cursor", "pointer");

    // Background rect
    cellGroups
      .append("rect")
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", (d) => {
        const val =
          metricMode === "PIPS"
            ? d.avgPips
            : metricMode === "ATR_MULTIPLE"
            ? d.atrMultiple
            : d.spreadPips;
        return colorScale(val);
      })
      .attr("stroke", (d) => {
        if (d.symbol === currentSymbol && d.sessionId === activeSessionId) return "#38bdf8";
        if (d.symbol === currentSymbol) return "#0284c7";
        if (d.sessionId === activeSessionId) return "#00e5a8";
        return "#1e293b";
      })
      .attr("stroke-width", (d) =>
        d.symbol === currentSymbol && d.sessionId === activeSessionId ? 2 : 1
      )
      .attr("stroke-opacity", 0.7);

    // Primary Value Text in Cell
    cellGroups
      .append("text")
      .attr("x", xScale.bandwidth() / 2)
      .attr("y", yScale.bandwidth() / 2 + 1)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-family", "ui-monospace, monospace")
      .attr("font-size", xScale.bandwidth() < 60 ? "10px" : "11px")
      .attr("font-weight", "700")
      .attr("fill", "#ffffff")
      .text((d) => {
        if (metricMode === "PIPS") {
          return `${d.avgPips >= 100 ? Math.round(d.avgPips) : d.avgPips.toFixed(1)}p`;
        } else if (metricMode === "ATR_MULTIPLE") {
          return `${d.atrMultiple.toFixed(2)}x`;
        } else {
          return `${d.spreadPips.toFixed(1)}p`;
        }
      });

    // Secondary Sub-text (only if bandwidth permits)
    if (xScale.bandwidth() >= 65 && yScale.bandwidth() >= 32) {
      cellGroups
        .append("text")
        .attr("x", xScale.bandwidth() / 2)
        .attr("y", yScale.bandwidth() / 2 + 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "ui-monospace, monospace")
        .attr("font-size", "8px")
        .attr("fill", "#cbd5e1")
        .attr("opacity", 0.8)
        .text((d) => (metricMode === "PIPS" ? `${d.atrMultiple}x ATR` : `${d.avgPips}p`));
    }

    // Interactivity: hover & click
    cellGroups
      .on("mouseenter", function (event, d) {
        d3.select(this).select("rect").attr("stroke", "#ffffff").attr("stroke-width", 2);
        setHoveredCell(d);
        const [mx, my] = d3.pointer(event, containerRef.current);
        setHoverPosition({ x: mx, y: my });
      })
      .on("mousemove", function (event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setHoverPosition({ x: mx, y: my });
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .select("rect")
          .attr(
            "stroke",
            d.symbol === currentSymbol && d.sessionId === activeSessionId
              ? "#38bdf8"
              : d.symbol === currentSymbol
              ? "#0284c7"
              : d.sessionId === activeSessionId
              ? "#00e5a8"
              : "#1e293b"
          )
          .attr(
            "stroke-width",
            d.symbol === currentSymbol && d.sessionId === activeSessionId ? 2 : 1
          );
        setHoveredCell(null);
        setHoverPosition(null);
      })
      .on("click", (_, d) => {
        if (onSelectSymbol) onSelectSymbol(d.symbol);
      });
  }, [
    dimensions,
    metricMode,
    colorScale,
    currentSymbol,
    activeSessionId,
    onSelectSymbol,
  ]);

  const activeSessionData = useMemo(
    () => SESSIONS.find((s) => s.id === activeSessionId) || SESSIONS[0],
    [activeSessionId]
  );

  return (
    <div className="space-y-3 select-none">
      {/* Heatmap Sub-Header with Controls & Live UTC Session Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#0a0d13] p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
                <span>Forex Market Volatility Heatmap</span>
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Active: {activeSessionData.shortName}</span>
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Color-coded average pip volatility, ATR multiple, and liquidity across trading sessions
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#070a10] border border-slate-800 rounded p-0.5 text-[11px] self-start sm:self-auto font-mono">
          <button
            onClick={() => setMetricMode("PIPS")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
              metricMode === "PIPS"
                ? "bg-slate-700 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Avg Pips
          </button>
          <button
            onClick={() => setMetricMode("ATR_MULTIPLE")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
              metricMode === "ATR_MULTIPLE"
                ? "bg-slate-700 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            ATR Multiple
          </button>
          <button
            onClick={() => setMetricMode("SPREAD")}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer font-medium ${
              metricMode === "SPREAD"
                ? "bg-slate-700 text-white font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Spread (Cost)
          </button>
        </div>
      </div>

      {/* SVG Container with D3 rendering */}
      <div
        ref={containerRef}
        className="relative w-full bg-[#070a10] border border-slate-800/80 rounded-lg overflow-hidden py-2"
        style={{ minHeight: "260px" }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto block"
        />

        {/* Interactive Floating Tooltip */}
        {hoveredCell && hoverPosition && (
          <div
            className="absolute pointer-events-none z-30 bg-[#0b0f17] border border-slate-700/80 rounded-lg p-3 shadow-2xl text-xs space-y-1.5 backdrop-blur-xs font-mono max-w-xs transition-all duration-75"
            style={{
              left: Math.min(hoverPosition.x + 15, dimensions.width - 260),
              top: Math.max(10, hoverPosition.y - 70),
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-sky-300 text-sm">{hoveredCell.symbol}</span>
              <span className="text-[10px] text-slate-400">
                {SESSIONS.find((s) => s.id === hoveredCell.sessionId)?.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-slate-500 block text-[10px]">Avg Volatility:</span>
                <strong className="text-amber-300 font-bold text-xs">{hoveredCell.avgPips} pips</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ATR Multiple:</span>
                <strong className="text-emerald-400 font-bold text-xs">{hoveredCell.atrMultiple}x</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Typical Spread:</span>
                <strong className="text-slate-200 font-bold text-xs">{hoveredCell.spreadPips} pips</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">News Risk:</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    hoveredCell.newsFrequency === "EXTREME"
                      ? "bg-rose-950 text-rose-300 border border-rose-500/50"
                      : hoveredCell.newsFrequency === "HIGH"
                      ? "bg-amber-950 text-amber-300 border border-amber-500/50"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {hoveredCell.newsFrequency}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 text-[10.5px] text-slate-300 font-sans">
              <span className="text-sky-400 font-medium">Optimal Edge: </span>
              {hoveredCell.optimalStrategy}
            </div>

            <div className="text-[9.5px] text-slate-500 text-right pt-0.5 font-sans">
              Click cell to switch chart to {hoveredCell.symbol}
            </div>
          </div>
        )}
      </div>

      {/* Legend & Analytical Takeaways Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
        {/* Color Scale Legend */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Low ({metricMode === "PIPS" ? "10p" : metricMode === "ATR_MULTIPLE" ? "0.4x" : "0.1p"})</span>
            <span className="font-semibold text-slate-200">
              {metricMode === "PIPS"
                ? "Pip Range Scale"
                : metricMode === "ATR_MULTIPLE"
                ? "ATR Multiplier Scale"
                : "Spread Impact (Lower is better)"}
            </span>
            <span>High ({metricMode === "PIPS" ? "170p+" : metricMode === "ATR_MULTIPLE" ? "2.5x+" : "3.5p+"})</span>
          </div>
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{
              background:
                metricMode === "SPREAD"
                  ? "linear-gradient(to right, #059669, #0284c7, #d97706, #dc2626)"
                  : "linear-gradient(to right, #0d1527, #0284c7, #f59e0b, #f43f5e)",
            }}
          />
        </div>

        {/* Highest Volatility Trading Window */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-rose-500/30 flex items-center gap-2.5">
          <div className="p-2 rounded bg-rose-500/10 text-rose-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-rose-400 font-semibold font-mono uppercase">
              Peak Volatility Alpha Window
            </div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">
              London / NY Overlap (13:00 - 17:00 UTC)
            </div>
            <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
              Average 60–165 pips/session. Best for EMA Crossover and Trailing Stop breakouts.
            </p>
          </div>
        </div>

        {/* Tightest Spreads / Best Cost Efficiency */}
        <div className="p-2.5 rounded bg-[#0a0d13] border border-emerald-500/30 flex items-center gap-2.5">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-semibold font-mono uppercase">
              Tightest Spread Efficiency
            </div>
            <div className="text-xs font-bold text-slate-100 mt-0.5">
              EUR/USD &amp; GBP/USD (0.1 - 0.4 pips)
            </div>
            <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
              Institutional ECN pricing with lowest slippage and maximum win-to-loss profit compounding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
