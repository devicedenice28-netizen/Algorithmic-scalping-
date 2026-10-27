import React from "react";
import { X, CheckCircle, ShieldAlert, Cpu } from "lucide-react";

interface RulesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesGuideModal: React.FC<RulesGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-[#0e121a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0a0d13]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Bot Strategy & Mathematical Logic
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* Rule 1: Signal Conditions */}
          <div className="p-3 rounded-lg bg-[#0a0d13] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>1. Signal Identification Logic</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The simulator computes Exponential Moving Averages (Fast = 9, Slow = 21) using continuous exponential weighting:
            </p>
            <div className="p-2 bg-[#121722] rounded font-mono text-[11px] text-slate-200">
              Multiplier = 2 / (Period + 1)
              <br />
              EMA = (Price - Previous EMA) × Multiplier + Previous EMA
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                <strong className="text-emerald-400">BUY Signal:</strong> Fast EMA crosses above Slow EMA AND RSI(14) &lt; 70 (avoids buying at overbought peaks).
              </li>
              <li>
                <strong className="text-rose-400">SELL Signal:</strong> Fast EMA crosses below Slow EMA AND RSI(14) &gt; 30 (avoids selling into oversold bottoms).
              </li>
            </ul>
          </div>

          {/* Rule 2: Risk Management & Position Sizing */}
          <div className="p-3 rounded-lg bg-[#0a0d13] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>2. Risk Sizing & Unit Allocation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Rather than fixed lot sizes, units are sized dynamically according to the trader’s account balance and stop loss distance:
            </p>
            <div className="p-2 bg-[#121722] rounded font-mono text-[11px] text-slate-200">
              Risk Amount = Balance × (RiskPercent / 100)
              <br />
              Units = Risk Amount / Stop Distance
            </div>
            <p className="text-slate-400">
              This guarantees that if the Stop Loss is triggered, the loss is strictly capped at your configured risk percent (e.g., 1%).
            </p>
          </div>

          {/* Rule 3: Max Drawdown Circuit Breaker */}
          <div className="p-3 rounded-lg bg-[#0a0d13] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>3. Max Drawdown Circuit Breaker</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              The bot continuously tracks the highest recorded balance (<code className="text-slate-200 font-mono">peakBalance</code>).
            </p>
            <div className="p-2 bg-[#121722] rounded font-mono text-[11px] text-slate-200">
              Drawdown % = ((Peak Balance - Current Balance) / Peak Balance) × 100
            </div>
            <p className="text-slate-400">
              If Drawdown reaches or exceeds <strong className="text-rose-400">10%</strong>, the bot transitions to <code className="text-rose-300 font-mono">PAUSED</code> mode. No further orders will be placed until manual reset.
            </p>
          </div>

          {/* Rule 4: Converted Execution Settings: Simulation = FALSE, True BUY = TRUE, True SELL = TRUE */}
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>4. Execution Engine Settings (Converted: Simulation FALSE · BUY &amp; SELL TRUE)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              The platform is configured with live broker order execution enabled:
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#0a1424] border border-rose-500/30 text-rose-300">
                <span className="text-[10px] text-slate-400 block font-sans">Simulation Mode:</span>
                <strong>FALSE (Live Orders)</strong>
              </div>
              <div className="p-2 rounded bg-[#0a1424] border border-emerald-500/30 text-emerald-300">
                <span className="text-[10px] text-slate-400 block font-sans">True BUY Orders:</span>
                <strong>TRUE (Enabled)</strong>
              </div>
              <div className="p-2 rounded bg-[#0a1424] border border-emerald-500/30 text-emerald-300">
                <span className="text-[10px] text-slate-400 block font-sans">True SELL Orders:</span>
                <strong>TRUE (Enabled)</strong>
              </div>
            </div>
            <p className="text-slate-400">
              When <strong>Simulation is FALSE</strong>, signals automatically dispatch real market orders to your MetaTrader 5 broker account via WebSocket IPC &amp; MQL5 WebRequest.
            </p>
          </div>

          {/* Rule 5: MetaTrader 5 Connection & WebRequest Allowlist */}
          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
                <Cpu className="w-4 h-4" />
                <span>5. Allow MetaTrader 5 Connection (metatrader.com)</span>
              </div>
              <a
                href="https://www.metatrader.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-sky-300 hover:underline inline-flex items-center gap-1"
              >
                <span>https://www.metatrader.com/</span>
              </a>
            </div>
            <p className="text-slate-300 leading-relaxed">
              To allow seamless communication between MetaTrader 5 and the Speaking Hand AI Trader engine:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>
                Open the MetaTrader 5 terminal downloaded from <a href="https://www.metatrader.com/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-mono">metatrader.com</a>.
              </li>
              <li>
                Navigate to <strong>Tools ➔ Options ➔ Expert Advisors</strong> (or press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Ctrl + O</kbd>).
              </li>
              <li>
                Check <strong>"Allow WebRequest for listed URL:"</strong> and add <code className="text-emerald-300 font-mono">https://www.metatrader.com/</code> and this application's API URL.
              </li>
              <li>
                Attach <code className="text-slate-200 font-mono">SpeakingHandAITrader.mq5</code> to your chart (e.g., EUR/USD M1 or M5) and enable <strong>Algo Trading</strong> on the MT5 toolbar.
              </li>
            </ol>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t border-slate-800 bg-[#0a0d13]">
          <a
            href="https://www.metatrader.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-400 hover:underline font-mono"
          >
            Visit metatrader.com ➔
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
