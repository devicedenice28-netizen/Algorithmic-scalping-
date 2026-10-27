import React, { useState } from "react";
import { Lock, UserPlus, LogIn, LogOut, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

interface AlgoProAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: number; email: string; token: string } | null;
  onLoginSuccess: (user: { id: number; email: string; token: string }) => void;
  onLogout: () => void;
}

export const AlgoProAuthModal: React.FC<AlgoProAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (password.length < 10 || password.length > 128) {
          setError("Password must be between 10 and 128 characters.");
          setLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }

        setSuccess("Account created successfully! Logging you in...");
        // Auto-login
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginRes.json();
        if (loginRes.ok && loginData.token) {
          onLoginSuccess({
            id: loginData.user?.id || data.userId,
            email: email.trim().toLowerCase(),
            token: loginData.token,
          });
          setTimeout(() => onClose(), 1200);
        } else {
          setIsRegister(false);
        }
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Login failed");
          setLoading(false);
          return;
        }

        setSuccess("Login successful! EA ALGOPRO token authenticated.");
        onLoginSuccess({
          id: data.user?.id || 1,
          email: email.trim().toLowerCase(),
          token: data.token,
        });
        setTimeout(() => onClose(), 900);
      }
    } catch (err: any) {
      setError(err.message || "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-[#142238] border border-[#1e3456] rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-[#1e3456] pb-3">
          <div className="flex items-center gap-2 text-[#00e5a8]">
            <Lock className="w-4 h-4" />
            <h3 className="font-bold text-sm tracking-wide text-white">
              EA ALGOPRO API Authentication
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {currentUser ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-[#0a1424] border border-emerald-500/30 rounded-lg space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>JWT Authenticated Session</span>
              </div>
              <div className="text-slate-300">
                User: <strong className="text-white">{currentUser.email}</strong>
              </div>
              <div className="text-slate-400 text-[11px] truncate">
                Token: <span className="text-emerald-400/90">{currentUser.token.substring(0, 36)}...</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onLogout}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-[#08111f] bg-[#00c896] hover:bg-[#00e5a8] rounded transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between bg-[#0a1424] p-1 rounded-lg border border-[#1e3456]">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  !isRegister
                    ? "bg-[#00c896] text-[#08111f] shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Log In
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  isRegister
                    ? "bg-[#00c896] text-[#08111f] shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                className="w-full bg-[#0a1424] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00e5a8]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-medium">
                Password {isRegister && <span className="text-slate-400 text-[10px]">(min 10 characters)</span>}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0a1424] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00e5a8]"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-mono">
                EA ALGOPRO v1.0.0 API
              </span>

              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-[#08111f] bg-[#00c896] hover:bg-[#00e5a8] rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRegister ? <UserPlus className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                <span>{loading ? "Processing..." : isRegister ? "Create Account" : "Authenticate"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
