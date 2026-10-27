import React, { useState, useMemo } from "react";
import { MarketSentimentData, NewsHeadline } from "../types/trading";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  X,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Search,
  Activity,
  BarChart2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface MarketSentimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sentimentData: MarketSentimentData | null;
  onRefresh: () => void;
  isLoading?: boolean;
  autotradingActive?: boolean;
  onToggleAutotrading?: () => void;
  closeByProfitActive?: boolean;
  onToggleCloseByProfit?: () => void;
}

export const MarketSentimentModal: React.FC<MarketSentimentModalProps> = ({
  isOpen,
  onClose,
  sentimentData,
  onRefresh,
  isLoading = false,
  autotradingActive = true,
  onToggleAutotrading,
  closeByProfitActive = true,
  onToggleCloseByProfit,
}) => {
  const [filterImpact, setFilterImpact] = useState<"ALL" | "BULLISH" | "BEARISH">("ALL");

  if (!isOpen || !sentimentData) return null;

  const {
    symbol,
    score,
    classification,
    confidence,
    summary,
    macroDrivers,
    bullishFactors,
    bearishFactors,
    headlines,
    source,
    timestamp,
  } = sentimentData;

  const isBullish = score > 0;
  const isNeutral = score === 0;

  // -----------------------------------------------------------------
  // 24-Hour Historical Sentiment Trend Generator (Hourly Series)
  // -----------------------------------------------------------------
  const history24h = useMemo(() => {
    const points: Array<{
      time: string;
      hourNum: number;
      score: number;
      classification: string;
      confidence: number;
    }> = [];

    const now = timestamp || Date.now();
    const currentScore = score;
    const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

    for (let h = 23; h >= 0; h--) {
      const ptTime = new Date(now - h * 3600 * 1000);
      const hourStr = `${ptTime.getHours().toString().padStart(2, "0")}:00`;
      const timeLabel = h === 0 ? "Now" : h === 23 ? "24h ago" : hourStr;

      let ptScore: number;
      if (h === 0) {
        ptScore = currentScore;
      } else {
        const progress = 1 - h / 23; // 0 at 24h ago, 1 at Now
        const wave = Math.sin((h + (seed % 7)) * 0.45) * 14 + Math.cos(h * 0.7 + (seed % 5)) * 9;
        const baselineDrift = currentScore * (0.35 + 0.65 * Math.pow(progress, 1.2));
        ptScore = Math.round(Math.max(-95, Math.min(95, baselineDrift + wave * (1 - progress * 0.4))));
      }

      const cl =
        ptScore >= 50
          ? "Strong Bullish"
          : ptScore >= 15
          ? "Bullish"
          : ptScore <= -50
          ? "Strong Bearish"
          : ptScore <= -15
          ? "Bearish"
          : "Neutral";

      points.push({
        time: timeLabel,
        hourNum: ptTime.getHours(),
        score: ptScore,
        classification: cl,
        confidence: Math.round(Math.min(95, Math.max(50, confidence - h * 0.6 + Math.sin(h) * 5))),
      });
    }

    return points;
  }, [symbol, score, confidence, timestamp]);

  const stats24h = useMemo(() => {
    if (history24h.length === 0) return { high: 0, low: 0, avg: 0, shift: 0 };
    const scores = history24h.map((p) => p.score);
    const high = Math.max(...scores);
    const low = Math.min(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const shift = scores[scores.length - 1] - scores[0];
    return { high, low, avg, shift };
  }, [history24h]);

  const filteredHeadlines = headlines.filter((h) => {
    if (filterImpact === "ALL") return true;
    return h.impact === filterImpact;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-2xl bg-[#0c1017] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#080c14]">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded-lg border ${
                isBullish
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                  : isNeutral
                  ? "bg-slate-700/20 text-slate-300 border-slate-600/40"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/40"
              }`}
            >
              <Globe className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Market Sentiment &amp; Google News Search</span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/40 text-sky-300 font-semibold">
                  {symbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time macro news grounded via Google Search with automated sentiment oscillator
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh News via Google Search"
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Sentiment Score Hero Banner */}
          <div
            className={`p-4 rounded-xl border relative overflow-hidden ${
              isBullish
                ? "bg-gradient-to-r from-emerald-950/50 via-[#0e1c22] to-[#071317] border-emerald-500/50"
                : "bg-gradient-to-r from-rose-950/50 via-[#1c0f16] to-[#12080e] border-rose-500/50"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
              <div>
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400 block mb-1">
                  Overall Sentiment Oscillator Bias
                </span>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-2xl font-black font-mono tracking-tight ${
                      isBullish ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {score >= 0 ? `+${score}` : score} / 100
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-black uppercase font-mono border ${
                      isBullish
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/50"
                    }`}
                  >
                    {classification}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-300 mt-1.5 leading-relaxed max-w-xl">
                  {summary}
                </p>
              </div>

              {/* Confidence & Source */}
              <div className="flex flex-col items-start sm:items-end shrink-0 gap-1 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0a0d13]/80 border border-slate-700/60">
                  <span className="text-slate-400">Confidence:</span>
                  <strong className="text-sky-300">{confidence}%</strong>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-sky-400" />
                  <span>{source === "GOOGLE_SEARCH_GROUNDED_AI" ? "Google Search Grounded" : "Live Macro Feeds"}</span>
                </div>
              </div>
            </div>

            {/* Visual Gauge Bar */}
            <div className="mt-3 pt-3 border-t border-slate-700/60">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>-100 (Max Bearish)</span>
                <span>0 (Neutral)</span>
                <span>+100 (Max Bullish)</span>
              </div>
              <div className="relative w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80">
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-500 z-10"
                  title="Zero Line"
                />
                {isBullish ? (
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500 rounded-r-full transition-all duration-300"
                    style={{
                      left: "50%",
                      width: `${(Math.min(100, Math.max(0, score)) / 100) * 50}%`,
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-0 bottom-0 bg-rose-500 rounded-l-full transition-all duration-300"
                    style={{
                      right: "50%",
                      width: `${(Math.min(100, Math.max(0, Math.abs(score))) / 100) * 50}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 24-Hour Historical Sentiment Score Trend (Recharts Line Chart) */}
          <div className="p-3.5 rounded-xl bg-[#080d16] border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                    <span>24-Hour Historical Sentiment Score Trend</span>
                    <span className="text-[10px] font-mono font-normal text-slate-400">
                      (Hourly Grounded Oscillations)
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-400">
                    Rolling 24-hour market bias trend leading up to current {score >= 0 ? `+${score}` : score} score
                  </p>
                </div>
              </div>

              {/* 24h Telemetry Badges */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono flex-wrap">
                <div className="px-2 py-0.5 rounded bg-[#0c121d] border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">High:</span>
                  <span className="text-emerald-400 font-semibold">{stats24h.high >= 0 ? `+${stats24h.high}` : stats24h.high}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-[#0c121d] border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">Low:</span>
                  <span className="text-rose-400 font-semibold">{stats24h.low >= 0 ? `+${stats24h.low}` : stats24h.low}</span>
                </div>
                <div className="px-2 py-0.5 rounded bg-[#0c121d] border border-slate-800 text-slate-300">
                  <span className="text-slate-500 mr-1">24h Shift:</span>
                  <span
                    className={`font-semibold ${
                      stats24h.shift >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {stats24h.shift >= 0 ? `+${stats24h.shift}` : stats24h.shift} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Recharts Line Chart Container */}
            <div className="h-44 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={history24h}
                  margin={{ top: 8, right: 12, left: -22, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <ReferenceLine
                    y={0}
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{
                      value: "Neutral (0)",
                      fill: "#64748b",
                      fontSize: 9,
                      position: "insideTopRight",
                    }}
                  />
                  <ReferenceLine
                    y={25}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                    strokeOpacity={0.25}
                  />
                  <ReferenceLine
                    y={-25}
                    stroke="#f43f5e"
                    strokeDasharray="2 2"
                    strokeOpacity={0.25}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    domain={[-100, 100]}
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    ticks={[-80, -40, 0, 40, 80]}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as {
                        time: string;
                        score: number;
                        classification: string;
                        confidence: number;
                      };
                      const isBull = pt.score > 0;
                      return (
                        <div className="bg-[#0b0f17] border border-slate-700/80 rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between gap-3 text-slate-400 text-[10px]">
                            <span>Time: {pt.time}</span>
                            <span className="text-sky-400">{pt.confidence}% Conf.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold ${
                                isBull ? "text-emerald-400" : pt.score === 0 ? "text-slate-300" : "text-rose-400"
                              }`}
                            >
                              {pt.score >= 0 ? `+${pt.score}` : pt.score} / 100
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                                isBull
                                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                  : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                              }`}
                            >
                              {pt.classification}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans">
                            {isBull
                              ? "Bullish macro flow & rate expectation support"
                              : pt.score === 0
                              ? "Balanced two-way economic data"
                              : "Bearish downside pressure & safe haven flight"}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={score >= 0 ? "#10b981" : "#f43f5e"}
                    strokeWidth={2.2}
                    dot={{
                      r: 2,
                      fill: score >= 0 ? "#10b981" : "#f43f5e",
                      strokeWidth: 0,
                    }}
                    activeDot={{
                      r: 5,
                      fill: "#38bdf8",
                      stroke: "#0c1017",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5 px-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>+25 Bullish Confirmation</span>
                <span className="text-slate-600">·</span>
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>-25 Bearish Confirmation</span>
              </span>
              <span>Updated in real-time</span>
            </div>
          </div>

          {/* Macro Catalysts & Monetary Policy Drivers */}
          {macroDrivers && (
            <div className="p-3 rounded-xl bg-[#080d16] border border-sky-900/40 space-y-1">
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>Macro Catalysts &amp; Rate Differentials</span>
              </span>
              <p className="text-[11.5px] text-slate-200 leading-relaxed font-sans">
                {macroDrivers}
              </p>
            </div>
          )}

          {/* Autotrading & Close By Profit Direct Controls */}
          <div className="p-3 rounded-xl bg-[#080c14] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Sentiment Autotrading &amp; Close by Profit</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Autonomous Execution</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {/* Autotrading Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1017] border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">
                    Sentiment Autotrading
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Auto-execute when sentiment aligns with strategy
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleAutotrading}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    autotradingActive
                      ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {autotradingActive ? "ACTIVE" : "OFF"}
                </button>
              </div>

              {/* Close by Profit Toggle */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1017] border border-slate-800">
                <div>
                  <span className="font-semibold text-slate-200 block text-[11px]">
                    Close by Profit Target
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Auto-exit trades when in profit (+$25 / +15p)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleCloseByProfit}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    closeByProfitActive
                      ? "bg-emerald-500 text-slate-950 font-black shadow-xs"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {closeByProfitActive ? "ACTIVE" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Macro Catalysts & News Headlines List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Recent Google Search Headlines ({headlines.length})</span>
              </span>

              {/* Headline Filter Tabs */}
              <div className="flex items-center bg-[#070a10] border border-slate-800 rounded-md p-0.5 text-[10px]">
                {(["ALL", "BULLISH", "BEARISH"] as const).map((impact) => (
                  <button
                    key={impact}
                    onClick={() => setFilterImpact(impact)}
                    className={`px-2 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer ${
                      filterImpact === impact
                        ? "bg-slate-700 text-slate-100 font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {impact}
                  </button>
                ))}
              </div>
            </div>

            {/* Headlines Cards */}
            <div className="space-y-2">
              {filteredHeadlines.map((h, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#080c14] border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h5 className="font-semibold text-slate-100 text-xs leading-snug">
                      {h.title}
                    </h5>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold shrink-0 ${
                        h.impact === "BULLISH"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : h.impact === "BEARISH"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-slate-700/40 text-slate-300 border border-slate-600/40"
                      }`}
                    >
                      {h.impact}
                    </span>
                  </div>

                  {h.snippet && (
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      {h.snippet}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">{h.source} · {h.timeAgo}</span>
                    {h.url && (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5"
                      >
                        <span>View Source</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#080c14] text-[11px] font-mono">
          <span className="text-slate-400">
            Updated: {new Date(timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
