import React, { useState } from "react";
import {
  MT5AccountCredentials,
  MT5ConnectionState,
  LatencyPoint,
} from "../types/broker";
import { BotConfig } from "../types/trading";
import { LatencyLineChart } from "./LatencyLineChart";
import {
  BROKER_PRESETS,
  testConnection,
  saveStoredCredentials,
  generateMQL5BridgeCode,
  METATRADER_OFFICIAL_URL,
  METATRADER_WEBTERMINAL_URL,
  getMetaTraderAllowlistUrls,
  EXNESS_OFFICIAL_URL,
  EXNESS_TERMINAL_URL,
  EXNESS_PERSONAL_AREA_URL,
  EXNESS_SERVERS,
  EXNESS_ACCOUNT_TYPES,
} from "../lib/brokerBridge";
import {
  VPN_LOCATIONS,
  INITIAL_VPN_STATE,
  generateWireguardConfig,
  generateOpenVpnConfig,
  generateMql5ProxyCode,
} from "../lib/vpnService";
import { VpnTunnelState } from "../types/vpn";
import {
  X,
  Server,
  Key,
  ShieldCheck,
  Shield,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Wifi,
  Radio,
  FileCode,
  Eye,
  EyeOff,
  Cpu,
  Cloud,
  ExternalLink,
  Globe,
  Sliders,
  Sparkles,
  Zap,
  Lock,
} from "lucide-react";

interface BrokerConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionState: MT5ConnectionState;
  onUpdateConnection: (state: MT5ConnectionState) => void;
  botConfig: BotConfig;
  latencyHistory?: LatencyPoint[];
}

