import React from "react";
import { Zap, HelpCircle, Radio, WifiOff, Shield, Globe, Volume2, VolumeX } from "lucide-react";
import { MT5ConnectionState } from "../types/broker";

interface HeaderNavProps {
  onRunInstantBacktest: () => void;
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenBrokerModal: () => void;
  onOpenVpnModal?: () => void;
  isVpnConnected?: boolean;
  connectionState: MT5ConnectionState;
  onOpenAuth?: () => void;
  currentUser?: { id: number; email: string; token: string } | null;
  onOpenSentimentModal?: () => void;
  sentimentScore?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onRunInstantBacktest,
  onOpenSettings,
  onOpenGuide,
  onOpenBrokerModal,
  onOpenVpnModal,
  isVpnConnected = true,
  connectionState,
  onOpenAuth,
  currentUser,
  onOpenSentimentModal,
  sentimentScore,
  soundEnabled = true,
  onToggleSound,
}) => {
  const isConnected = connectionState.status === "CONNECTED";

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-3 border-b border-slate-800/80 bg-[#0c1017]">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="#"
          className="text-base font-bold tracking-tight text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <div className="w-2.5 h-2.5 rounded-xs bg-[#00e5a8] rotate-45" />
          <span className="text-[#00e5a8] font-black tracking-wide">SPEAKING HAND AI TRADER</span>
        </a>
        <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
          MT5 Forex Autopilot · EMA(9/21) · RSI(14)
        </span>
      </div>

      {/* Zone 2: 4 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => {
            const el = document.getElementById("terminal-view");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Terminal
        </button>
        <button
          onClick={() => {
            const el = document.getElementById("analytics-view");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Risk & Analytics
        </button>
        <button
          onClick={onOpenSettings}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Bot Config
        </button>
        <button
          onClick={onOpenGuide}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Rules Guide</span>
        </button>
        <a
          href="https://www.exness.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-amber-200 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-semibold shadow-xs"
          title="Official Exness Global Broker Gateway (https://www.exness.com/) - Real Algorithmic Trading EA"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>exness.com</span>
        </a>
        <a
          href="https://www.metatrader.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
          title="Official MetaTrader 5 Platform Gateway (metatrader.com)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>metatrader.com</span>
        </a>
        <button
          onClick={onOpenVpnModal || onOpenBrokerModal}
          className="hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-500/30 text-sky-300 font-mono text-[11px] cursor-pointer"
          title="MetaTrader 5 Low-Latency VPN & VPS Tunnel (London LD4 / NY4)"
        >
          <Shield className="w-3 h-3 text-sky-400" />
          <span>VPN: LD4 (9ms)</span>
        </button>
        {onOpenSentimentModal && (
          <button
            onClick={onOpenSentimentModal}
            className="hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] cursor-pointer"
            title="Google Search Grounded Market Sentiment & Macro News Analysis"
          >
            <Globe className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>Sentiment: {typeof sentimentScore === "number" ? `${sentimentScore >= 0 ? "+" : ""}${sentimentScore}` : "Bullish"}</span>
          </button>
        )}
      </nav>

      {/* Zone 3: MT5 Broker Connection & Primary Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenBrokerModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            isConnected
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
              : "bg-[#0a0d13] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
          }`}
          title="Configure MT5 and Broker connection"
        >
          {isConnected ? (
            <>
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">
                MT5: {connectionState.credentials.server} (#{connectionState.credentials.login})
              </span>
              {connectionState.pingMs ? (
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  · {connectionState.pingMs}ms
                </span>
              ) : null}
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Connect MT5 / Broker</span>
            </>
          )}
        </button>

        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentUser
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-[#0a0d13] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
            title="EA ALGOPRO JWT User Account"
          >
            <span className="w-2 h-2 rounded-full bg-[#00e5a8]" />
            <span className="font-mono text-[11px]">
              {currentUser ? currentUser.email.split("@")[0] : "EA ALGOPRO Login"}
            </span>
          </button>
        )}

        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              soundEnabled
                ? "bg-purple-500/10 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 shadow-xs"
                : "bg-[#0a0d13] border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            }`}
            title={soundEnabled ? "Audio Alerts: ON (Open/TP/SL sounds active) - Click to mute" : "Audio Alerts: MUTED - Click to enable sounds"}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="font-mono text-[11px] hidden sm:inline">Audio: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-mono text-[11px] hidden sm:inline">Audio: OFF</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onRunInstantBacktest}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs hover:shadow-emerald-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Run Backtest</span>
        </button>
      </div>
    </header>
  );
};
