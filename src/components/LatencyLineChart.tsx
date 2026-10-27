import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Activity, Wifi, ShieldCheck, AlertCircle } from "lucide-react";
import { ConnectionStatus, LatencyPoint } from "../types/broker";

interface LatencyLineChartProps {
  data: LatencyPoint[];
  currentPing?: number;
  status: ConnectionStatus;
  serverName?: string;
  height?: number;
  compact?: boolean;
  onOpenSettings?: () => void;
  title?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomLatencyTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload as LatencyPoint;
    const ping = item.ping;
    const quality =
      ping < 25 ? "Ultra Low (Optimal)" : ping < 60 ? "Good" : ping < 120 ? "Acceptable" : "High Latency";
    const qualityColor =
      ping < 25 ? "text-emerald-400" : ping < 60 ? "text-sky-400" : ping < 120 ? "text-amber-400" : "text-rose-400";

    return (
      <div className="bg-[#0a0d13] border border-slate-700/90 rounded-md p-2 shadow-xl text-xs font-mono space-y-1 z-50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1 text-[11px]">
          <span className="text-slate-400 font-sans">MT5 Handshake</span>
          <span className="text-slate-300 font-semibold">{item.time}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400 font-sans">Ping:</span>
          <span className="font-bold text-emerald-400 text-sm">{ping.toFixed(1)} ms</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[10.5px]">
          <span className="text-slate-400 font-sans">Quality:</span>
          <span className={`font-semibold ${qualityColor}`}>{quality}</span>
        </div>
        {item.jitter !== undefined && (
          <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400">
            <span className="font-sans">Jitter:</span>
            <span className="text-slate-300">±{item.jitter.toFixed(1)} ms</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const LatencyLineChart: React.FC<LatencyLineChartProps> = ({
  data,
  currentPing,
  status,
  serverName = "Exness-Real10",
  height = 70,
  compact = false,
  onOpenSettings,
  title = "MT5 Connection Latency",
}) => {
  const isConnected = status === "CONNECTED";

  // Calculate statistics (min, max, avg, jitter)
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      const fallbackPing = currentPing || 14;
      return {
        current: fallbackPing,
        min: fallbackPing,
        max: fallbackPing,
        avg: fallbackPing,
        jitter: 1.2,
        stabilityPercent: 99.8,
      };
    }

    const pings = data.map((d) => d.ping);
    const min = Math.min(...pings);
    const max = Math.max(...pings);
    const sum = pings.reduce((acc, p) => acc + p, 0);
    const avg = Number((sum / pings.length).toFixed(1));
    const current = currentPing !== undefined ? currentPing : pings[pings.length - 1];

    // Jitter: average deviation between successive pings
    let jitterSum = 0;
    for (let i = 1; i < pings.length; i++) {
      jitterSum += Math.abs(pings[i] - pings[i - 1]);
    }
    const jitter = pings.length > 1 ? Number((jitterSum / (pings.length - 1)).toFixed(1)) : 1.2;

    // Stability score (100% minus variance penalty)
    const variance = max - min;
    const stabilityPercent = Math.max(92, Math.min(99.9, Number((100 - variance * 0.4).toFixed(1))));

    return {
      current,
      min: Number(min.toFixed(1)),
      max: Number(max.toFixed(1)),
      avg,
      jitter,
      stabilityPercent,
    };
  }, [data, currentPing]);

  // Determine line color and gradient based on health
  const strokeColor =
    !isConnected
      ? "#64748b"
      : stats.current < 30
      ? "#00e5a8"
      : stats.current < 75
      ? "#38bdf8"
      : "#fbbf24";

  const gradientId = useMemo(() => `latency-gradient-${Math.random().toString(36).substring(2, 7)}`, []);

  // Compute domain padding
  const yDomain = useMemo(() => {
    const minVal = Math.max(0, Math.floor(stats.min - 4));
    const maxVal = Math.ceil(stats.max + 4);
    return [minVal, maxVal];
  }, [stats.min, stats.max]);

  return (
    <div className="bg-[#0b1320] border border-[#1a2f4c] rounded-lg p-2.5 space-y-2 select-none shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className={`w-3.5 h-3.5 ${isConnected ? "text-[#00e5a8] animate-pulse" : "text-slate-500"}`} />
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            {title}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-[10.5px] font-mono text-slate-400 truncate max-w-[120px]" title={serverName}>
            {serverName}
          </span>
        </div>

        {/* Live Ping & Quality text */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {isConnected ? (
            <>
              <span className="font-extrabold text-[#00e5a8] text-[12px]">
                {stats.current.toFixed(0)}ms
              </span>
              <span className="text-[10px] text-emerald-400/80 font-sans hidden sm:inline">
                ({stats.stabilityPercent}% Stable)
              </span>
            </>
          ) : (
            <span className="text-slate-500 text-[11px] font-sans">Disconnected</span>
          )}
        </div>
      </div>

      {/* Latency Line Chart Container */}
      <div className="w-full relative" style={{ height }}>
        {data.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-500 font-mono">
            Awaiting MT5 ping packets...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 6, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <YAxis
                domain={yDomain}
                tick={{ fill: "#64748b", fontSize: 9, fontFamily: "monospace" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />

              <XAxis dataKey="time" hide />

              <Tooltip content={<CustomLatencyTooltip />} />

              <ReferenceLine
                y={stats.avg}
                stroke="#334155"
                strokeDasharray="2 2"
                label={
                  !compact
                    ? {
                        value: `avg ${stats.avg}ms`,
                        fill: "#64748b",
                        fontSize: 8,
                        position: "insideTopRight",
                      }
                    : undefined
                }
              />

              <Area
                type="monotone"
                dataKey="ping"
                stroke={strokeColor}
                strokeWidth={1.8}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Metrics footer strip */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-[#162740]/80">
        <div className="flex items-center gap-2">
          <span>
            Min: <strong className="text-slate-300">{stats.min}ms</strong>
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>
            Avg: <strong className="text-slate-300">{stats.avg}ms</strong>
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span>
            Max: <strong className="text-slate-300">{stats.max}ms</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Jitter: <strong className="text-slate-300">±{stats.jitter}ms</strong></span>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[#00e5a8] hover:underline cursor-pointer ml-1"
            >
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
