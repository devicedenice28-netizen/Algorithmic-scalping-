import React, { useState, useMemo } from "react";
import {
  Grid,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Info,
  Layers,
  ArrowUpDown,
  Zap,
} from "lucide-react";

interface CorrelationMatrixProps {
  currentSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

type Timeframe = "1H" | "4H" | "1D" | "1W";

interface PairCorrelation {
  pairA: string;
  pairB: string;
  value: number;
  timeframe: Timeframe;
  influence: string;
  recommendation: string;
  riskLevel: "HIGH_EXPOSURE" | "MODERATE_CO-MOVEMENT" | "NEUTRAL" | "INVERSE_HEDGE";
}

const MATRIX_SYMBOLS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "USD/CAD",
  "USD/CHF",
  "EUR/JPY",
  "XAU/USD",
];

// Baseline realistic Forex correlation tables by timeframe
const CORRELATION_DATA: Record<Timeframe, Record<string, Record<string, number>>> = {
  "1H": {
    "EUR/USD": { "EUR/USD": 1.00, "GBP/USD": 0.82, "USD/JPY": -0.44, "AUD/USD": 0.74, "USD/CAD": -0.68, "USD/CHF": -0.91, "EUR/JPY": 0.62, "XAU/USD": 0.68 },
    "GBP/USD": { "EUR/USD": 0.82, "GBP/USD": 1.00, "USD/JPY": -0.38, "AUD/USD": 0.69, "USD/CAD": -0.61, "USD/CHF": -0.79, "EUR/JPY": 0.48, "XAU/USD": 0.58 },
    "USD/JPY": { "EUR/USD": -0.44, "GBP/USD": -0.38, "USD/JPY": 1.00, "AUD/USD": -0.22, "USD/CAD": 0.56, "USD/CHF": 0.64, "EUR/JPY": 0.41, "XAU/USD": -0.52 },
    "AUD/USD": { "EUR/USD": 0.74, "GBP/USD": 0.69, "USD/JPY": -0.22, "AUD/USD": 1.00, "USD/CAD": -0.76, "USD/CHF": -0.72, "EUR/JPY": 0.55, "XAU/USD": 0.76 },
    "USD/CAD": { "EUR/USD": -0.68, "GBP/USD": -0.61, "USD/JPY": 0.56, "AUD/USD": -0.76, "USD/CAD": 1.00, "USD/CHF": 0.71, "EUR/JPY": -0.32, "XAU/USD": -0.64 },
    "USD/CHF": { "EUR/USD": -0.91, "GBP/USD": -0.79, "USD/JPY": 0.64, "AUD/USD": -0.72, "USD/CAD": 0.71, "USD/CHF": 1.00, "EUR/JPY": -0.42, "XAU/USD": -0.71 },
    "EUR/JPY": { "EUR/USD": 0.62, "GBP/USD": 0.48, "USD/JPY": 0.41, "AUD/USD": 0.55, "USD/CAD": -0.32, "USD/CHF": -0.42, "EUR/JPY": 1.00, "XAU/USD": 0.28 },
    "XAU/USD": { "EUR/USD": 0.68, "GBP/USD": 0.58, "USD/JPY": -0.52, "AUD/USD": 0.76, "USD/CAD": -0.64, "USD/CHF": -0.71, "EUR/JPY": 0.28, "XAU/USD": 1.00 },
  },
  "4H": {
    "EUR/USD": { "EUR/USD": 1.00, "GBP/USD": 0.86, "USD/JPY": -0.48, "AUD/USD": 0.78, "USD/CAD": -0.72, "USD/CHF": -0.94, "EUR/JPY": 0.58, "XAU/USD": 0.72 },
    "GBP/USD": { "EUR/USD": 0.86, "GBP/USD": 1.00, "USD/JPY": -0.41, "AUD/USD": 0.73, "USD/CAD": -0.66, "USD/CHF": -0.83, "EUR/JPY": 0.52, "XAU/USD": 0.63 },
    "USD/JPY": { "EUR/USD": -0.48, "GBP/USD": -0.41, "USD/JPY": 1.00, "AUD/USD": -0.28, "USD/CAD": 0.61, "USD/CHF": 0.68, "EUR/JPY": 0.38, "XAU/USD": -0.56 },
    "AUD/USD": { "EUR/USD": 0.78, "GBP/USD": 0.73, "USD/JPY": -0.28, "AUD/USD": 1.00, "USD/CAD": -0.81, "USD/CHF": -0.76, "EUR/JPY": 0.59, "XAU/USD": 0.81 },
    "USD/CAD": { "EUR/USD": -0.72, "GBP/USD": -0.66, "USD/JPY": 0.61, "AUD/USD": -0.81, "USD/CAD": 1.00, "USD/CHF": 0.76, "EUR/JPY": -0.28, "XAU/USD": -0.69 },
    "USD/CHF": { "EUR/USD": -0.94, "GBP/USD": -0.83, "USD/JPY": 0.68, "AUD/USD": -0.76, "USD/CAD": 0.76, "USD/CHF": 1.00, "EUR/JPY": -0.46, "XAU/USD": -0.76 },
    "EUR/JPY": { "EUR/USD": 0.58, "GBP/USD": 0.52, "USD/JPY": 0.38, "AUD/USD": 0.59, "USD/CAD": -0.28, "USD/CHF": -0.46, "EUR/JPY": 1.00, "XAU/USD": 0.32 },
    "XAU/USD": { "EUR/USD": 0.72, "GBP/USD": 0.63, "USD/JPY": -0.56, "AUD/USD": 0.81, "USD/CAD": -0.69, "USD/CHF": -0.76, "EUR/JPY": 0.32, "XAU/USD": 1.00 },
  },
  "1D": {
    "EUR/USD": { "EUR/USD": 1.00, "GBP/USD": 0.89, "USD/JPY": -0.52, "AUD/USD": 0.81, "USD/CAD": -0.75, "USD/CHF": -0.96, "EUR/JPY": 0.54, "XAU/USD": 0.75 },
    "GBP/USD": { "EUR/USD": 0.89, "GBP/USD": 1.00, "USD/JPY": -0.45, "AUD/USD": 0.76, "USD/CAD": -0.69, "USD/CHF": -0.87, "EUR/JPY": 0.55, "XAU/USD": 0.66 },
    "USD/JPY": { "EUR/USD": -0.52, "GBP/USD": -0.45, "USD/JPY": 1.00, "AUD/USD": -0.32, "USD/CAD": 0.64, "USD/CHF": 0.72, "EUR/JPY": 0.34, "XAU/USD": -0.61 },
    "AUD/USD": { "EUR/USD": 0.81, "GBP/USD": 0.76, "USD/JPY": -0.32, "AUD/USD": 1.00, "USD/CAD": -0.84, "USD/CHF": -0.79, "EUR/JPY": 0.61, "XAU/USD": 0.84 },
    "USD/CAD": { "EUR/USD": -0.75, "GBP/USD": -0.69, "USD/JPY": 0.64, "AUD/USD": -0.84, "USD/CAD": 1.00, "USD/CHF": 0.79, "EUR/JPY": -0.25, "XAU/USD": -0.73 },
    "USD/CHF": { "EUR/USD": -0.96, "GBP/USD": -0.87, "USD/JPY": 0.72, "AUD/USD": -0.79, "USD/CAD": 0.79, "USD/CHF": 1.00, "EUR/JPY": -0.49, "XAU/USD": -0.80 },
    "EUR/JPY": { "EUR/USD": 0.54, "GBP/USD": 0.55, "USD/JPY": 0.34, "AUD/USD": 0.61, "USD/CAD": -0.25, "USD/CHF": -0.49, "EUR/JPY": 1.00, "XAU/USD": 0.36 },
    "XAU/USD": { "EUR/USD": 0.75, "GBP/USD": 0.66, "USD/JPY": -0.61, "AUD/USD": 0.84, "USD/CAD": -0.73, "USD/CHF": -0.80, "EUR/JPY": 0.36, "XAU/USD": 1.00 },
  },
  "1W": {
    "EUR/USD": { "EUR/USD": 1.00, "GBP/USD": 0.91, "USD/JPY": -0.55, "AUD/USD": 0.84, "USD/CAD": -0.78, "USD/CHF": -0.97, "EUR/JPY": 0.50, "XAU/USD": 0.78 },
    "GBP/USD": { "EUR/USD": 0.91, "GBP/USD": 1.00, "USD/JPY": -0.48, "AUD/USD": 0.79, "USD/CAD": -0.72, "USD/CHF": -0.89, "EUR/JPY": 0.57, "XAU/USD": 0.69 },
    "USD/JPY": { "EUR/USD": -0.55, "GBP/USD": -0.48, "USD/JPY": 1.00, "AUD/USD": -0.36, "USD/CAD": 0.68, "USD/CHF": 0.75, "EUR/JPY": 0.31, "XAU/USD": -0.65 },
    "AUD/USD": { "EUR/USD": 0.84, "GBP/USD": 0.79, "USD/JPY": -0.36, "AUD/USD": 1.00, "USD/CAD": -0.87, "USD/CHF": -0.82, "EUR/JPY": 0.64, "XAU/USD": 0.87 },
    "USD/CAD": { "EUR/USD": -0.78, "GBP/USD": -0.72, "USD/JPY": 0.68, "AUD/USD": -0.87, "USD/CAD": 1.00, "USD/CHF": 0.82, "EUR/JPY": -0.22, "XAU/USD": -0.76 },
    "USD/CHF": { "EUR/USD": -0.97, "GBP/USD": -0.89, "USD/JPY": 0.75, "AUD/USD": -0.82, "USD/CAD": 0.82, "USD/CHF": 1.00, "EUR/JPY": -0.52, "XAU/USD": -0.83 },
    "EUR/JPY": { "EUR/USD": 0.50, "GBP/USD": 0.57, "USD/JPY": 0.31, "AUD/USD": 0.64, "USD/CAD": -0.22, "USD/CHF": -0.52, "EUR/JPY": 1.00, "XAU/USD": 0.39 },
    "XAU/USD": { "EUR/USD": 0.78, "GBP/USD": 0.69, "USD/JPY": -0.65, "AUD/USD": 0.87, "USD/CAD": -0.76, "USD/CHF": -0.83, "EUR/JPY": 0.39, "XAU/USD": 1.00 },
  },
};

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  currentSymbol = "EUR/USD",
  onSelectSymbol,
}) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("4H");
  const [selectedPairA, setSelectedPairA] = useState<string>(currentSymbol);
  const [selectedPairB, setSelectedPairB] = useState<string>("GBP/USD");

  const matrix = CORRELATION_DATA[timeframe];

  // Helper to get color style based on Pearson correlation value
  const getCellBg = (val: number) => {
    if (val === 1.0) return "bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-500/40";
    if (val >= 0.75) return "bg-emerald-900/60 text-emerald-400 font-semibold";
    if (val >= 0.40) return "bg-teal-950/50 text-teal-300";
    if (val > -0.40 && val < 0.40) return "bg-slate-900 text-slate-400";
    if (val <= -0.75) return "bg-rose-950/70 text-rose-300 font-bold border border-rose-500/40";
    if (val <= -0.40) return "bg-rose-900/50 text-rose-400 font-semibold";
    return "bg-slate-900 text-slate-400";
  };

  // Compute selected cell analysis
  const activePairAnalysis = useMemo(() => {
    const val = matrix[selectedPairA]?.[selectedPairB] ?? 0;
    let riskLevel: PairCorrelation["riskLevel"] = "NEUTRAL";
    let influence = "";
    let recommendation = "";

    if (selectedPairA === selectedPairB) {
      riskLevel = "HIGH_EXPOSURE";
      influence = "Self-correlation (1.00). Base reference pair.";
      recommendation = "Standard position risk sizing apply as per bot risk parameters.";
    } else if (val >= 0.75) {
      riskLevel = "HIGH_EXPOSURE";
      influence = `Strong positive co-movement (r = +${val.toFixed(2)}). Both pairs move in tandem.`;
      recommendation = `Alert: Holding concurrent BUY or SELL trades across ${selectedPairA} and ${selectedPairB} compounds directional exposure to the counter currency (e.g. USD). Reduce lot size by 50% on secondary position to prevent simultaneous drawdown.`;
    } else if (val <= -0.75) {
      riskLevel = "INVERSE_HEDGE";
      influence = `Strong inverse correlation (r = ${val.toFixed(2)}). Pairs move in opposite directions.`;
      recommendation = `Natural Hedging Opportunity: Opening simultaneous BUY on both pairs creates a delta-neutral hedge, dampening sharp market swings while capitalizing on volatility breakouts.`;
    } else if (val >= 0.40) {
      riskLevel = "MODERATE_CO-MOVEMENT";
      influence = `Moderate positive correlation (r = +${val.toFixed(2)}). Partial trend alignment.`;
      recommendation = `Safe for multi-pair auto-trading with standard risk filters. Maintain trailing stops on both positions.`;
    } else {
      riskLevel = "NEUTRAL";
      influence = `Weak/Uncorrelated (r = ${val.toFixed(2)}). Moves independently.`;
      recommendation = `Optimal portfolio diversification. Low systemic correlation enhances risk-adjusted returns (Sharpe Ratio).`;
    }

    return {
      pairA: selectedPairA,
      pairB: selectedPairB,
      value: val,
      timeframe,
      influence,
      recommendation,
      riskLevel,
    };
  }, [selectedPairA, selectedPairB, matrix, timeframe]);

  // Overall Portfolio Diversification Index (0-100%)
  const diversificationScore = useMemo(() => {
    let sumAbs = 0;
    let count = 0;
    const base = selectedPairA;
    MATRIX_SYMBOLS.forEach((sym) => {
      if (sym !== base) {
        sumAbs += Math.abs(matrix[base]?.[sym] || 0);
        count++;
      }
    });
    const avgCorrelation = count > 0 ? sumAbs / count : 0.5;
    // Lower average correlation = higher diversification score
    return Math.round((1 - avgCorrelation * 0.7) * 100);
  }, [selectedPairA, matrix]);

  return (
    <div className="p-3 rounded-lg bg-[#0a0d13] border border-slate-800 space-y-3">
      {/* Header & Timeframe selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-sky-950/60 border border-sky-500/30 text-sky-400">
            <Grid className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <span>Currency Correlation Matrix</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                Strategy Influence
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              Inter-pair dependency & portfolio drawdown contagion engine
            </div>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[#090c12] p-0.5 rounded border border-slate-800">
          {(["1H", "4H", "1D", "1W"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                timeframe === tf
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto rounded border border-slate-800/80 bg-[#070a0f]">
        <table className="w-full text-center text-[10px] font-mono border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#0d121c]">
              <th className="p-1.5 text-left text-slate-400 font-sans font-semibold sticky left-0 bg-[#0d121c] z-10">
                Pair
              </th>
              {MATRIX_SYMBOLS.map((sym) => (
                <th
                  key={sym}
                  className={`p-1.5 font-medium whitespace-nowrap ${
                    sym === currentSymbol ? "text-amber-400 font-bold" : "text-slate-300"
                  }`}
                >
                  {sym.replace("/USD", "").replace("USD/", "$")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_SYMBOLS.map((rowSym) => (
              <tr key={rowSym} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="p-1 text-left font-semibold text-slate-300 sticky left-0 bg-[#070a0f] border-r border-slate-800/80 whitespace-nowrap">
                  <span
                    onClick={() => {
                      setSelectedPairA(rowSym);
                      if (onSelectSymbol) onSelectSymbol(rowSym);
                    }}
                    className={`cursor-pointer hover:text-sky-400 ${
                      rowSym === currentSymbol ? "text-amber-400" : ""
                    }`}
                  >
                    {rowSym}
                  </span>
                </td>
                {MATRIX_SYMBOLS.map((colSym) => {
                  const val = matrix[rowSym]?.[colSym] ?? 0;
                  const isSelected =
                    (selectedPairA === rowSym && selectedPairB === colSym) ||
                    (selectedPairA === colSym && selectedPairB === rowSym);
                  const isCurrent = rowSym === currentSymbol || colSym === currentSymbol;

                  return (
                    <td
                      key={colSym}
                      onClick={() => {
                        setSelectedPairA(rowSym);
                        setSelectedPairB(colSym);
                      }}
                      className={`p-1 cursor-pointer transition-all ${getCellBg(val)} ${
                        isSelected ? "ring-2 ring-sky-400 ring-inset scale-95" : ""
                      }`}
                      title={`${rowSym} vs ${colSym}: ${val >= 0 ? "+" : ""}${val.toFixed(2)}`}
                    >
                      {val === 1.0 ? "1.00" : (val >= 0 ? "+" : "") + val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Pair Strategy Influence Breakdown */}
      <div className="p-2.5 rounded bg-[#090c13] border border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-200">
              {activePairAnalysis.pairA} ↔ {activePairAnalysis.pairB}
            </span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.2 rounded font-bold ${
                activePairAnalysis.value >= 0.75
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                  : activePairAnalysis.value <= -0.75
                  ? "bg-rose-950 text-rose-400 border border-rose-500/40"
                  : "bg-slate-900 text-slate-300"
              }`}
            >
              r = {activePairAnalysis.value >= 0 ? "+" : ""}
              {activePairAnalysis.value.toFixed(2)} ({timeframe})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
            <span>Portfolio Diversification:</span>
            <span className="font-mono font-bold text-sky-400">{diversificationScore}%</span>
          </div>
        </div>

        {/* Strategy Impact Text */}
        <div className="space-y-1 text-xs">
          <div className="flex items-start gap-1.5 text-slate-300 text-[11px]">
            {activePairAnalysis.riskLevel === "HIGH_EXPOSURE" ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            ) : activePairAnalysis.riskLevel === "INVERSE_HEDGE" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-semibold text-slate-200">Bot Strategy Influence: </span>
              <span className="text-slate-300 leading-relaxed">
                {activePairAnalysis.influence}
              </span>
            </div>
          </div>

          <div className="p-2 rounded bg-[#0e131d] border border-slate-800/70 text-[11px] text-slate-400 leading-relaxed font-sans">
            <strong className="text-amber-300 font-medium">Algorithmic Risk Advisory: </strong>
            {activePairAnalysis.recommendation}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/70 text-[10px] font-sans text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-900/80 border border-emerald-500/50 inline-block" />
            <span>High Positive (+0.75 to +1.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-700 inline-block" />
            <span>Uncorrelated (-0.4 to +0.4)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-950/80 border border-rose-500/50 inline-block" />
            <span>Inverse Hedge (-0.75 to -1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
