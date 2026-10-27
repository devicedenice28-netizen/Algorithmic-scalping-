import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";
import { Trade } from "../types/trading";
import { ShieldAlert, TrendingDown, AlertCircle, CheckCircle2, Activity } from "lucide-react";

export interface DrawdownAreaChartProps {
  history: Trade[];
  initialBalance: number;
  peakBalance: number;
  maxRecordedDrawdown: number;
  currentSymbol?: string;
  maxDrawdownLimitPercent?: number;
}

interface DrawdownDataPoint {
  index: number;
  label: string;
  trade?: Trade;
  balance: number;
  peak: number;
  drawdownDollar: number;
  drawdownPercent: number;
  time: string;
}

export const DrawdownAreaChart: React.FC<DrawdownAreaChartProps> = ({
  history,
  initialBalance,
  peakBalance,
  maxRecordedDrawdown,
  currentSymbol = "EUR/USD",
  maxDrawdownLimitPercent = 5.0,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 260 });
  const [viewMetric, setViewMetric] = useState<"PERCENT" | "DOLLAR">("PERCENT");
  const [hoveredPoint, setHoveredPoint] = useState<DrawdownDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Resize observer to ensure responsive rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions((prev) => ({ ...prev, width: Math.max(320, width) }));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute drawdown history curve points
  const dataPoints: DrawdownDataPoint[] = useMemo(() => {
    const points: DrawdownDataPoint[] = [];

    // Point 0: Initial state
    points.push({
      index: 0,
      label: "Start",
      balance: initialBalance,
      peak: initialBalance,
      drawdownDollar: 0,
      drawdownPercent: 0,
      time: "Initial",
    });

    let runningPeak = initialBalance;
    let runningBalance = initialBalance;

    if (history.length > 0) {
      history.forEach((t, i) => {
        runningBalance = t.balance;
        if (runningBalance > runningPeak) {
          runningPeak = runningBalance;
        }
        const ddDollar = Math.max(0, runningPeak - runningBalance);
        const ddPercent = runningPeak > 0 ? (ddDollar / runningPeak) * 100 : 0;

        points.push({
          index: i + 1,
          label: `#${t.ticket || i + 1}`,
          trade: t,
          balance: runningBalance,
          peak: runningPeak,
          drawdownDollar: Number(ddDollar.toFixed(2)),
          drawdownPercent: Number(ddPercent.toFixed(2)),
          time: t.exitTime || `T${i + 1}`,
        });
      });
    } else {
      // Synthesize demo recovery milestones if no closed trades yet to visualize account baseline
      const sampleCounts = 6;
      for (let i = 1; i <= sampleCounts; i++) {
        points.push({
          index: i,
          label: `Sim-${i}`,
          balance: initialBalance,
          peak: initialBalance,
          drawdownDollar: 0,
          drawdownPercent: 0,
          time: `00:0${i}`,
        });
      }
    }

    return points;
  }, [history, initialBalance]);

  // Deepest drawdown point
  const deepestPoint = useMemo(() => {
    if (dataPoints.length === 0) return null;
    return dataPoints.reduce((max, p) => (p.drawdownPercent > max.drawdownPercent ? p : max), dataPoints[0]);
  }, [dataPoints]);

  const currentPoint = dataPoints[dataPoints.length - 1];

  // Draw D3 Area Chart
  useEffect(() => {
    if (!svgRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const margin = { top: 28, right: 35, bottom: 32, left: 54 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, dataPoints.length - 1])
      .range([margin.left, width - margin.right]);

    const maxVal = viewMetric === "PERCENT"
      ? Math.max(maxRecordedDrawdown * 1.25, maxDrawdownLimitPercent * 1.2, 5.0)
      : Math.max(deepestPoint ? deepestPoint.drawdownDollar * 1.25 : 100, 150);

    // 0 at top (margin.top), max drawdown at bottom (height - margin.bottom)
    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal])
      .range([margin.top, height - margin.bottom]);

    // Defs & Gradients
    const defs = svg.append("defs");

    // Underwater Area Gradient (Teal -> Amber -> Crimson)
    const areaGradient = defs
      .append("linearGradient")
      .attr("id", "drawdown-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", 0.08);
    areaGradient.append("stop").attr("offset", "35%").attr("stop-color", "#f59e0b").attr("stop-opacity", 0.35);
    areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#ef4444").attr("stop-opacity", 0.65);

    // Line Gradient
    const lineGradient = defs
      .append("linearGradient")
      .attr("id", "drawdown-line-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    lineGradient.append("stop").attr("offset", "0%").attr("stop-color", "#34d399");
    lineGradient.append("stop").attr("offset", "40%").attr("stop-color", "#fbbf24");
    lineGradient.append("stop").attr("offset", "100%").attr("stop-color", "#f87171");

    // Background horizontal grid lines
    const yTicks = yScale.ticks(5);
    const gridGroup = svg.append("g").attr("class", "grid-lines");

    yTicks.forEach((tick) => {
      const y = yScale(tick);
      gridGroup
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", "#1e293b")
        .attr("stroke-dasharray", "2,3")
        .attr("stroke-width", 1);
    });

    // 0% Baseline (High-Water Mark)
    const zeroY = yScale(0);
    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", zeroY)
      .attr("y2", zeroY)
      .attr("stroke", "#10b981")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0.85);

    svg
      .append("text")
      .attr("x", margin.left + 8)
      .attr("y", zeroY - 6)
      .attr("fill", "#34d399")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", "600")
      .text("HIGH-WATER MARK (0% DRAWDOWN)");

    // Max Risk Limit Reference Line (e.g., 5%)
    if (viewMetric === "PERCENT" && maxDrawdownLimitPercent < maxVal) {
      const limitY = yScale(maxDrawdownLimitPercent);
      svg
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", limitY)
        .attr("y2", limitY)
        .attr("stroke", "#ef4444")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.75);

      svg
        .append("text")
        .attr("x", width - margin.right - 6)
        .attr("y", limitY - 4)
        .attr("text-anchor", "end")
        .attr("fill", "#f87171")
        .attr("font-size", "9.5px")
        .attr("font-family", "JetBrains Mono, monospace")
        .text(`Risk Cap: ${maxDrawdownLimitPercent.toFixed(1)}%`);
    }

    // D3 Area Generator: Fills downwards from 0% baseline (zeroY) to drawdown curve
    const areaGen = d3
      .area<DrawdownDataPoint>()
      .x((d) => xScale(d.index))
      .y0(zeroY)
      .y1((d) => yScale(viewMetric === "PERCENT" ? d.drawdownPercent : d.drawdownDollar))
      .curve(d3.curveMonotoneX);

    // D3 Line Generator
    const lineGen = d3
      .line<DrawdownDataPoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(viewMetric === "PERCENT" ? d.drawdownPercent : d.drawdownDollar))
      .curve(d3.curveMonotoneX);

    // Render Area
    svg
      .append("path")
      .datum(dataPoints)
      .attr("fill", "url(#drawdown-area-gradient)")
      .attr("d", areaGen);

    // Render Drawdown Line
    svg
      .append("path")
      .datum(dataPoints)
      .attr("fill", "none")
      .attr("stroke", "url(#drawdown-line-gradient)")
      .attr("stroke-width", 2.2)
      .attr("d", lineGen);

    // Deepest Drawdown Anchor & Callout
    if (deepestPoint && deepestPoint.drawdownPercent > 0.05) {
      const deepestX = xScale(deepestPoint.index);
      const deepestY = yScale(
        viewMetric === "PERCENT" ? deepestPoint.drawdownPercent : deepestPoint.drawdownDollar
      );

      // Pulse ring
      svg
        .append("circle")
        .attr("cx", deepestX)
        .attr("cy", deepestY)
        .attr("r", 6)
        .attr("fill", "rgba(239, 68, 68, 0.25)")
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 1.5);

      svg
        .append("circle")
        .attr("cx", deepestX)
        .attr("cy", deepestY)
        .attr("r", 2.5)
        .attr("fill", "#ffffff");

      // Badge
      svg
        .append("text")
        .attr("x", deepestX)
        .attr("y", deepestY + 16)
        .attr("text-anchor", "middle")
        .attr("fill", "#f87171")
        .attr("font-size", "9.5px")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-weight", "600")
        .text(
          `Max DD: -${
            viewMetric === "PERCENT"
              ? `${deepestPoint.drawdownPercent.toFixed(1)}%`
              : `$${deepestPoint.drawdownDollar.toFixed(0)}`
          }`
        );
    }

    // Y Axis (Left)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) =>
        viewMetric === "PERCENT"
          ? `${Number(d) === 0 ? "0%" : `-${d}%`}`
          : `${Number(d) === 0 ? "$0" : `-$${d}`}`
      );

    const yAxisG = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis);

    yAxisG.select(".domain").attr("stroke", "#334155");
    yAxisG.selectAll(".tick line").attr("stroke", "#334155");
    yAxisG
      .selectAll(".tick text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono, monospace");

    // X Axis (Bottom)
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(dataPoints.length, 8))
      .tickFormat((i) => {
        const pt = dataPoints[Number(i)];
        return pt ? (Number(i) === 0 ? "Start" : `#${i}`) : "";
      });

    const xAxisG = svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    xAxisG.select(".domain").attr("stroke", "#334155");
    xAxisG.selectAll(".tick line").attr("stroke", "#334155");
    xAxisG
      .selectAll(".tick text")
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono, monospace");

    // Interactive Crosshair and Hover Detection
    const bisectIndex = d3.bisector((d: DrawdownDataPoint) => d.index).center;

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("cursor", "crosshair")
      .on("mousemove", (event: MouseEvent) => {
        const [mx, my] = d3.pointer(event, svgRef.current);
        const xVal = xScale.invert(mx);
        const idx = bisectIndex(dataPoints, xVal);
        const pt = dataPoints[Math.max(0, Math.min(dataPoints.length - 1, idx))];
        if (pt) {
          setHoveredPoint(pt);
          setHoverPos({ x: xScale(pt.index), y: yScale(viewMetric === "PERCENT" ? pt.drawdownPercent : pt.drawdownDollar) });
        }
      })
      .on("mouseleave", () => {
        setHoveredPoint(null);
        setHoverPos(null);
      });
  }, [dataPoints, dimensions, viewMetric, maxRecordedDrawdown, maxDrawdownLimitPercent, deepestPoint]);

  // Account Stability Rating calculation
  const stabilityScore = useMemo(() => {
    // Stability score from 100 based on max drawdown and recovery speed
    const maxDD = maxRecordedDrawdown;
    let score = 100 - maxDD * 5.5;
    if (score < 20) score = 20;
    return Math.round(Math.min(100, score));
  }, [maxRecordedDrawdown]);

  return (
    <div className="bg-[#0a0d13] border border-slate-800 rounded-lg p-3 space-y-3">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-rose-950/60 border border-rose-500/40 text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-slate-100 font-mono tracking-wide">
                DRAWDOWN HISTORY (D3 AREA CHART)
              </h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {currentSymbol}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualizes account underwater equity dips and capital preservation stability across trade sequence.
            </p>
          </div>
        </div>

        {/* Right Badges & Metric Selector */}
        <div className="flex items-center gap-2">
          {/* Stability Metric Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e121a] border border-slate-800 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px]">Stability Index:</span>
            <span className={`font-bold ${stabilityScore >= 80 ? "text-emerald-400" : stabilityScore >= 60 ? "text-amber-400" : "text-rose-400"}`}>
              {stabilityScore}/100
            </span>
          </div>

          {/* Metric Switcher: Percent vs Dollar */}
          <div className="flex items-center bg-[#0e121a] border border-slate-800 rounded p-0.5 text-[11px] font-mono">
            <button
              onClick={() => setViewMetric("PERCENT")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                viewMetric === "PERCENT"
                  ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Drawdown %
            </button>
            <button
              onClick={() => setViewMetric("DOLLAR")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                viewMetric === "DOLLAR"
                  ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Drawdown $
            </button>
          </div>
        </div>
      </div>

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Max Recorded Drawdown</div>
          <div className={`text-sm font-bold ${maxRecordedDrawdown >= 8 ? "text-rose-400" : "text-amber-400"}`}>
            -{maxRecordedDrawdown.toFixed(2)}%
            <span className="text-[11px] ml-1 font-normal text-slate-400">
              (-${deepestPoint ? deepestPoint.drawdownDollar.toFixed(2) : "0.00"})
            </span>
          </div>
        </div>

        <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Current Underwater Drawdown</div>
          <div className={`text-sm font-bold ${currentPoint?.drawdownPercent > 0.05 ? "text-amber-400" : "text-emerald-400"}`}>
            {currentPoint ? `-${currentPoint.drawdownPercent.toFixed(2)}%` : "0.00%"}
            <span className="text-[11px] ml-1 font-normal text-slate-400">
              (-${currentPoint ? currentPoint.drawdownDollar.toFixed(2) : "0.00"})
            </span>
          </div>
        </div>

        <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Peak High-Water Mark</div>
          <div className="text-sm font-bold text-emerald-400">
            ${peakBalance.toFixed(2)}
          </div>
        </div>

        <div className="p-2 rounded bg-[#0e121a] border border-slate-800/80">
          <div className="text-[10px] text-slate-400">Max Risk Cap Rule</div>
          <div className="text-sm font-bold text-slate-300">
            {maxDrawdownLimitPercent.toFixed(1)}% Limit
          </div>
        </div>
      </div>

      {/* D3 SVG Viewport */}
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full block"
        />

        {/* Hover Crosshair Marker & Tooltip */}
        {hoveredPoint && hoverPos && (
          <>
            {/* Vertical Guide Line */}
            <div
              className="absolute top-0 bottom-8 w-[1px] bg-slate-400/50 pointer-events-none border-l border-dashed border-slate-400"
              style={{ left: `${hoverPos.x}px` }}
            />

            {/* Glowing Dot on Line */}
            <div
              className="absolute w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
            />

            {/* Floating Tooltip */}
            <div
              className="absolute z-30 px-3 py-2 rounded-md bg-[#0f172a]/95 border border-slate-700 shadow-xl pointer-events-none text-xs font-mono space-y-1 backdrop-blur-xs"
              style={{
                left: Math.min(hoverPos.x + 12, dimensions.width - 200),
                top: Math.max(hoverPos.y - 65, 8),
              }}
            >
              <div className="flex items-center justify-between gap-4 font-bold text-slate-200 border-b border-slate-700/60 pb-0.5">
                <span>{hoveredPoint.label}</span>
                <span className="text-[10px] text-slate-400">{hoveredPoint.time}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-400">Balance:</span>
                <span className="text-slate-200 font-semibold">${hoveredPoint.balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-400">Peak High:</span>
                <span className="text-emerald-400 font-semibold">${hoveredPoint.peak.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                <span className="text-slate-400">Drawdown:</span>
                <span className={hoveredPoint.drawdownPercent > 0.05 ? "text-rose-400" : "text-emerald-400"}>
                  -{hoveredPoint.drawdownPercent.toFixed(2)}% (-${hoveredPoint.drawdownDollar.toFixed(2)})
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend & Analytical Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-mono text-slate-400 pt-1">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block" />
            <span>0% High-Water Mark</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-xs bg-rose-500/40 inline-block border border-rose-500/60" />
            <span>Underwater Drawdown Area</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
            <span>5.0% Risk Limit Threshold</span>
          </div>
        </div>
        <div className="text-slate-500">
          D3.js dynamic interpolation · Monotone curve
        </div>
      </div>
    </div>
  );
};