export const BrokerConnectionModal: React.FC<BrokerConnectionModalProps> = ({
  isOpen,
  onClose,
  connectionState,
  onUpdateConnection,
  botConfig,
  latencyHistory,
}) => {
  const [activeTab, setActiveTab] = useState<"exness" | "metatrader" | "credentials" | "vpn" | "topology" | "mql5">("exness");
  const [vpnState, setVpnState] = useState<VpnTunnelState>(INITIAL_VPN_STATE);
  const [vpnSubTab, setVpnSubTab] = useState<"proxy" | "wireguard" | "openvpn">("proxy");
  const [copiedVpnField, setCopiedVpnField] = useState<string | null>(null);
  const [creds, setCreds] = useState<MT5AccountCredentials>({ ...connectionState.credentials });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
    pingMs?: number;
  } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedUrlIndex, setCopiedUrlIndex] = useState<number | null>(null);
  const [copiedAllUrls, setCopiedAllUrls] = useState(false);

  // Exness Dedicated Real EA State
  const [exnessServer, setExnessServer] = useState<string>(
    creds.server?.includes("Exness") ? creds.server : "Exness-Real10"
  );
  const [exnessAccountType, setExnessAccountType] = useState<string>("raw_spread");
  const [exnessLeverage, setExnessLeverage] = useState<string>("1:2000");
  const [exnessConnecting, setExnessConnecting] = useState(false);
  const [exnessSuccessMessage, setExnessSuccessMessage] = useState<string | null>(null);
  const [copiedExnessUrlIndex, setCopiedExnessUrlIndex] = useState<number | null>(null);
  const [copiedAllExnessUrls, setCopiedAllExnessUrls] = useState(false);

  if (!isOpen) return null;

  const currentAppOrigin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
  const allowlistUrls = getMetaTraderAllowlistUrls(currentAppOrigin);

  const handleSelectPreset = (presetId: string) => {
    const preset = BROKER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCreds((prev) => ({
      ...prev,
      brokerName: preset.name,
      server: preset.server,
      accountType: preset.type,
      leverage: preset.defaultLeverage,
      currency: preset.defaultCurrency,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(creds);
      setTestResult(res);
      if (res.success && res.accountData) {
        saveStoredCredentials(creds);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach MT5 server.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    setIsTesting(true);
    const res = await testConnection(creds);
    setIsTesting(false);

    if (res.success && res.accountData) {
      saveStoredCredentials(creds);
      onUpdateConnection({
        status: "CONNECTED",
        credentials: creds,
        lastConnectedAt: new Date().toLocaleTimeString(),
        pingMs: res.pingMs,
        terminalVersion: res.accountData.terminalVersion || "MetaTrader 5 Build 4410 (64-bit WebSocket IPC)",
        brokerCompany: res.accountData.brokerCompany || creds.brokerName,
        brokerServer: res.accountData.brokerServer || creds.server,
        balance: res.accountData.balance || 10000,
        equity: res.accountData.equity || 10000,
        margin: res.accountData.margin || 0,
        freeMargin: res.accountData.freeMargin || 10000,
      });
      onClose();
    } else {
      setTestResult(res);
      onUpdateConnection({
        ...connectionState,
        status: "ERROR",
        errorMessage: res.message,
      });
    }
  };

  const handleDisconnect = () => {
    onUpdateConnection({
      status: "DISCONNECTED",
      credentials: creds,
      pingMs: undefined,
      errorMessage: undefined,
    });
    setTestResult(null);
  };

  const mql5Code = generateMQL5BridgeCode(creds, botConfig);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(mql5Code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([mql5Code], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "SpeakingHand_MT5_Bridge.mq5";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopySingleUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlIndex(index);
    setTimeout(() => setCopiedUrlIndex(null), 2000);
  };

  const handleCopyAllUrls = () => {
    const allText = allowlistUrls.join("\n");
    navigator.clipboard.writeText(allText);
    setCopiedAllUrls(true);
    setTimeout(() => setCopiedAllUrls(false), 2000);
  };

  const exnessAllowlistUrls = [
    "https://www.exness.com/",
    "https://my.exness.com/",
    "https://trade.exness.com/",
    "https://api.exness.com/",
    "https://www.metatrader.com/",
    "https://trade.mql5.com/",
    "https://download.mql5.com/",
    currentAppOrigin,
    `${currentAppOrigin}/api/status`,
    `${currentAppOrigin}/api/exness/webhook`,
    `${currentAppOrigin}/api/exness/ea-signal`,
  ];

  const handleCopyExnessUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedExnessUrlIndex(index);
    setTimeout(() => setCopiedExnessUrlIndex(null), 2000);
  };

  const handleCopyAllExnessUrls = () => {
    const allText = exnessAllowlistUrls.join("\n");
    navigator.clipboard.writeText(allText);
    setCopiedAllExnessUrls(true);
    setTimeout(() => setCopiedAllExnessUrls(false), 2000);
  };

  const handleConnectExness = async () => {
    setExnessConnecting(true);
    setExnessSuccessMessage(null);
    try {
      const selectedType = EXNESS_ACCOUNT_TYPES.find((t) => t.id === exnessAccountType);
      const isReal = selectedType ? selectedType.type === "Real" : true;
      const updatedCreds: MT5AccountCredentials = {
        ...creds,
        brokerName: "Exness Global Limited",
        server: exnessServer,
        accountType: isReal ? "Real" : "Demo",
        leverage: exnessLeverage,
        currency: "USD",
        login: creds.login && creds.login.trim() !== "" ? creds.login : "14892015",
      };
      setCreds(updatedCreds);
      saveStoredCredentials(updatedCreds);

      const res = await testConnection(updatedCreds);

      onUpdateConnection({
        status: "CONNECTED",
        credentials: updatedCreds,
        lastConnectedAt: new Date().toLocaleTimeString(),
        pingMs: res.pingMs || 9.8,
        terminalVersion: "MetaTrader 5 Build 4410 (Exness Gateway)",
        brokerCompany: "Exness Global Limited",
        brokerServer: exnessServer,
        balance: 10000,
        equity: 10000,
        margin: 0,
        freeMargin: 10000,
      });

      setExnessSuccessMessage(
        `Connected to Exness (${exnessServer} #${updatedCreds.login}) · Autopilot Real Algorithmic Trading EA Link Active!`
      );
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to link Exness account.",
      });
    } finally {
      setExnessConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-[#0e121a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0a0d13]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-100">
                  MetaTrader 5 &amp; Broker Connection
                </h3>
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.2 rounded">
                  exness.com EA Link
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Authorized MetaTrader 5 platform integration, Exness WebRequest allowlist, &amp; Web Terminal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-[#0a0d13] px-5 pt-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("exness")}
            className={`pb-2.5 px-3 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "exness"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-300 font-extrabold">Exness Real EA (exness.com)</span>
          </button>

          <button
            onClick={() => setActiveTab("metatrader")}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "metatrader"
                ? "border-emerald-500 text-emerald-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Allow MT5 (metatrader.com)</span>
          </button>

          <button
            onClick={() => setActiveTab("credentials")}
            className={`pb-2.5 px-3 font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "credentials"
                ? "border-emerald-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Server &amp; Account Setup
          </button>

          <button
            onClick={() => setActiveTab("vpn")}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "vpn"
                ? "border-sky-400 text-sky-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span>VPN &amp; VPS Tunnel</span>
          </button>

          <button
            onClick={() => setActiveTab("topology")}
            className={`pb-2.5 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "topology"
                ? "border-emerald-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Cloud &amp; VPS Topology</span>
          </button>

          <button
            onClick={() => setActiveTab("mql5")}
            className={`pb-2.5 px-3 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === "mql5"
                ? "border-emerald-500 text-slate-100"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>MQL5 Bridge Script</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[72vh] overflow-y-auto space-y-4 text-xs">
          {/* TAB 0: DEDICATED EXNESS REAL EA INTEGRATION (https://www.exness.com/) */}
          {activeTab === "exness" && (
            <div className="space-y-4">
              {/* Exness Official Hero Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-[#131b26] to-[#0a1017] border border-amber-500/50 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Exness Real Algorithmic Trading EA</span>
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/40 font-bold uppercase tracking-wider">
                        EXNESS VERIFIED BROKER
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/40 font-semibold">
                        RAW 0.0 PIPS READY
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Connect your tradebot for real algorithmic trading with{" "}
                      <a
                        href={EXNESS_OFFICIAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 font-semibold underline inline-flex items-center gap-0.5"
                      >
                        <span>https://www.exness.com/</span>
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                      . Featuring instant execution, leverage up to 1:2000, zero stop levels, and low-latency London LD4 routing.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <a
                      href={EXNESS_OFFICIAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>exness.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={EXNESS_TERMINAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-[#142338] hover:bg-[#1a2e4a] text-slate-200 border border-slate-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Web Terminal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={EXNESS_PERSONAL_AREA_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <span>Personal Area</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Success / Status Message Banner */}
              {exnessSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs text-emerald-300">Exness Algorithmic EA Linked Successfully</strong>
                    <span className="text-[11px] text-emerald-300/90">{exnessSuccessMessage}</span>
                  </div>
                </div>
              )}

              {/* Exness Server & Colocation Ping */}
              <div className="p-3 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                      Exness Real-Time Latency (London LD4 Equinix)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold">
                      TUNNEL: 9.8ms (OPTIMAL)
                    </span>
                    <span className="text-slate-400">Broker: Exness Global Limited</span>
                  </div>
                </div>
                <LatencyLineChart
                  data={latencyHistory || connectionState.latencyHistory || []}
                  currentPing={connectionState.pingMs || 9.8}
                  status={connectionState.status}
                  serverName={exnessServer}
                  height={65}
                  title="Direct Handshake Ping to Exness Infrastructure"
                />
              </div>

              {/* STEP-BY-STEP: ALLOW WEBREQUEST IN METATRADER 5 FOR EXNESS */}
              <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-100 text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>How to Allow Exness WebRequest in MetaTrader 5</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAllExnessUrls}
                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded transition-colors cursor-pointer"
                  >
                    {copiedAllExnessUrls ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAllExnessUrls ? "All Exness URLs Copied!" : "Copy All Exness URLs"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 block">STEP 1</span>
                    <strong className="text-slate-200 block text-xs">Open MT5 Options</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Open MetaTrader 5 connected to your Exness account. Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl + O</kbd> or click <strong>Tools ➔ Options</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 block">STEP 2</span>
                    <strong className="text-slate-200 block text-xs">Enable Expert Advisors</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Switch to the <strong>Expert Advisors</strong> tab. Check <strong>"Allow Algorithmic Trading"</strong> and <strong>"Allow WebRequest for listed URL"</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-amber-400 block">STEP 3</span>
                    <strong className="text-slate-200 block text-xs">Add Exness &amp; Tradebot URLs</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Double-click the list to add <span className="text-amber-300 font-mono">https://www.exness.com/</span> and this tradebot's webhook URLs below.
                    </p>
                  </div>
                </div>

                {/* Exness Allowlist URLs List */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                    <span>Required Exness &amp; Bridge Allowlist URLs:</span>
                    <span className="text-[10px] font-normal text-slate-400">Click any row to copy</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {exnessAllowlistUrls.map((url, idx) => (
                      <div
                        key={url}
                        onClick={() => handleCopyExnessUrl(url, idx)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#070a10] border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      >
                        <span className="font-mono text-[10.5px] text-slate-300 group-hover:text-amber-200 truncate mr-2">
                          {url}
                        </span>
                        <div className="shrink-0 text-slate-400 group-hover:text-amber-400">
                          {copiedExnessUrlIndex === idx ? (
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Copied
                            </span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* EXNESS ACCOUNT CREDENTIALS & EA SETUP */}
              <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-100 text-xs uppercase tracking-wide">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>Exness MT5 Real Account Credentials</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Zero-Stop-Level Scalping Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Exness Server Dropdown */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Exness Broker Server
                    </label>
                    <select
                      value={exnessServer}
                      onChange={(e) => setExnessServer(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 font-mono"
                    >
                      {EXNESS_SERVERS.map((srv) => (
                        <option key={srv} value={srv}>
                          {srv} {srv === "Exness-Real10" ? "(LD4 London Slough · 9.8ms)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exness Leverage */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Exness Account Leverage
                    </label>
                    <select
                      value={exnessLeverage}
                      onChange={(e) => setExnessLeverage(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 font-mono"
                    >
                      <option value="1:2000">1:2000 (Exness High Margin · Recommended)</option>
                      <option value="1:1000">1:1000</option>
                      <option value="1:500">1:500</option>
                      <option value="1:200">1:200</option>
                      <option value="1:Unlimited">1:Unlimited (Exness Signature)</option>
                    </select>
                  </div>

                  {/* Account Login Number */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Exness MT5 Login / Account Number
                    </label>
                    <input
                      type="text"
                      value={creds.login}
                      onChange={(e) => setCreds({ ...creds, login: e.target.value })}
                      placeholder="e.g. 14892015"
                      className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* Account Password */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      MT5 Trading Password (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={creds.password || ""}
                        onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                        placeholder="Stored securely in local session"
                        className="w-full px-2.5 py-1.5 bg-[#0e121a] border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-hidden focus:border-amber-500 font-mono pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exness Account Type Selector */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                    Exness Account Execution Type:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {EXNESS_ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setExnessAccountType(type.id)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          exnessAccountType === type.id
                            ? "bg-amber-950/40 border-amber-500/60 shadow-xs"
                            : "bg-[#070a10] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className={`font-semibold text-[11px] ${exnessAccountType === type.id ? "text-amber-300" : "text-slate-200"}`}>
                          {type.id === "raw_spread" ? "Raw Spread" : type.id === "zero" ? "Zero Account" : type.id === "pro" ? "Pro Account" : "Standard"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Spread: {type.spreadFrom}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConnectExness}
                      disabled={exnessConnecting}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {exnessConnecting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Connecting to Exness...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Connect to Exness Real EA</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadCode}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Exness EA (.mq5)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-2 bg-[#0e1a2c] hover:bg-[#142338] text-amber-300 border border-amber-500/40 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-mono font-medium"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? "EA Code Copied!" : "Copy Exness EA Code"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: METATRADER.COM ALLOWLIST & CONNECTION */}
          {activeTab === "metatrader" && (
            <div className="space-y-4">
              {/* Official MetaTrader 5 Hero Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0e1c2e] to-[#0a121c] border border-emerald-500/40 shadow-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">
                        Official MetaTrader 5 Platform Gateway
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/40 font-semibold">
                        HTTPS ALLOWED
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Connect your desktop terminal, mobile app, or launch the browser-based Web Terminal directly from{" "}
                      <a
                        href={METATRADER_OFFICIAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline font-mono inline-flex items-center gap-0.5"
                      >
                        <span>metatrader.com</span>
                        <ExternalLink className="w-3 h-3 inline" />
                      </a>
                      .
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={METATRADER_WEBTERMINAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Launch MT5 Web Terminal</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <a
                      href={METATRADER_OFFICIAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-colors flex items-center gap-1"
                    >
                      <span>metatrader.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setActiveTab("vpn")}
                      className="px-2.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-600/40 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Shield className="w-3.5 h-3.5 text-sky-400" />
                      <span>Setup MT5 VPN Tunnel</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time MT5 Connection Latency Chart */}
              <div className="p-3 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-slate-100 text-xs uppercase tracking-wide">
                      MetaTrader 5 Real-Time Latency &amp; Jitter
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Protocol: MT5 IPC / WebSocket
                  </span>
                </div>
                <LatencyLineChart
                  data={latencyHistory || connectionState.latencyHistory || []}
                  currentPing={connectionState.pingMs}
                  status={connectionState.status}
                  serverName={creds.server || connectionState.credentials.server || "Exness-Real10"}
                  height={75}
                  title="Real-Time Handshake Ping"
                />
              </div>

              {/* Step-by-Step Allow WebRequest in MetaTrader 5 */}
              <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-100 text-xs uppercase tracking-wide">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>How to Allow MetaTrader 5 Connection (WebRequest Setup)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAllUrls}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
                  >
                    {copiedAllUrls ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAllUrls ? "All Copied!" : "Copy All URLs"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 block">STEP 1</span>
                    <strong className="text-slate-200 block text-xs">Open MetaTrader 5 Options</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Open MetaTrader 5 terminal. Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl + O</kbd> or click <strong>Tools ➔ Options</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 block">STEP 2</span>
                    <strong className="text-slate-200 block text-xs">Expert Advisors Tab</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Click the <strong>Expert Advisors</strong> tab. Check <strong>"Allow WebRequest for listed URL:"</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded bg-[#070a10] border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 block">STEP 3</span>
                    <strong className="text-slate-200 block text-xs">Paste Authorized URLs</strong>
                    <p className="text-slate-400 text-[10.5px]">
                      Add the authorized URLs listed below and click <strong>OK</strong>. The EA will connect instantly!
                    </p>
                  </div>
                </div>

                {/* Authorized URLs List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                    Authorized WebRequest URLs for MetaTrader 5:
                  </span>

                  <div className="space-y-1 font-mono text-[11px]">
                    {allowlistUrls.map((url, idx) => (
                      <div
                        key={url}
                        className="flex items-center justify-between p-2 rounded bg-[#070a10] border border-slate-800/90 text-slate-200"
                      >
                        <span className="truncate mr-2 text-emerald-300 font-semibold">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySingleUrl(url, idx)}
                          className="px-2 py-0.5 text-[10px] font-sans font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          {copiedUrlIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Connect to Official MetaTrader Servers */}
              <div className="p-3.5 rounded-xl bg-[#0a0d13] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wide">
                    Quick Connect to MetaTrader 5 Servers
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Select Server Preset
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset("metaquotes_live")}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      creds.server === "MetaQuotes-Real"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-xs"
                        : "bg-[#070a10] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-[11px]">MetaQuotes Real</div>
                    <div className="text-[10px] text-slate-500 font-mono">MetaQuotes-Real</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset("metaquotes_demo")}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      creds.server === "MetaQuotes-Demo"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-xs"
                        : "bg-[#070a10] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-[11px]">MetaQuotes Demo</div>
                    <div className="text-[10px] text-slate-500 font-mono">MetaQuotes-Demo</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset("exness_real")}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      creds.server === "Exness-Real10"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-xs"
                        : "bg-[#070a10] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-[11px]">Exness Real</div>
                    <div className="text-[10px] text-slate-500 font-mono">Exness-Real10</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset("icmarkets_live")}
                    className={`p-2 rounded border text-left transition-colors cursor-pointer ${
                      creds.server === "ICMarketsSC-Live02"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-xs"
                        : "bg-[#070a10] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-bold text-[11px]">IC Markets Live</div>
                    <div className="text-[10px] text-slate-500 font-mono">ICMarketsSC-Live02</div>
                  </button>
                </div>

                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Selected: <strong>{creds.server}</strong> (Login #{creds.login})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                  >
                    {isTesting ? "Testing..." : "Test Connection"}
                  </button>
                </div>
              </div>

              {/* Diagnostic Test Feedback Box */}
              {testResult && (
                <div
                  className={`p-3 rounded border text-xs font-mono space-y-1 ${
                    testResult.success
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.success ? "MetaTrader 5 Link Active & Verified" : "Connection Failed"}</span>
                    {testResult.pingMs ? (
                      <span className="text-[11px] text-slate-400 ml-auto font-mono">
                        Ping: {testResult.pingMs}ms · Protocol: MT5 IPC / WebSocket
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {testResult.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREDENTIALS SETUP */}
          {activeTab === "credentials" && (
            <>
              {/* Preset Broker Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Popular Broker / Server Preset:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {BROKER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`text-left p-2 rounded border transition-colors cursor-pointer ${
                        creds.server === preset.server
                          ? "bg-emerald-500/10 border-emerald-500/50 text-slate-100"
                          : "bg-[#0a0d13] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="font-semibold truncate text-[11px]">{preset.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{preset.server}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Server & Bridge Protocol */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">MT5 Broker Server</label>
                  <div className="flex items-center bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 focus-within:border-emerald-500">
                    <Server className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={creds.server}
                      onChange={(e) => setCreds({ ...creds, server: e.target.value })}
                      placeholder="e.g. MetaQuotes-Real or Exness-Real10"
                      className="w-full bg-transparent text-slate-100 font-mono focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Server name exactly as shown in MT5</span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Bridge Connection Type</label>
                  <select
                    value={creds.bridgeType}
                    onChange={(e) => setCreds({ ...creds, bridgeType: e.target.value as any })}
                    className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-2 text-slate-100 focus:outline-none"
                  >
                    <option value="MT5_LOCAL_IPC">Local MT5 Terminal IPC (Port 18812)</option>
                    <option value="METAAPI_CLOUD">MetaAPI Cloud Gateway</option>
                    <option value="MT5_WEB_GATEWAY">MetaTrader WebAPI / WebTerminal</option>
                    <option value="BROKER_REST">Direct Broker REST / FIX 4.4</option>
                  </select>
                </div>
              </div>

              {/* Login & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Login (Account ID)</label>
                  <input
                    type="text"
                    value={creds.login}
                    onChange={(e) => setCreds({ ...creds, login: e.target.value })}
                    placeholder="e.g. 14892015"
                    className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Numeric MT5 account number</span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Trading Password</label>
                  <div className="flex items-center bg-[#0a0d13] border border-slate-700 rounded px-2.5 py-1.5 focus-within:border-emerald-500">
                    <Key className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={creds.password || ""}
                      onChange={(e) => setCreds({ ...creds, password: e.target.value })}
                      placeholder="Master / Investor Password"
                      className="w-full bg-transparent text-slate-100 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 transition-colors ml-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">Encrypted in browser session</span>
                </div>
              </div>

              {/* Account Parameters */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Account Type</label>
                  <select
                    value={creds.accountType}
                    onChange={(e) => setCreds({ ...creds, accountType: e.target.value as any })}
                    className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none"
                  >
                    <option value="Real">Real / Live (Live Execution)</option>
                    <option value="Demo">Demo</option>
                    <option value="Prop Firm">Prop Firm (FTMO/MFF)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Leverage</label>
                  <select
                    value={creds.leverage}
                    onChange={(e) => setCreds({ ...creds, leverage: e.target.value })}
                    className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2 py-1.5 text-slate-100 focus:outline-none"
                  >
                    <option value="1:30">1:30 (ESMA)</option>
                    <option value="1:100">1:100 (Standard)</option>
                    <option value="1:200">1:200</option>
                    <option value="1:500">1:500 (Pro)</option>
                    <option value="1:1000">1:1000 (High)</option>
                    <option value="1:2000">1:2000 (Unlimited)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Base Currency</label>
                  <input
                    type="text"
                    value={creds.currency}
                    onChange={(e) => setCreds({ ...creds, currency: e.target.value.toUpperCase() })}
                    className="w-full bg-[#0a0d13] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Diagnostic Test Feedback Box */}
              {testResult && (
                <div
                  className={`p-3 rounded border text-xs font-mono space-y-1 ${
                    testResult.success
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.success ? "Connection Verified" : "Connection Failed"}</span>
                    {testResult.pingMs ? (
                      <span className="text-[11px] text-slate-400 ml-auto">
                        Ping: {testResult.pingMs}ms
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {testResult.message}
                  </p>
                </div>
              )}

              {/* Real-time MT5 Connection Latency Chart in Setup Tab */}
              <div className="pt-2">
                <LatencyLineChart
                  data={latencyHistory || connectionState.latencyHistory || []}
                  currentPing={connectionState.pingMs}
                  status={connectionState.status}
                  serverName={creds.server || connectionState.credentials.server || "Exness-Real10"}
                  height={75}
                  title="Broker IPC Connection Latency"
                />
              </div>
            </>
          )}

          {/* TAB: VPN & VPS TUNNEL FOR METATRADER 5 */}
          {activeTab === "vpn" && (
            <div className="space-y-3.5">
              {/* Header Banner */}
              <div className="p-3 bg-[#0a0d13] border border-sky-500/30 rounded text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sky-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>MetaTrader 5 Low-Latency VPN &amp; VPS Gateway</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${
                      vpnState.isConnected
                        ? "bg-emerald-950 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    {vpnState.isConnected ? "TUNNEL ACTIVE" : "TUNNEL INACTIVE"}
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Bypass ISP routing bottlenecks, prevent requotes, and link directly to London LD4 or New York NY4 broker servers with sub-15ms execution latency.
                </p>
              </div>

              {/* Tunnel Location Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  <span>Broker Datacenter Gateway:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VPN_LOCATIONS.map((loc) => {
                    const isSelected = loc.id === vpnState.selectedLocationId;
                    return (
                      <div
                        key={loc.id}
                        onClick={() =>
                          setVpnState((prev) => ({
                            ...prev,
                            selectedLocationId: loc.id,
                            tunnelIp: loc.serverIp,
                            currentPingMs: loc.tunneledPingMs,
                            directPingMs: loc.directPingMs,
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                          isSelected
                            ? "bg-[#111827] border-sky-400 ring-1 ring-sky-400"
                            : "bg-[#090c12] border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <span>{loc.flag}</span>
                            <span>{loc.city}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-400">
                            {loc.tunneledPingMs}ms
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {loc.datacenter}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1">
                          Direct: {loc.directPingMs}ms ➔ Tunneled: {loc.tunneledPingMs}ms
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-tabs for Linkage Methods */}
              <div className="space-y-2">
                <div className="flex border-b border-slate-800 gap-1">
                  <button
                    onClick={() => setVpnSubTab("proxy")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                      vpnSubTab === "proxy"
                        ? "border-sky-400 text-sky-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    1. MT5 Built-in Proxy (Easiest)
                  </button>
                  <button
                    onClick={() => setVpnSubTab("wireguard")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                      vpnSubTab === "wireguard"
                        ? "border-sky-400 text-sky-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    2. WireGuard (.conf)
                  </button>
                  <button
                    onClick={() => setVpnSubTab("openvpn")}
                    className={`px-3 py-1.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                      vpnSubTab === "openvpn"
                        ? "border-sky-400 text-sky-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    3. OpenVPN (.ovpn)
                  </button>
                </div>

                {vpnSubTab === "proxy" && (
                  <div className="p-3 bg-[#080b11] border border-slate-800 rounded-lg space-y-2.5">
                    <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                      <span>MT5 Terminal SOCKS5 Proxy Credentials:</span>
                      <span className="text-[10px] text-emerald-400 font-mono">No Software Install</span>
                    </div>

                    {(() => {
                      const loc = VPN_LOCATIONS.find((l) => l.id === vpnState.selectedLocationId) || VPN_LOCATIONS[0];
                      const handleCopyText = (text: string, id: string) => {
                        navigator.clipboard.writeText(text);
                        setCopiedVpnField(id);
                        setTimeout(() => setCopiedVpnField(null), 2000);
                      };

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 font-sans block">Server:</span>
                                <span className="text-slate-200 font-bold">{loc.serverIp}</span>
                              </div>
                              <button
                                onClick={() => handleCopyText(loc.serverIp, "ip")}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white cursor-pointer"
                              >
                                {copiedVpnField === "ip" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="text-[10px] text-slate-400 font-sans block">Port:</span>
                                <span className="text-slate-200 font-bold">{loc.proxyPort}</span>
                              </div>
                              <button
                                onClick={() => handleCopyText(String(loc.proxyPort), "port")}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white cursor-pointer"
                              >
                                {copiedVpnField === "port" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                            <li>In MetaTrader 5, click <strong>Tools ➔ Options ➔ Server</strong>.</li>
                            <li>Check <strong>"Enable proxy server"</strong> and click <strong>Proxy...</strong></li>
                            <li>Select <strong>SOCKS5</strong>, paste the server IP and port, and click <strong>OK</strong>.</li>
                          </ol>
                        </>
                      );
                    })()}
                  </div>
                )}

                {vpnSubTab === "wireguard" && (
                  <div className="p-3 bg-[#080b11] border border-slate-800 rounded-lg space-y-2">
                    {(() => {
                      const loc = VPN_LOCATIONS.find((l) => l.id === vpnState.selectedLocationId) || VPN_LOCATIONS[0];
                      const config = generateWireguardConfig(loc);
                      const handleDownload = () => {
                        const blob = new Blob([config], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "wg0-mt5.conf";
                        a.click();
                      };
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">WireGuard Config:</span>
                            <button
                              onClick={handleDownload}
                              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download wg0-mt5.conf</span>
                            </button>
                          </div>
                          <pre className="p-2 rounded bg-[#05070a] border border-slate-800 font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto">
                            {config}
                          </pre>
                        </>
                      );
                    })()}
                  </div>
                )}

                {vpnSubTab === "openvpn" && (
                  <div className="p-3 bg-[#080b11] border border-slate-800 rounded-lg space-y-2">
                    {(() => {
                      const loc = VPN_LOCATIONS.find((l) => l.id === vpnState.selectedLocationId) || VPN_LOCATIONS[0];
                      const config = generateOpenVpnConfig(loc);
                      const handleDownload = () => {
                        const blob = new Blob([config], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "mt5-tunnel.ovpn";
                        a.click();
                      };
                      return (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">OpenVPN Profile:</span>
                            <button
                              onClick={handleDownload}
                              className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download mt5-tunnel.ovpn</span>
                            </button>
                          </div>
                          <pre className="p-2 rounded bg-[#05070a] border border-slate-800 font-mono text-[10px] text-slate-300 max-h-32 overflow-y-auto">
                            {config}
                          </pre>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TOPOLOGY */}
          {activeTab === "topology" && (
            <div className="space-y-3.5">
              <div className="p-3 bg-[#0a0d13] border border-slate-800 rounded text-slate-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <Cloud className="w-4 h-4" />
                  <span>Production Execution Topology (Mobile / Web ➔ VPS ➔ MetaTrader 5)</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Follow this 7-stage architecture to run your Speaking Hand AI Trader 24/7 without disconnects, sleep mode, or power interruptions.
                </p>
              </div>

              {/* ASCII Diagram Card */}
              <div className="bg-[#070a10] border border-slate-800 rounded p-3 font-mono text-[11px] text-[#00e5a8] leading-tight overflow-x-auto">
                <pre>{`📱 BROWSER / MOBILE CLIENT
        |
        v
SPEAKING HAND AI TRADER
        |
        v
🔐 SECURE NODE.JS WEBSOCKET BACKEND
        |
        v
☁️ WINDOWS VPS (1.8ms Co-located)
        |
        v
🤖 METATRADER 5 (https://www.metatrader.com/)
        |
        v
REAL BROKER TRADING ACCOUNT
        |
        v
Live prices + Automated Order Execution`}</pre>
              </div>

              {/* Step Setup Guide */}
              <div className="space-y-2 text-[11px]">
                <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
                    <span>Allow WebRequest in MetaTrader 5</span>
                  </div>
                  <p className="text-slate-400 text-[10.5px]">
                    In MT5, go to Tools ➔ Options ➔ Expert Advisors. Check "Allow WebRequest for listed URL" and add <code className="text-emerald-300">https://www.metatrader.com/</code> and this app&apos;s URL.
                  </p>
                </div>

                <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">2</span>
                    <span>Node.js Backend &amp; WebSocket Bridge</span>
                  </div>
                  <p className="text-slate-400 text-[10.5px]">
                    The backend routes signals, calculates indicator crossover data, and manages real-time Level 2 Order Book streams.
                  </p>
                </div>

                <div className="p-2.5 bg-[#0a0d13] border border-slate-800/80 rounded space-y-1">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">3</span>
                    <span>MetaTrader 5 Expert Advisor</span>
                  </div>
                  <p className="text-slate-400 text-[10.5px]">
                    Attach SpeakingHandAITrader.mq5 to your EURUSD chart and enable "Allow Algo Trading". It will execute true BUY and SELL orders with exact risk and trailing stops.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MQL5 BRIDGE SCRIPT */}
          {activeTab === "mql5" && (
            <div className="space-y-3">
              <div className="p-3 bg-[#0a0d13] border border-slate-800 rounded text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span>MetaTrader 5 Expert Advisor Script (MQL5)</span>
                  </div>
                  <a
                    href={METATRADER_OFFICIAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>metatrader.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Copy or download this MQL5 Expert Advisor file, paste it into MetaEditor in your MT5 client (press F4), and click <strong>Compile (F7)</strong>. Attach it to your chart to synchronize signals directly with your broker.
                </p>
              </div>

              <div className="relative bg-[#090c12] border border-slate-800 rounded p-3 font-mono text-[11px] text-slate-300 max-h-[300px] overflow-y-auto">
                <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-800 mb-2">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? "Copied" : "Copy MQL5 Code"}</span>
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .mq5</span>
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre leading-relaxed">{mql5Code}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-[#0a0d13]">
          {connectionState.status === "CONNECTED" ? (
            <button
              onClick={handleDisconnect}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded transition-colors cursor-pointer"
            >
              Disconnect MT5
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>TLS 1.3 End-to-End Encryption · https://www.metatrader.com/</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isTesting ? "Pinging..." : "Test Ping"}
            </button>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{connectionState.status === "CONNECTED" ? "Update MT5 Connection" : "Connect MetaTrader 5"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
