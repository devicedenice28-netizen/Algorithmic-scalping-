import React, { useState, useEffect } from "react";
import { Position, Trade, BotLog, BotReport, ForexPairInfo } from "../types/trading";
import { MT5ConnectionState } from "../types/broker";
import {
  Activity,
  History,
  FileCode,
  Terminal,
  XCircle,
  Copy,
  Check,
  Download,
  Radio,
  Server,
  Wifi,
  WifiOff,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { mt5BridgeClient, Level2OrderBook } from "../lib/mt5BridgeClient";
import { FOREX_PAIRS } from "../lib/marketData";

interface TerminalPanelProps {
  position: Position | null;
  history: Trade[];
  logs: BotLog[];
  report: BotReport;
  pipDecimals?: number;
  selectedPair?: ForexPairInfo;
  currentPrice?: number;
  onSelectPair?: (pair: ForexPairInfo) => void;
  onClosePosition: () => void;
  onResetRiskPause?: () => void;
  connectionState?: MT5ConnectionState;
  onOpenBrokerModal?: () => void;
  onUpdateTradeNote?: (ticket: number, notes: string) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  position,
  history,
  logs,
  report,
  pipDecimals = 5,
  selectedPair,
  currentPrice,
  onSelectPair,
  onClosePosition,
  onResetRiskPause,
  connectionState,
  onOpenBrokerModal,
  onUpdateTradeNote,
}) => {
  const [activeTab, setActiveTab] = useState<"trade" | "orderbook" | "history" | "journal" | "code" | "broker">("trade");
  const [copiedCode, setCopiedCode] = useState(false);
  const [orderBook, setOrderBook] = useState<Level2OrderBook | null>(null);
  const [lastBookUpdate, setLastBookUpdate] = useState<string>("");

  // Qualitative Execution Notes & Annotations for Trades (saved in localStorage)
  const [tradeNotes, setTradeNotes] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem("ea_algopro_trade_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSaveNote = (ticket: number, note: string) => {
    const updated = { ...tradeNotes, [ticket]: note };
    setTradeNotes(updated);
    try {
      localStorage.setItem("ea_algopro_trade_notes", JSON.stringify(updated));
    } catch {
      // Ignore storage errors in sandbox
    }
    if (onUpdateTradeNote) {
      onUpdateTradeNote(ticket, note);
    }
  };

  const activeSymbol = selectedPair?.symbol || "EUR/USD";

  // Floating Unrealized Profit & Equity calculation
  const floatingPnL = position ? position.unrealizedProfit : 0;
  const equity = report.currentBalance + floatingPnL;
  const marginUsed = position ? position.riskAmount : 0;
  const freeMargin = equity - marginUsed;

  // Subscribe to real-time Level 2 order book updates from MT5 WebSocket Bridge
  useEffect(() => {
    // Request initial book for active symbol
    mt5BridgeClient.subscribeOrderBook(activeSymbol, currentPrice);

    const unsubscribe = mt5BridgeClient.subscribe((msg) => {
      if (msg.type === "ORDERBOOK_L2" && msg.data) {
        const book = msg.data as Level2OrderBook;
        if (book.symbol === activeSymbol) {
          setOrderBook(book);
          setLastBookUpdate(new Date().toLocaleTimeString());
        }
      }
    });

    return () => unsubscribe();
  }, [activeSymbol, currentPrice]);

  const downloadComprehensiveCSV = () => {
    const lines: string[] = [];

    // 1. PERFORMANCE REPORT & SUMMARY
    lines.push("# ========================================================");
    lines.push("# QUANTITATIVE FOREX BOT PERFORMANCE REPORT & TRADE LOGS");
    lines.push(`# Generated At: ${new Date().toISOString()}`);
    lines.push(`# Active Symbol: ${activeSymbol}`);
    lines.push(`# Execution Mode: ${report.mode}`);
    lines.push("# ========================================================");
    lines.push("");
    lines.push("METRIC,VALUE");
    lines.push(`Initial Balance,$${report.initialBalance.toFixed(2)}`);
    lines.push(`Current Balance,$${report.currentBalance.toFixed(2)}`);
    lines.push(`Peak Balance,$${report.peakBalance.toFixed(2)}`);
    lines.push(`Net Profit,$${report.netProfit.toFixed(2)}`);
    lines.push(`Return ROI,${report.returnPercent}%`);
    lines.push(`Total Trades,${report.totalTrades}`);
    lines.push(`Winning Trades,${report.winningTrades}`);
    lines.push(`Losing Trades,${report.losingTrades}`);
    lines.push(`Win Rate,${report.winRate}%`);
    lines.push(`Profit Factor,${report.profitFactor}`);
    lines.push(`Gross Profit,$${report.grossProfit.toFixed(2)}`);
    lines.push(`Gross Loss,$${report.grossLoss.toFixed(2)}`);
    lines.push(`Max Recorded Drawdown,${report.maxRecordedDrawdown}%`);
    lines.push(`Current Drawdown,${report.currentDrawdown}%`);
    lines.push(`Risk Circuit Paused,${report.paused ? "YES" : "NO"}`);
    lines.push("");

    // 2. EXECUTED TRADE HISTORY
    lines.push("# ========================================================");
    lines.push("# EXECUTED TRADE HISTORY");
    lines.push("# ========================================================");
    const tradeHeaders = [
      "Ticket",
      "Symbol",
      "Type",
      "Units",
      "Entry Time",
      "Entry Price",
      "Exit Time",
      "Exit Price",
      "Stop Loss",
      "Take Profit",
      "Pips",
      "Profit ($)",
      "Balance ($)",
      "Exit Reason",
      "Execution Notes & Annotations",
    ];
    lines.push(tradeHeaders.join(","));

    if (history.length === 0) {
      lines.push("# No closed trades recorded yet");
    } else {
      history.forEach((t) => {
        const note = tradeNotes[t.ticket] ?? t.notes ?? "";
        const cleanNote = `"${note.replace(/"/g, '""')}"`;
        lines.push(
          [
            t.ticket,
            t.symbol,
            t.type,
            t.units,
            `"${t.entryTime}"`,
            t.entry.toFixed(pipDecimals),
            `"${t.exitTime}"`,
            t.exit.toFixed(pipDecimals),
            t.stopLoss.toFixed(pipDecimals),
            t.takeProfit ? t.takeProfit.toFixed(pipDecimals) : "None",
            t.pips,
            t.profit.toFixed(2),
            t.balance.toFixed(2),
            `"${t.exitReason}"`,
            cleanNote,
          ].join(",")
        );
      });
    }
    lines.push("");

    // 3. BOT ACTIVITY & JOURNAL LOGS
    lines.push("# ========================================================");
    lines.push("# BOT ACTIVITY & JOURNAL LOGS");
    lines.push("# ========================================================");
    const logHeaders = ["Time", "Candle Index", "Type", "Log Message"];
    lines.push(logHeaders.join(","));

    if (logs.length === 0) {
      lines.push("# No logs recorded yet");
    } else {
      logs.forEach((l) => {
        const cleanMsg = `"${l.message.replace(/"/g, '""')}"`;
        lines.push([`"${l.time}"`, l.candleIndex, l.type, cleanMsg].join(","));
      });
    }

    const csvContent = lines.join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanSym = activeSymbol.replace(/[^a-zA-Z0-9]/g, "");
    link.setAttribute("href", url);
    link.setAttribute("download", `forex_bot_history_and_report_${cleanSym}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyCodeToClipboard = () => {
    const codeString = `// MT5 Forex Trading Bot - EMA Crossover + RSI Simulator
// Fast EMA: 9, Slow EMA: 21, RSI: 14
// Strategy logic available in src/lib/forexBot.ts`;
    navigator.clipboard.writeText(codeString);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Order Book calculations
  const maxBidVol = orderBook ? Math.max(...orderBook.bids.map((b) => b.totalVolume), 1) : 100;
  const maxAskVol = orderBook ? Math.max(...orderBook.asks.map((a) => a.totalVolume), 1) : 100;
  const totalBidLiquidity = orderBook ? orderBook.bids.reduce((acc, b) => acc + b.volume, 0) : 0;
  const totalAskLiquidity = orderBook ? orderBook.asks.reduce((acc, a) => acc + a.volume, 0) : 0;
  const liquidityImbalance =
    totalBidLiquidity + totalAskLiquidity > 0
      ? ((totalBidLiquidity - totalAskLiquidity) / (totalBidLiquidity + totalAskLiquidity)) * 100
      : 0;

  return (
    <div className="flex flex-col bg-[#0e121a] border border-slate-800/80 rounded-lg overflow-hidden">
      {/* Terminal Tabs & Header */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a0d13] px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("trade")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "trade"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Trade</span>
            {position && (
              <span className="ml-1 text-[10px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 rounded">
                1
              </span>
            )}
          </button>

          {/* Level 2 Order Book Tab */}
          <button
            onClick={() => setActiveTab("orderbook")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "orderbook"
                ? "bg-slate-800 text-[#00e5a8] shadow-xs"
                : "text-slate-400 hover:text-[#00e5a8]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#00e5a8]" />
            <span className="font-semibold">Level 2 Order Book</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a8] animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "history"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>History</span>
            <span className="text-[10px] text-slate-500">({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("journal")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "journal"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Bot Journal</span>
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "code"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-slate-400" />
            <span>Source Code</span>
          </button>

          <button
            onClick={() => setActiveTab("broker")}
            className={`flex items-center gap-1.5 px-3 py-1 font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "broker"
                ? "bg-slate-800 text-slate-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>MT5 Broker</span>
            {connectionState?.status === "CONNECTED" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Action icons & Download CSV */}
        <div className="flex items-center gap-2">
          {/* Prominent Download CSV Button */}
          <button
            onClick={downloadComprehensiveCSV}
            title="Download CSV: Export complete trade history, performance report, and bot logs"
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-sky-950/70 hover:bg-sky-900 border border-sky-500/50 rounded transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Download CSV</span>
          </button>

          {activeTab === "code" && (
            <button
              onClick={copyCodeToClipboard}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? "Copied" : "Copy MQ5 Code"}</span>
            </button>
          )}

          {report.paused && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-rose-400 font-medium">Risk Paused</span>
              {onResetRiskPause && (
                <button
                  onClick={onResetRiskPause}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors cursor-pointer"
                >
                  Resume
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Content Body */}
      <div className="min-h-[220px] max-h-[340px] overflow-y-auto">
        {/* TAB 1: ACTIVE TRADES */}
        {activeTab === "trade" && (
          <div className="overflow-x-auto">
            {position ? (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-[#0a0d13]/50 text-slate-400 text-[11px]">
                    <th className="py-2 px-3 font-semibold">Ticket</th>
                    <th className="py-2 px-3 font-semibold">Time</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Units / Lots</th>
                    <th className="py-2 px-3 font-semibold">Symbol</th>
                    <th className="py-2 px-3 font-semibold">Price</th>
                    <th className="py-2 px-3 font-semibold">S/L</th>
                    <th className="py-2 px-3 font-semibold">T/P</th>
                    <th className="py-2 px-3 font-semibold">Current</th>
                    <th className="py-2 px-3 font-semibold">Profit</th>
                    <th className="py-2 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  <tr className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300">#{position.ticket}</td>
                    <td className="py-2.5 px-3 text-slate-400">{position.entryTime}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          position.type === "BUY"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {position.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {position.units.toLocaleString()} ({(position.units / 100000).toFixed(2)} lots)
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-semibold">{position.symbol}</td>
                    <td className="py-2.5 px-3 text-slate-300">{position.entryPrice.toFixed(pipDecimals)}</td>
                    <td className="py-2.5 px-3 text-rose-400/90">{position.stopLossPrice.toFixed(pipDecimals)}</td>
                    <td className="py-2.5 px-3 text-emerald-400/90">
                      {position.takeProfitPrice ? position.takeProfitPrice.toFixed(pipDecimals) : "None"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-semibold">{position.currentPrice.toFixed(pipDecimals)}</td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        position.unrealizedProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {position.unrealizedProfit >= 0 ? "+" : ""}${position.unrealizedProfit.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={onClosePosition}
                        className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Close Position"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No active orders in market. Waiting for algorithmic signal or manual order placement...
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LEVEL 2 ORDER BOOK (DEPTH OF MARKET STREAM) */}
        {activeTab === "orderbook" && (
          <div className="p-3.5 space-y-3 font-mono text-xs">
            {/* L2 Header & Pair Quick Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#0a0d13] border border-slate-800 rounded">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#00e5a8]" />
                  <span className="font-bold text-slate-100 text-sm">{activeSymbol}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00e5a8]/20 text-[#00e5a8] border border-[#00e5a8]/40 font-bold">
                    MT5 DEPTH OF MARKET (DOM)
                  </span>
                </div>

                <div className="text-slate-400 text-xs hidden sm:flex items-center gap-2">
                  <span>
                    Spread: <strong className="text-slate-200">{orderBook?.spread || 0.0001}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Synced: <strong className="text-slate-300">{lastBookUpdate || "Streaming"}</strong>
                  </span>
                </div>
              </div>

              {/* Fast Pair Selector for DOM including OMR/USD */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] text-slate-500 font-sans">Pair:</span>
                {FOREX_PAIRS.map((pair) => (
                  <button
                    key={pair.symbol}
                    onClick={() => onSelectPair && onSelectPair(pair)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                      pair.symbol === activeSymbol
                        ? "bg-[#00c896] text-[#08111f] font-bold shadow-xs"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {pair.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Liquidity Imbalance Meter */}
            <div className="bg-[#0a0d13] border border-slate-800/80 rounded p-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Bid Liquidity: <strong>{totalBidLiquidity.toFixed(2)} Lots</strong></span>
                </div>

                <div className="text-slate-400 text-[10px]">
                  Imbalance:{" "}
                  <span className={liquidityImbalance >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {liquidityImbalance >= 0 ? "+" : ""}{liquidityImbalance.toFixed(1)}% {liquidityImbalance >= 0 ? "(Buy Pressure)" : "(Sell Pressure)"}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-rose-400">
                  <span>Ask Liquidity: <strong>{totalAskLiquidity.toFixed(2)} Lots</strong></span>
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Visual Split Depth Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-900 border border-slate-800">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${
                      totalBidLiquidity + totalAskLiquidity > 0
                        ? (totalBidLiquidity / (totalBidLiquidity + totalAskLiquidity)) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{
                    width: `${
                      totalBidLiquidity + totalAskLiquidity > 0
                        ? (totalAskLiquidity / (totalBidLiquidity + totalAskLiquidity)) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* 2-Column Level 2 Book Visualizer (Bids on Left, Asks on Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* BIDS (BUY ORDERS) */}
              <div className="bg-[#0a0d13] border border-emerald-950/60 rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-950/30 border-b border-emerald-900/40 text-[11px] font-bold text-emerald-400">
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>BIDS (BUY DEPTH)</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 font-normal">Vol / Orders</div>
                </div>

                <div className="divide-y divide-slate-900 text-xs">
                  {orderBook ? (
                    orderBook.bids.map((bid, i) => {
                      const depthPct = Math.min(100, (bid.totalVolume / maxBidVol) * 100);
                      return (
                        <div key={i} className="relative px-3 py-1.5 flex items-center justify-between hover:bg-emerald-950/20">
                          {/* Visual Depth Bar Fill */}
                          <div
                            className="absolute top-0 bottom-0 left-0 bg-emerald-500/10 pointer-events-none transition-all duration-300"
                            style={{ width: `${depthPct}%` }}
                          />
                          <span className="font-bold text-emerald-400 relative z-10">
                            {bid.price.toFixed(pipDecimals)}
                          </span>
                          <div className="relative z-10 flex items-center gap-3 text-slate-300 text-[11px]">
                            <span className="font-semibold">{bid.volume.toFixed(2)} lots</span>
                            <span className="text-slate-500 text-[10px]">({bid.orders} orders)</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">Loading bid depth...</div>
                  )}
                </div>
              </div>

              {/* ASKS (SELL ORDERS) */}
              <div className="bg-[#0a0d13] border border-rose-950/60 rounded overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-rose-950/30 border-b border-rose-900/40 text-[11px] font-bold text-rose-400">
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>ASKS (SELL DEPTH)</span>
                  </div>
                  <div className="text-[10px] text-rose-400/80 font-normal">Vol / Orders</div>
                </div>

                <div className="divide-y divide-slate-900 text-xs">
                  {orderBook ? (
                    orderBook.asks.map((ask, i) => {
                      const depthPct = Math.min(100, (ask.totalVolume / maxAskVol) * 100);
                      return (
                        <div key={i} className="relative px-3 py-1.5 flex items-center justify-between hover:bg-rose-950/20">
                          {/* Visual Depth Bar Fill */}
                          <div
                            className="absolute top-0 bottom-0 right-0 bg-rose-500/10 pointer-events-none transition-all duration-300"
                            style={{ width: `${depthPct}%` }}
                          />
                          <span className="font-bold text-rose-400 relative z-10">
                            {ask.price.toFixed(pipDecimals)}
                          </span>
                          <div className="relative z-10 flex items-center gap-3 text-slate-300 text-[11px]">
                            <span className="font-semibold">{ask.volume.toFixed(2)} lots</span>
                            <span className="text-slate-500 text-[10px]">({ask.orders} orders)</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">Loading ask depth...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRADE HISTORY */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            {history.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800/60 bg-[#0a0d13]/50 text-slate-400 text-[11px]">
                    <th className="py-2 px-3 font-semibold">Ticket</th>
                    <th className="py-2 px-3 font-semibold">Symbol</th>
                    <th className="py-2 px-3 font-semibold">Type</th>
                    <th className="py-2 px-3 font-semibold">Units</th>
                    <th className="py-2 px-3 font-semibold">Entry</th>
                    <th className="py-2 px-3 font-semibold">Exit</th>
                    <th className="py-2 px-3 font-semibold">Pips</th>
                    <th className="py-2 px-3 font-semibold">Profit</th>
                    <th className="py-2 px-3 font-semibold">Balance</th>
                    <th className="py-2 px-3 font-semibold">Reason</th>
                    <th className="py-2 px-3 font-semibold min-w-[240px]">Execution Notes / Annotations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {history.map((t) => (
                    <tr key={t.id || t.ticket} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-slate-400">#{t.ticket}</td>
                      <td className="py-2 px-3 text-slate-200 font-semibold">{t.symbol}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                            t.type === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{t.units.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-300">{t.entry.toFixed(pipDecimals)}</td>
                      <td className="py-2 px-3 text-slate-300">{t.exit.toFixed(pipDecimals)}</td>
                      <td className={`py-2 px-3 ${t.pips >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {t.pips >= 0 ? "+" : ""}{t.pips.toFixed(1)}
                      </td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          t.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {t.profit >= 0 ? "+" : ""}${t.profit.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-slate-200">${t.balance.toFixed(2)}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded">
                          {t.exitReason}
                        </span>
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="relative flex items-center min-w-[220px]">
                          <input
                            type="text"
                            value={tradeNotes[t.ticket] ?? t.notes ?? ""}
                            onChange={(e) => handleSaveNote(t.ticket, e.target.value)}
                            placeholder="Add execution note..."
                            className="w-full bg-[#070a0f] hover:bg-[#0c1017] focus:bg-[#0c1017] border border-slate-800 focus:border-purple-500/60 rounded px-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                          />
                          {(tradeNotes[t.ticket] || t.notes) && (
                            <span className="absolute right-2 text-[10px] text-purple-400 font-sans pointer-events-none opacity-60">
                              Saved
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No closed trades yet in this session.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: JOURNAL */}
        {activeTab === "journal" && (
          <div className="p-3 space-y-1.5 font-mono text-xs text-slate-300">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 hover:bg-slate-800/20 p-1 rounded">
                <span className="text-slate-500 text-[11px] shrink-0">[{log.time}]</span>
                <span
                  className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                    log.type === "ORDER_OPEN"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : log.type === "ORDER_CLOSE"
                      ? "bg-blue-500/20 text-blue-400"
                      : log.type === "RISK_ALERT"
                      ? "bg-rose-500/20 text-rose-400"
                      : log.type === "SIGNAL"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-700/30 text-slate-400"
                  }`}
                >
                  {log.type}
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* TAB 5: SOURCE CODE */}
        {activeTab === "code" && (
          <div className="p-3 bg-[#080b10] text-[11px] font-mono text-slate-300 overflow-x-auto">
            <pre>
              {`// MetaTrader 5 Expert Advisor & Level 2 Depth Bridge
#include <Trade\\Trade.mqh>
input double InpRiskPercent = 1.0;
input int InpFastEMA = 9;
input int InpSlowEMA = 21;
input int InpRsiPeriod = 14;

// Supports EUR/USD, GBP/USD, USD/JPY, AUD/USD, XAU/USD, and OMR/USD`}
            </pre>
          </div>
        )}

        {/* TAB 6: MT5 BROKER CONNECTION DETAILS */}
        {activeTab === "broker" && (
          <div className="p-4 space-y-3 font-mono text-xs">
            {connectionState?.status === "CONNECTED" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#0a0d13] border border-slate-800 rounded">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <div>
                      <div className="text-slate-100 font-bold font-sans text-xs">
                        {connectionState.brokerCompany || "MetaQuotes Broker"}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Server: <span className="text-emerald-400 font-mono">{connectionState.brokerServer}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {connectionState.pingMs && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded text-[11px]">
                        Latency: {connectionState.pingMs}ms
                      </span>
                    )}
                    {onOpenBrokerModal && (
                      <button
                        onClick={onOpenBrokerModal}
                        className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors text-[11px] font-sans font-medium cursor-pointer"
                      >
                        Connection Settings
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded">
                    <span className="text-slate-500 font-sans block text-[11px]">Account ID</span>
                    <strong className="text-slate-100 font-mono text-sm">#{connectionState.credentials.login}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded">
                    <span className="text-slate-500 font-sans block text-[11px]">Account Type</span>
                    <strong className="text-emerald-400 font-mono text-sm">{connectionState.credentials.accountType}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded">
                    <span className="text-slate-500 font-sans block text-[11px]">Leverage</span>
                    <strong className="text-slate-100 font-mono text-sm">{connectionState.credentials.leverage}</strong>
                  </div>

                  <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded">
                    <span className="text-slate-500 font-sans block text-[11px]">Terminal Build</span>
                    <span className="text-slate-300 font-mono text-[11px] block truncate">
                      {connectionState.terminalVersion || "MT5 Build 4410"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-sans p-2.5 bg-[#0a0d13] border border-slate-800/60 rounded flex items-center justify-between">
                  <span>
                    Bridge Gateway: <strong className="text-slate-200">{connectionState.credentials.bridgeType.replace(/_/g, " ")}</strong>
                  </span>
                  <span className="text-emerald-400">● Live WebSocket Stream Active</span>
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
                <WifiOff className="w-8 h-8 text-slate-500" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-200 font-sans">
                    No MT5 Terminal or Broker Connected
                  </h4>
                  <p className="text-xs text-slate-400 font-sans max-w-md">
                    Connect your MetaTrader 5 account to stream live quotes, orders, and Level 2 market depth.
                  </p>
                </div>
                {onOpenBrokerModal && (
                  <button
                    onClick={onOpenBrokerModal}
                    className="flex items-center gap-1.5 px-4 py-1.5 font-sans font-medium text-xs text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Set Up MT5 & Broker Connection</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MT5 Bottom Account Summary Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#080b10] border-t border-slate-800 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <div>
            <span className="text-slate-500 font-sans mr-1">Balance:</span>
            <strong className="text-slate-100 font-bold">${report.currentBalance.toFixed(2)}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans mr-1">Equity:</span>
            <strong
              className={`font-bold ${
                equity >= report.initialBalance ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              ${equity.toFixed(2)}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-sans mr-1">Margin:</span>
            <span className="text-slate-300">${marginUsed.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 font-sans mr-1">Free Margin:</span>
            <span className="text-slate-300">${freeMargin.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-sans">
          Forex Bot Engine · MetaTrader 5 Level 2 Terminal Bridge
        </div>
      </div>
    </div>
  );
};
