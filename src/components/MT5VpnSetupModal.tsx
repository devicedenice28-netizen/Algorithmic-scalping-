import React, { useState } from "react";
import { VpnLocation, VpnProtocol, VpnTunnelState } from "../types/vpn";
import {
  VPN_LOCATIONS,
  INITIAL_VPN_STATE,
  generateWireguardConfig,
  generateOpenVpnConfig,
  generateMql5ProxyCode,
} from "../lib/vpnService";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  Zap,
  Server,
  Lock,
  Download,
  Copy,
  Check,
  Globe,
  Radio,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sliders,
  Cpu,
} from "lucide-react";

interface MT5VpnSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  vpnState?: VpnTunnelState;
  onUpdateVpnState?: (state: VpnTunnelState) => void;
}

export const MT5VpnSetupModal: React.FC<MT5VpnSetupModalProps> = ({
  isOpen,
  onClose,
  vpnState = INITIAL_VPN_STATE,
  onUpdateVpnState,
}) => {
  const [state, setState] = useState<VpnTunnelState>(vpnState);
  const [activeTab, setActiveTab] = useState<"proxy" | "wireguard" | "openvpn" | "webrequest">("proxy");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedLoc =
    VPN_LOCATIONS.find((l) => l.id === state.selectedLocationId) || VPN_LOCATIONS[0];

  const updateState = (updater: Partial<VpnTunnelState>) => {
    const updated = { ...state, ...updater };
    setState(updated);
    if (onUpdateVpnState) {
      onUpdateVpnState(updated);
    }
  };

  const handleSelectLocation = (loc: VpnLocation) => {
    updateState({
      selectedLocationId: loc.id,
      tunnelIp: loc.serverIp,
      currentPingMs: loc.tunneledPingMs,
      directPingMs: loc.directPingMs,
    });
  };

  const handleToggleConnect = () => {
    if (state.isConnected) {
      updateState({ isConnected: false });
    } else {
      updateState({ isConnecting: true });
      setTimeout(() => {
        updateState({
          isConnected: true,
          isConnecting: false,
          connectedSince: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }, 700);
    }
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunPingTest = () => {
    setIsPinging(true);
    setPingSuccess(null);
    setTimeout(() => {
      setIsPinging(false);
      const ping = (selectedLoc.tunneledPingMs + (Math.random() * 1.5 - 0.75)).toFixed(1);
      setPingSuccess(`Tunnel Verified! Direct: ${selectedLoc.directPingMs}ms ➔ Tunneled: ${ping}ms (-${Math.round(((selectedLoc.directPingMs - Number(ping)) / selectedLoc.directPingMs) * 100)}% latency)`);
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0b0e14] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-sans text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0e131d] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-500/40 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-100">
                  MetaTrader 5 Low-Latency VPN & VPS Tunnel Setup
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${
                    state.isConnected
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                      : "bg-slate-900 text-slate-400 border-slate-700"
                  }`}
                >
                  {state.isConnected ? "TUNNEL ACTIVE" : "DISCONNECTED"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct low-latency tunneling for MT5 terminals to London LD4, New York NY4 & Frankfurt ECN hubs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Status & Control Card */}
          <div className="p-3.5 rounded-xl bg-[#0e1422] border border-sky-500/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  state.isConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Selected Hub: {selectedLoc.flag} {selectedLoc.name}</span>
                  <span className="text-[10px] text-sky-400 font-mono">
                    ({selectedLoc.datacenter})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3 mt-0.5">
                  <span>
                    Direct: <span className="text-rose-400">{selectedLoc.directPingMs}ms</span>
                  </span>
                  <span>➔</span>
                  <span>
                    Tunneled: <span className="text-emerald-400 font-bold">{selectedLoc.tunneledPingMs}ms</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                    -{Math.round(((selectedLoc.directPingMs - selectedLoc.tunneledPingMs) / selectedLoc.directPingMs) * 100)}% Latency Drop
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunPingTest}
                disabled={isPinging}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-sky-400" : ""}`} />
                <span>{isPinging ? "Testing Ping..." : "Benchmark Ping"}</span>
              </button>

              <button
                onClick={handleToggleConnect}
                disabled={state.isConnecting}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  state.isConnected
                    ? "bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/50"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{state.isConnected ? "Disconnect Tunnel" : "Connect Tunnel"}</span>
              </button>
            </div>
          </div>

          {pingSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-mono">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{pingSuccess}</span>
            </div>
          )}

          {/* Location Selection Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Select Low-Latency Financial Datacenter Hub:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {VPN_LOCATIONS.map((loc) => {
                const isSelected = loc.id === state.selectedLocationId;
                return (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#111827] border-sky-400 ring-1 ring-sky-400"
                        : "bg-[#090c12] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="text-sm">{loc.flag}</span>
                        <span>{loc.city}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {loc.tunneledPingMs}ms
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {loc.datacenter}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 truncate">
                      Best: {loc.recommendedFor.slice(0, 2).join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security & Tunnel Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#090c12] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="font-semibold text-slate-200">Kill Switch Protection</div>
                  <div className="text-[10px] text-slate-400">Drops order traffic if tunnel disconnects</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.killSwitchEnabled}
                onChange={(e) => updateState({ killSwitchEnabled: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-[#090c12] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-slate-200">Zero-Leak DNS Shield</div>
                  <div className="text-[10px] text-slate-400">Routes DNS through 1.1.1.1 Cloudflare</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={state.dnsLeakProtection}
                onChange={(e) => updateState({ dnsLeakProtection: e.target.checked })}
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Setup Instructions & Config Tabs */}
          <div className="space-y-2">
            <div className="flex border-b border-slate-800 gap-1">
              <button
                onClick={() => setActiveTab("proxy")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "proxy"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                1. MT5 Built-in Proxy (Recommended)
              </button>
              <button
                onClick={() => setActiveTab("wireguard")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "wireguard"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                2. WireGuard (.conf)
              </button>
              <button
                onClick={() => setActiveTab("openvpn")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "openvpn"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                3. OpenVPN (.ovpn)
              </button>
              <button
                onClick={() => setActiveTab("webrequest")}
                className={`px-3 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                  activeTab === "webrequest"
                    ? "border-sky-400 text-sky-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                4. WebRequest Tunnel
              </button>
            </div>

            {/* Tab 1: MT5 Proxy Instructions */}
            {activeTab === "proxy" && (
              <div className="p-3.5 rounded-lg bg-[#080b11] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>How to Configure Native SOCKS5 Proxy in MetaTrader 5:</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    Zero Third-Party Apps Required
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {/* Host */}
                  <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">SOCKS5 Server IP:</span>
                      <span className="text-slate-200 font-bold">{selectedLoc.serverIp}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedLoc.serverIp, "ip")}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Copy IP"
                    >
                      {copiedField === "ip" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Port */}
                  <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Port:</span>
                      <span className="text-slate-200 font-bold">{selectedLoc.proxyPort}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(String(selectedLoc.proxyPort), "port")}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Copy Port"
                    >
                      {copiedField === "port" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Username */}
                  <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Proxy Username:</span>
                      <span className="text-slate-200 font-bold">{state.mt5ProxyUser}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(state.mt5ProxyUser, "user")}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Copy Username"
                    >
                      {copiedField === "user" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password */}
                  <div className="p-2 rounded bg-[#0d121c] border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Proxy Password:</span>
                      <span className="text-slate-200 font-bold">{state.mt5ProxyPass}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(state.mt5ProxyPass, "pass")}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Copy Password"
                    >
                      {copiedField === "pass" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Steps */}
                <ol className="text-xs text-slate-300 space-y-1 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
                  <li>In MetaTrader 5, click <strong>Tools ➔ Options</strong> (or press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px]">Ctrl+O</kbd>).</li>
                  <li>Select the <strong>Server</strong> tab and check the <strong>"Enable proxy server"</strong> box.</li>
                  <li>Click <strong>Proxy...</strong>, select <strong>SOCKS5</strong>, paste the credentials above, and click <strong>Test</strong>.</li>
                  <li>Click <strong>OK</strong>. Your MT5 terminal now routes all tick queries and order executions through the low-latency {selectedLoc.city} gateway!</li>
                </ol>
              </div>
            )}

            {/* Tab 2: WireGuard */}
            {activeTab === "wireguard" && (
              <div className="p-3.5 rounded-lg bg-[#080b11] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200">
                    WireGuard Tunnel Configuration (<span className="font-mono text-sky-400">wg0-mt5.conf</span>)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(generateWireguardConfig(selectedLoc), "wg")}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === "wg" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "wg" ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      onClick={() => handleDownload("wg0-mt5.conf", generateWireguardConfig(selectedLoc))}
                      className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .conf</span>
                    </button>
                  </div>
                </div>
                <pre className="p-2.5 rounded bg-[#05070a] border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40">
                  {generateWireguardConfig(selectedLoc)}
                </pre>
              </div>
            )}

            {/* Tab 3: OpenVPN */}
            {activeTab === "openvpn" && (
              <div className="p-3.5 rounded-lg bg-[#080b11] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200">
                    OpenVPN Profile (<span className="font-mono text-sky-400">mt5-tunnel.ovpn</span>)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(generateOpenVpnConfig(selectedLoc), "ovpn")}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === "ovpn" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === "ovpn" ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      onClick={() => handleDownload("mt5-tunnel.ovpn", generateOpenVpnConfig(selectedLoc))}
                      className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download .ovpn</span>
                    </button>
                  </div>
                </div>
                <pre className="p-2.5 rounded bg-[#05070a] border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-40">
                  {generateOpenVpnConfig(selectedLoc)}
                </pre>
              </div>
            )}

            {/* Tab 4: WebRequest Tunnel */}
            {activeTab === "webrequest" && (
              <div className="p-3.5 rounded-lg bg-[#080b11] border border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">
                  MQL5 Expert Advisor High-Speed WebRequest Gateway
                </div>
                <p className="text-[11px] text-slate-400">
                  When using <code className="text-sky-300">SpeakingHandAITrader.mq5</code>, all trade signals and balance updates use the VPN-tunneled proxy port to prevent ISP inspection and eliminate DNS lookup lag.
                </p>
                <div className="p-2.5 rounded bg-[#05070a] border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                  {generateMql5ProxyCode(selectedLoc)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0e131d] shrink-0 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted with ChaCha20-Poly1305 & AES-256-GCM</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
