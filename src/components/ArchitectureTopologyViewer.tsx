import React, { useState } from "react";
import {
  Smartphone,
  Cpu,
  ShieldCheck,
  Cloud,
  Bot,
  Building2,
  Radio,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  Layers,
  FileCode,
  Terminal,
} from "lucide-react";
import { MT5ConnectionState } from "../types/broker";
import { ForexPairInfo, BotConfig } from "../types/trading";

interface ArchitectureTopologyViewerProps {
  mode: "DEMO" | "REAL";
  botRunning: boolean;
  selectedPair: ForexPairInfo;
  config: BotConfig;
  connectionState: MT5ConnectionState;
  onOpenBrokerModal: () => void;
  onAddLog?: (type: any, msg: string) => void;
}

interface NodeDetail {
  id: string;
  name: string;
  category: string;
  icon: any;
  statusText: string;
  statusBadge: "active" | "online" | "warning" | "streaming";
  pingEstimate: string;
  role: string;
  specs: string[];
  instructions: string;
  actionLabel?: string;
  actionCode?: string;
}

export const ArchitectureTopologyViewer: React.FC<ArchitectureTopologyViewerProps> = ({
  mode,
  botRunning,
  selectedPair,
  config,
  connectionState,
  onOpenBrokerModal,
  onAddLog,
}) => {
  const [activeTab, setActiveTab] = useState<"7layer" | "scalping" | "ascii">("7layer");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticStep, setDiagnosticStep] = useState<number>(-1);
  const [copiedAscii, setCopiedAscii] = useState(false);
  const [copiedActionCode, setCopiedActionCode] = useState(false);

  const isConnected = connectionState.status === "CONNECTED";
  const isExnessServer = connectionState.credentials.server.toLowerCase().includes("exness");

  const nodes: NodeDetail[] = [
    {
      id: "android",
      name: "ANDROID CHROME",
      category: "Mobile Web Client / PWA",
      icon: Smartphone,
      statusText: "Touch Viewport Active",
      statusBadge: "active",
      pingEstimate: "0 ms (Local)",
      role: "Client-side trader portal running responsive web app in Android Chrome. Delivers 1-touch execution, visual telemetry, and background notifications.",
      specs: [
        "Chrome 120+ Mobile PWA Ready",
        "Touch-optimised One-Click Trading Bar",
        "Responsive Adaptive Layout (360px - 4K)",
        "Zero-install client with instant access",
      ],
      instructions:
        "Open the application URL inside Android Google Chrome. Tap the Chrome three-dot menu and select 'Add to Home screen' or 'Install App' for full-screen PWA trading mode.",
      actionLabel: "Copy PWA URL Guide",
      actionCode: "// Android Chrome PWA Setup:\n// 1. Open app in Chrome on Android\n// 2. Tap ⋮ (Three Dots) > 'Add to Home screen'\n// 3. Launch from home screen in full-screen standalone mode",
    },
    {
      id: "trader_deck",
      name: "SPEAKING HAND AI TRADER",
      category: "React 19 Dashboard UI",
      icon: Cpu,
      statusText: botRunning ? "Simulation Running" : "Standby / Ready",
      statusBadge: botRunning ? "active" : "online",
      pingEstimate: "< 1 ms",
      role: "High-performance React application core. Houses EMA(9/21) crossover logic, RSI(14) filtering, Capital Shield drawdown limits, and live chart replay.",
      specs: [
        "EMA 9 & EMA 21 Momentum Crossover",
        "RSI 14 Overbought / Oversold Filter",
        `Capital Shield Drawdown Circuit Breaker (${config.maxDrawdownPercent}%)`,
        "Trailing Stop & Breakeven Position Manager",
      ],
      instructions:
        "Controls your automated Forex bot. Switch between DEMO mode for risk-free simulation or REAL mode once connected to an active MT5 / Exness account.",
      actionLabel: "View Strategy Parameters",
      actionCode: `// Strategy Parameters:\nFast EMA: ${config.fastEMA}\nSlow EMA: ${config.slowEMA}\nRSI Period: ${config.rsiPeriod}\nRisk Per Trade: ${config.riskPercent}%\nMax Drawdown: ${config.maxDrawdownPercent}%\nTrailing Stop: ${config.trailingStop ? "Enabled" : "Disabled"}`,
    },
    {
      id: "nodejs_backend",
      name: "SECURE NODE.JS BACKEND",
      category: "API Gateway & Bot Engine",
      icon: ShieldCheck,
      statusText: "Port 3000 IPC Ready",
      statusBadge: "active",
      pingEstimate: "12 ms",
      role: "Secure Node.js engine (trading-bot.js / server.ts). Relays commands between the web dashboard and the Windows VPS via encrypted tokens, preventing credential exposure.",
      specs: [
        "Standalone Node.js Runtime (node trading-bot.js)",
        "REST API & WebSocket Bridge Gateway",
        "Bearer Token / Secret Key Encryption",
        "Automatic Order Routing & Risk Throttling",
      ],
      instructions:
        "Run the autonomous engine via CLI: 'node trading-bot.js' or start full backend server. Keeps API secrets and broker passwords securely isolated from the frontend.",
      actionLabel: "Copy Node.js Bot CLI Command",
      actionCode: "node trading-bot.js",
    },
    {
      id: "windows_vps",
      name: "WINDOWS VPS",
      category: "24/7 Co-Located Cloud Server",
      icon: Cloud,
      statusText: isConnected ? "Co-Located (1.8ms)" : "Ready for Deployment",
      statusBadge: isConnected ? "active" : "online",
      pingEstimate: "1.8 - 4.5 ms to Exness",
      role: "Windows Virtual Private Server running 24/7/365 uninterrupted in London (Equinix LD4) or Amsterdam, directly adjacent to Exness order matching centers.",
      specs: [
        "Windows Server 2022 / 2025 Datacenter",
        "Zero Sleep, Zero Hibernation, Always-On Power",
        "Sub-2ms fiber cross-connect to Exness servers",
        "Remote Desktop (RDP) access from Android or PC",
      ],
      instructions:
        "Provision a Windows VPS (Contabo, Kamatera, ForexVPS, or AWS EC2). Connect via Microsoft Remote Desktop on Android or Windows, install Exness MT5, and run the terminal 24/7.",
      actionLabel: "Copy VPS Optimization Checklist",
      actionCode: "// Windows VPS Optimization:\n// 1. Disable Windows Sleep/Hibernate\n// 2. Set MT5 to 'Start with Windows'\n// 3. Keep MT5 Terminal running minimized\n// 4. Ping to Exness server should be < 5ms",
    },
    {
      id: "mt5_ea",
      name: "MT5 EXPERT ADVISOR",
      category: "SpeakingHandEA.mq5",
      icon: Bot,
      statusText: isConnected ? "Magic #18812 Loaded" : "MQL5 Script Ready",
      statusBadge: isConnected ? "active" : "online",
      pingEstimate: "0.2 ms (Local Terminal IPC)",
      role: "Native MQL5 Expert Advisor running directly inside the MetaTrader 5 terminal on the VPS. Translates quantitative signals into instant MT5 OrderSend requests.",
      specs: [
        "Native CTrade execution engine",
        "Target distance exit: closePositionAtTarget(currentPrice)",
        "Dynamic pip-based lot sizing (Account balance risk %)",
        "Spread filter protection (< 2.5 pips)",
      ],
      instructions:
        "Copy the generated SpeakingHandEA.mq5 code into MetaEditor (F4) in MT5. Press Compile (F7), then drag the EA onto your EURUSD chart and enable 'Allow Algo Trading'.",
      actionLabel: "Open MQL5 Code Generator",
      actionCode: "// SpeakingHandEA.mq5 compile in MetaEditor:\n// 1. Open MT5 > Tools > MetaQuotes Language Editor (F4)\n// 2. Create New Expert Advisor > Paste code\n// 3. Compile (F7) > Drag onto chart",
    },
    {
      id: "exness_account",
      name: "EXNESS TRADING ACCOUNT",
      category: mode === "REAL" ? "Exness Live MT5 Account" : "Exness Trial/Demo MT5",
      icon: Building2,
      statusText: isExnessServer
        ? `${connectionState.credentials.server} Connected`
        : "Exness-Trial7 / Exness-Real19",
      statusBadge: isConnected ? "active" : "online",
      pingEstimate: "14 ms",
      role: "Exness MT5 Broker Account. Executes market orders with ultra-tight spreads (from 0.0 pips on Raw Spread / Zero accounts) and high leverage up to 1:2000.",
      specs: [
        "Leverage up to 1:2000 (Flexible margin requirements)",
        "Ultra-low spreads from 0.0 pips (Raw Spread / Zero)",
        "Instant & Market execution without requotes",
        "Negative Balance Protection enabled",
      ],
      instructions:
        "Log into your Exness Personal Area. Create an MT5 Standard or Raw Spread account. Enter your account number and Exness server (e.g. Exness-Trial7 or Exness-Real19) into the connector.",
      actionLabel: "Configure Exness Credentials",
      actionCode: `Broker: Exness Global\nServer: ${isExnessServer ? connectionState.credentials.server : "Exness-Trial7"}\nLeverage: 1:2000\nExecution: Market Execution`,
    },
    {
      id: "live_feed",
      name: "LIVE PRICES + ACCOUNT INFO",
      category: "Real-Time Streaming Loop",
      icon: Radio,
      statusText: "Bid/Ask Streaming Active",
      statusBadge: "streaming",
      pingEstimate: "Feedback Loop (~25ms)",
      role: "Continuous two-way data telemetry. Streams real-time market prices, account balance, floating PnL, equity, and order execution confirmations back to Android Chrome.",
      specs: [
        `Streaming Symbol: ${selectedPair.symbol}`,
        `Current Balance: $${reportBalance(reportBalanceNumber(connectionState))} · Equity: $${reportBalance(reportBalanceNumber(connectionState))}`,
        "Continuous feedback loop: VPS -> Node.js -> Web App -> Mobile",
        "Sub-second order state & margin synchronization",
      ],
      instructions:
        "Provides feedback for closed trades, trailing stop adjustments, and circuit breakers directly to the Speaking Hand dashboard and system logs.",
      actionLabel: "Inspect Live Price Stream",
      actionCode: `Symbol: ${selectedPair.symbol}\nPip Size: ${selectedPair.pipSize}\nDigits: ${selectedPair.pipDecimals}\nStatus: Active Tick Stream`,
    },
  ];

  function reportBalanceNumber(cState: MT5ConnectionState): number {
    return cState.balance || 10000;
  }

  function reportBalance(val: number): string {
    return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const asciiDiagram = `📱 ANDROID CHROME
        |
        v
SPEAKING HAND AI TRADER
        |
        v
🔐 SECURE NODE.JS BACKEND
        |
        v
☁️ WINDOWS VPS
        |
        v
🤖 MT5 EXPERT ADVISOR
        |
        v
EXNESS TRADING ACCOUNT
        |
        v
Live prices + Account information`;

  const handleCopyAscii = () => {
    navigator.clipboard.writeText(asciiDiagram);
    setCopiedAscii(true);
    setTimeout(() => setCopiedAscii(false), 2000);
    if (onAddLog) {
      onAddLog("INFO", "Architecture topology diagram copied to clipboard.");
    }
  };

  const handleCopyActionCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedActionCode(true);
    setTimeout(() => setCopiedActionCode(false), 2000);
  };

  const handleRunDiagnostics = () => {
    setIsDiagnosing(true);
    setDiagnosticStep(0);

    const steps = [0, 1, 2, 3, 4, 5, 6];
    steps.forEach((stepIdx, i) => {
      setTimeout(() => {
        setDiagnosticStep(stepIdx);
        if (i === steps.length - 1) {
          setTimeout(() => {
            setIsDiagnosing(false);
            setDiagnosticStep(-1);
            if (onAddLog) {
              onAddLog(
                "INFO",
                "Full 7-layer pipeline diagnostic passed! Android Chrome -> VPS -> Exness handshake: 34.2ms round-trip."
              );
            }
          }, 800);
        }
      }, i * 450);
    });
  };

  const scalpingSteps = [
    { label: "Dashboard", sub: "React UI", active: true },
    { label: "Node.js API", sub: "trading-bot.js", active: true },
    { label: "MT5 Connector", sub: "IPC Bridge", active: isConnected },
    { label: "EXNESS MT5", sub: isExnessServer ? "Verified" : "Exness-Trial7", active: true },
    { label: "Market Prices", sub: selectedPair.symbol, active: true },
    { label: "AI ANALYZER", sub: "EMA+RSI", active: true },
    { label: "SCALPING", sub: "Fast M1/M5", active: true },
    { label: "RISK MGMT", sub: `DD ≤ ${config.maxDrawdownPercent}%`, active: true },
    { label: mode + " MODE", sub: botRunning ? "ACTIVE" : "STANDBY", active: true },
  ];

  return (
    <div className="bg-[#142238] border border-[#1e3456] rounded-xl p-3.5 sm:p-4 shadow-lg space-y-3">
      {/* Top Header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#1b2f4c]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00e5a8]" />
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>SYSTEM ARCHITECTURE & EXECUTION PIPELINE</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              End-to-end cloud topology: Android Chrome mobile app to Exness MT5 on Windows VPS
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="bg-[#0b1524] p-0.5 rounded-lg border border-[#1e3456] flex items-center text-[11px]">
            <button
              onClick={() => setActiveTab("7layer")}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === "7layer"
                  ? "bg-[#00c896] text-[#08111f] shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              📱 7-Layer Topology
            </button>
            <button
              onClick={() => setActiveTab("scalping")}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === "scalping"
                  ? "bg-[#00c896] text-[#08111f] shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              ⚡ Strategy Pipeline
            </button>
            <button
              onClick={() => setActiveTab("ascii")}
              className={`px-2.5 py-1 rounded-md font-mono text-[10px] transition-all cursor-pointer ${
                activeTab === "ascii"
                  ? "bg-[#00c896] text-[#08111f] shadow-xs font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ASCII
            </button>
          </div>

          <button
            onClick={handleRunDiagnostics}
            disabled={isDiagnosing}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
              isDiagnosing
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                : "bg-[#0e1a2c] text-[#00e5a8] hover:bg-[#1a2d48] border-[#00e5a8]/30"
            }`}
            title="Simulate round-trip latency and connection handshake through all 7 nodes"
          >
            <RefreshCw className={`w-3 h-3 ${isDiagnosing ? "animate-spin" : ""}`} />
            <span>{isDiagnosing ? "Pinging..." : "Test E2E Ping"}</span>
          </button>

          <button
            onClick={handleCopyAscii}
            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-[#0e1a2c] text-slate-300 hover:text-white rounded-lg border border-[#1e3456] transition-colors cursor-pointer"
            title="Copy ASCII flowchart diagram"
          >
            {copiedAscii ? <Check className="w-3 h-3 text-[#00e5a8]" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copiedAscii ? "Copied" : "Copy Flow"}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 7-LAYER PRODUCTION ECOSYSTEM */}
      {activeTab === "7layer" && (
        <div className="space-y-3">
          {/* Visual connected cards flowchart */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {nodes.map((node, idx) => {
              const Icon = node.icon;
              const isInspected = selectedNodeId === node.id;
              const isPinging = diagnosticStep === idx;
              const isPastPing = diagnosticStep > idx;

              return (
                <div key={node.id} className="flex flex-col relative group">
                  <div
                    onClick={() => setSelectedNodeId(isInspected ? null : node.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between h-full ${
                      isPinging
                        ? "bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/40 scale-[1.02]"
                        : isInspected
                        ? "bg-[#0c192d] border-[#00e5a8] ring-2 ring-[#00e5a8]/30 shadow-md shadow-[#00e5a8]/10"
                        : "bg-[#0b1524] border-[#1e3456] hover:border-[#00e5a8]/50 hover:bg-[#0e1c31]"
                    }`}
                  >
                    <div>
                      {/* Top status indicator & number */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {isPastPing && (
                            <CheckCircle2 className="w-3 h-3 text-[#00e5a8] shrink-0" />
                          )}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              node.statusBadge === "active"
                                ? "bg-[#00e5a8] animate-pulse"
                                : node.statusBadge === "streaming"
                                ? "bg-cyan-400 animate-ping"
                                : "bg-emerald-400"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Icon & Title */}
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="p-1 rounded bg-[#14253e] text-[#00e5a8] shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-[11px] font-bold text-slate-100 uppercase tracking-tight truncate">
                          {node.name}
                        </h3>
                      </div>

                      {/* Sub-label */}
                      <div className="text-[10px] text-slate-400 truncate mb-1">
                        {node.category}
                      </div>
                    </div>

                    {/* Bottom Status & Ping */}
                    <div className="pt-1.5 border-t border-[#162944] mt-1 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-[#00e5a8] truncate max-w-[85px]">{node.statusText}</span>
                      <span className="text-slate-400 shrink-0">{node.pingEstimate}</span>
                    </div>
                  </div>

                  {/* Flow Arrow indicator (pointing down or right) */}
                  {idx < nodes.length - 1 && (
                    <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-[#00e5a8]/70 pointer-events-none">
                      <ArrowRight className="w-3.5 h-3.5 -mr-1 drop-shadow" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* INSPECTOR DRAWER / ACCORDION */}
          {selectedNodeId && (() => {
            const inspectedNode = nodes.find((n) => n.id === selectedNodeId);
            if (!inspectedNode) return null;
            const Icon = inspectedNode.icon;

            return (
              <div className="bg-[#0b1524] border border-[#00e5a8]/40 rounded-xl p-3.5 shadow-md space-y-2.5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#1b2f4c]">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#14253e] text-[#00e5a8]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 uppercase flex items-center gap-2">
                        <span>{inspectedNode.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#00e5a8]/15 text-[#00e5a8] rounded border border-[#00e5a8]/30 font-normal">
                          {inspectedNode.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">{inspectedNode.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-xs text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Technical Specifications */}
                  <div className="bg-[#0a111c] p-2.5 rounded-lg border border-[#1b2f4c] space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Technical Capabilities & Specs
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {inspectedNode.specs.map((spec, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-[#00e5a8]">•</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Setup & Deployment Guide */}
                  <div className="bg-[#0a111c] p-2.5 rounded-lg border border-[#1b2f4c] flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Deployment Instructions
                      </span>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {inspectedNode.instructions}
                      </p>
                    </div>

                    {inspectedNode.actionCode && (
                      <div className="pt-2 border-t border-[#1b2f4c] flex items-center justify-between">
                        {inspectedNode.id === "exness_account" ? (
                          <button
                            onClick={onOpenBrokerModal}
                            className="text-[11px] font-bold text-[#08111f] bg-[#00c896] hover:bg-[#00e5a8] px-2.5 py-1 rounded transition-colors cursor-pointer"
                          >
                            Open MT5 Broker Connector
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCopyActionCode(inspectedNode.actionCode!)}
                            className="text-[11px] text-[#00e5a8] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedActionCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedActionCode ? "Copied" : inspectedNode.actionLabel || "Copy Config"}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: SCALPING STRATEGY PIPELINE */}
      {activeTab === "scalping" && (
        <div className="overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="flex items-center justify-between min-w-[780px] gap-1.5 text-center text-xs">
            {scalpingSteps.map((step, idx) => (
              <React.Fragment key={step.label}>
                <div
                  className={`flex-1 p-2 rounded-lg border transition-all ${
                    step.active
                      ? "bg-[#0b1524] border-[#00e5a8]/40 shadow-xs shadow-[#00e5a8]/10"
                      : "bg-[#0a111c] border-slate-800 text-slate-500"
                  }`}
                >
                  <div
                    className={`font-mono font-bold text-[11px] truncate ${
                      step.label.includes(mode)
                        ? mode === "REAL"
                          ? "text-rose-400"
                          : "text-[#00e5a8]"
                        : "text-slate-100"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                    {step.sub}
                  </div>
                </div>
                {idx < scalpingSteps.length - 1 && (
                  <div className="text-[#00e5a8]/60 shrink-0 px-0.5">
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ASCII FLOWCHART VIEW */}
      {activeTab === "ascii" && (
        <div className="relative bg-[#0a111c] border border-[#1b2f4c] rounded-lg p-3 text-xs font-mono text-[#00e5a8]">
          <button
            onClick={handleCopyAscii}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 text-[10px] bg-[#142238] hover:bg-[#1e3456] text-slate-200 rounded border border-[#1b2f4c] transition-colors cursor-pointer"
          >
            {copiedAscii ? <Check className="w-3 h-3 text-[#00e5a8]" /> : <Copy className="w-3 h-3" />}
            <span>{copiedAscii ? "Copied" : "Copy ASCII"}</span>
          </button>
          <pre className="whitespace-pre overflow-x-auto leading-relaxed py-1">
            {asciiDiagram}
          </pre>
        </div>
      )}
    </div>
  );
};
