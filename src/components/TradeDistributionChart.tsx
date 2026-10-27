import React from "react";
import { Trade } from "../types/trading";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface TradeDistributionChartProps {
  history: Trade[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isWin = data.profit >= 0;

    return (
      <div className="bg-[#0a0d13] border border-slate-700/80 rounded-md p-2.5 shadow-xl text-xs font-mono space-y-1">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
          <span className="font-sans font-semibold text-slate-200">
            Trade #{data.ticket}
          </span>
          <span
            className={`font-semibold ${
              data.type === "BUY" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {data.type}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span className="font-sans">Exit Time:</span>
          <span className="text-slate-200">{data.exitTime}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="font-sans text-slate-400">P/L:</span>
          <span className={`font-bold ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
            {isWin ? "+" : ""}${data.profit.toFixed(2)} ({data.pips >= 0 ? "+" : ""}{data.pips} pips)
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400">
          <span className="font-sans">Balance:</span>
          <span className="text-slate-200">${data.balance.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-slate-400 pt-0.5 border-t border-slate-800/60 text-[10px]">
          <span className="font-sans">Trigger:</span>
          <span className="text-slate-300 font-sans">{data.exitReason.replace("_", " ")}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const TradeDistributionChart: React.FC<TradeDistributionChartProps> = ({
  history,
}) => {
  const chartData = history.map((trade, index) => ({
    tradeIndex: index + 1,
    ticket: trade.ticket,
    label: `#${index + 1}`,
    profit: trade.profit,
    pips: trade.pips,
    type: trade.type,
    exitTime: trade.exitTime,
    balance: trade.balance,
    exitReason: trade.exitReason,
  }));

  const winningTrades = history.filter((t) => t.profit > 0);
  const losingTrades = history.filter((t) => t.profit < 0);
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((acc, t) => acc + t.profit, 0) / winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((acc, t) => acc + t.profit, 0) / losingTrades.length)
      : 0;

  return (
    <div className="p-3 rounded bg-[#0a0d13] border border-slate-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Trade Profit & Loss Distribution Over Time</span>
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            ({history.length} {history.length === 1 ? "trade" : "trades"})
          </span>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Avg Win: <strong className="text-emerald-400">+${avgWin.toFixed(2)}</strong>
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Avg Loss: <strong className="text-rose-400">-${avgLoss.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </div>

      {chartData.length > 0 ? (
        <div className="w-full h-[180px] pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 2"
                stroke="#171e2c"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#1f293d" }}
                fontFamily="JetBrains Mono, monospace"
              />
              <YAxis
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: "#1f293d" }}
                tickFormatter={(val) => `$${val}`}
                fontFamily="JetBrains Mono, monospace"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
              />
              <ReferenceLine
                y={0}
                stroke="#475569"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <Bar dataKey="profit" maxBarSize={32} radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.profit >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[140px] flex flex-col items-center justify-center text-xs text-slate-500 italic space-y-1">
          <span>No trade data available yet.</span>
          <span className="text-[11px] text-slate-600 not-italic">
            Run simulation or instant backtest to populate the profit/loss distribution.
          </span>
        </div>
      )}
    </div>
  );
};
