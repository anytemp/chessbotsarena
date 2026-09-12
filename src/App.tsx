import { useState, useEffect, useCallback } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChessPieces } from "./ChessPieces";
import { api, checkBackendConnection, type Bot, type DashboardResponse } from "./services/api";
import HumanGame from "./pages/HumanGame";
import ToastContainer, { toast } from "./components/Toast";

// ─── ICONS ──────────────────────────────────────────────────────────────────
const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  play: "M5 3l14 9-14 9V3z",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z",
  brain: "M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  bot: "M12 2a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3V4a2 2 0 0 1 2-2z",
  arrow: "M5 12h14M12 5l7 7-7 7",
  sparkle: "M12 3v18M3 12h18",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
  menu: "M3 12h18M3 6h18M3 18h18",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  trend: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  server: "M2 12h20M2 6h20M2 18h20",
};

// ─── CHESS BOARD (decorative) ──────────────────────────────────────────────
function ChessBoard({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? "w-32 h-32" : size === "md" ? "w-48 h-48 sm:w-64 sm:h-64" : "w-full max-w-md aspect-square";
  const pieceSize = size === "sm" ? 16 : size === "md" ? 20 : 32;
  const pieces: Record<string, { piece: keyof typeof ChessPieces; color: "dark" | "light" }> = {
    "0-0": { piece: "Rook", color: "dark" }, "1-0": { piece: "Knight", color: "dark" }, "2-0": { piece: "Bishop", color: "dark" }, "3-0": { piece: "Queen", color: "dark" }, "4-0": { piece: "King", color: "dark" }, "5-0": { piece: "Bishop", color: "dark" }, "6-0": { piece: "Knight", color: "dark" }, "7-0": { piece: "Rook", color: "dark" },
    "0-1": { piece: "Pawn", color: "dark" }, "1-1": { piece: "Pawn", color: "dark" }, "2-1": { piece: "Pawn", color: "dark" }, "4-1": { piece: "Pawn", color: "dark" }, "5-1": { piece: "Pawn", color: "dark" }, "6-1": { piece: "Pawn", color: "dark" }, "7-1": { piece: "Pawn", color: "dark" },
    "3-3": { piece: "Pawn", color: "light" }, "2-4": { piece: "Knight", color: "light" },
    "0-6": { piece: "Pawn", color: "light" }, "1-6": { piece: "Pawn", color: "light" }, "4-6": { piece: "Pawn", color: "light" }, "5-6": { piece: "Pawn", color: "light" }, "6-6": { piece: "Pawn", color: "light" }, "7-6": { piece: "Pawn", color: "light" },
    "0-7": { piece: "Rook", color: "light" }, "1-7": { piece: "Knight", color: "light" }, "2-7": { piece: "Bishop", color: "light" }, "3-7": { piece: "Queen", color: "light" }, "4-7": { piece: "King", color: "light" }, "5-7": { piece: "Bishop", color: "light" }, "7-7": { piece: "Rook", color: "light" },
  };
  return (
    <div className={`${dim} grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20`}>
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        const light = (r + c) % 2 === 0;
        const p = pieces[`${c}-${r}`];
        const Piece = p ? ChessPieces[p.piece] : null;
        return (
          <div key={i} className={`aspect-square flex items-center justify-center ${light ? "bg-slate-200" : "bg-slate-500"}`}>
            {Piece && <Piece color={p.color} size={pieceSize} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── NAVBAR ─────────────────────────────────────────────────────────────────
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Live Match", path: "/live" },
    { label: "Play", path: "/play" },
    { label: "Tournaments", path: "/tournaments" },
    { label: "Analysis", path: "/analysis" },
    { label: "Bot Arena", path: "/arena" },
  ];

  useEffect(() => {
    checkBackendConnection().then(setBackendOnline);
  }, []);

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#E8E0D4]/90 backdrop-blur-xl border-b border-[#c9c1b5]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <button onClick={() => navigate("/")} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl neu-flat flex items-center justify-center">
                <ChessPieces.Knight color="dark" size={22} />
              </div>
              <span className="font-display text-2xl font-semibold text-[#2C1810] hidden sm:block">
                Chess<span className="text-[#8B6914]">Bot</span>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    location.pathname === link.path ? "neu-pressed text-[#8B6914]" : "text-[#5C4A3A] hover:text-[#2C1810]"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {/* Backend status indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/50" title={backendOnline === null ? "Checking..." : backendOnline ? "Backend connected" : "Demo mode (no backend)"}>
                <span className={`connection-dot ${backendOnline === null ? "" : backendOnline ? "online" : "offline"}`} />
                <span className="text-xs text-[#5C4A3A]">{backendOnline === null ? "..." : backendOnline ? "Live" : "Demo"}</span>
              </div>
              <button onClick={() => setShowSignIn(true)} className="px-4 py-2 text-sm font-medium text-[#5C4A3A] hover:text-[#2C1810]">Sign in</button>
              <button onClick={() => setShowGetStarted(true)} className="px-5 py-2 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-[#F5EDE0] text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                Get Started
              </button>
            </div>

            <button className="md:hidden text-[#2C1810]" onClick={() => setMobileOpen(true)}>
              <Icon path={iconPaths.menu} size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 z-50 lg:hidden" onClick={() => setMobileOpen(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed top-0 right-0 bottom-0 w-80 bg-[#E8E0D4] z-50 lg:hidden shadow-2xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <span className="font-display text-2xl font-semibold text-[#2C1810]">Menu</span>
                  <button onClick={() => setMobileOpen(false)} className="text-[#2C1810]"><Icon path={iconPaths.x} size={24} /></button>
                </div>
                <div className="space-y-2">
                  {navLinks.map((link) => (
                    <button key={link.path} onClick={() => { navigate(link.path); setMobileOpen(false); }}
                      className={`w-full text-left px-5 py-4 text-base font-medium rounded-xl transition-all ${location.pathname === link.path ? "neu-pressed text-[#8B6914]" : "text-[#5C4A3A] hover:text-[#2C1810]"}`}>
                      {link.label}
                    </button>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-[#c9c1b5]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`connection-dot ${backendOnline ? "online" : "offline"}`} />
                    <span className="text-sm text-[#5C4A3A]">{backendOnline ? "Backend Connected" : "Demo Mode"}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignIn && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSignIn(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Sign In</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Email</label>
                  <input type="email" placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                </div>
              </div>
              <button onClick={() => { toast.success("Welcome back!"); setShowSignIn(false); }} className="w-full py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-white rounded-xl font-semibold hover:shadow-xl transition-all mb-3">
                Sign In
              </button>
              <button onClick={() => setShowSignIn(false)} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Get Started Modal */}
      <AnimatePresence>
        {showGetStarted && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowGetStarted(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Get Started</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Username</label>
                  <input type="text" placeholder="chessmaster123" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Email</label>
                  <input type="email" placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                </div>
              </div>
              <button onClick={() => { toast.success("Account created!"); setShowGetStarted(false); }} className="w-full py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-white rounded-xl font-semibold hover:shadow-xl transition-all mb-3">
                Create Account
              </button>
              <button onClick={() => setShowGetStarted(false)} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────────
function Home() {
  const navigate = useNavigate();
  const [viewers, setViewers] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [bots, setBots] = useState<Bot[]>([]);

  useEffect(() => {
    const savedBots = localStorage.getItem("chessbots");
    if (savedBots) setBots(JSON.parse(savedBots));

    api.getDashboard()
      .then(data => { setDashboard(data); setViewers(data.live_games?.length || 0); })
      .catch(() => { setViewers(Math.floor(Math.random() * 30) + 10); });
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#6B7F5E] animate-pulse-soft" />
            <span className="text-sm font-medium text-[#5C4A3A]">{viewers.toLocaleString()} watching live</span>
          </div>
          <h1 className="luxury-heading text-5xl sm:text-6xl lg:text-7xl text-[#2C1810] mb-4 text-balance">
            Where bots <span className="italic text-[#8B6914]">outthink</span> each other
          </h1>
          <p className="text-lg text-[#5C4A3A] max-w-2xl mx-auto mb-6">
            Upload your chess engine. Watch it compete in real-time. Learn from an AI grandmaster.
          </p>
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            onClick={() => navigate("/live")} className="neu-accent px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-3 group">
            <Icon path={iconPaths.play} size={20} />
            Watch Live Now
            <Icon path={iconPaths.arrow} size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>

        <div className="bento-grid">
          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onClick={() => navigate("/live")} className="bento-2x2 neu-raised rounded-3xl p-6 sm:p-8 text-left group cursor-pointer">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse-soft">LIVE</span>
              <span className="text-sm text-[#5C4A3A]">Weekly Championship</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1810] mb-3">Watch Live Match</h2>
            <p className="text-[#5C4A3A] mb-6">StockfishBot vs AlphaZero Clone • Round 14</p>
            <div className="flex justify-center mb-6"><ChessBoard size="md" /></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon path={iconPaths.eye} size={16} className="text-[#8B7A6A]" />
                <span className="text-sm font-medium text-[#2C1810]">{viewers.toLocaleString()} watching</span>
              </div>
              <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all">
                <span className="text-sm">Watch now</span>
                <Icon path={iconPaths.arrow} size={16} />
              </div>
            </div>
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            onClick={() => navigate("/play")} className="bento-2x1 neu-raised rounded-3xl p-6 text-left group cursor-pointer relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center">
                <Icon path={iconPaths.users} size={22} className="text-[#8B6914]" />
              </div>
              <Icon path={iconPaths.arrow} size={20} className="text-[#8B7A6A] group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Play Chess</h3>
            <p className="text-sm text-[#5C4A3A] mb-4">Challenge humans or bots. Multiple time controls.</p>
            <div className="absolute bottom-4 right-4 w-20 h-20 perspective-1000">
              <div className="w-full h-full relative flex items-center justify-center">
                <div className="relative">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/20 rounded-full blur-md transform translate-y-2"></div>
                  <div className="relative z-10 king-3d"><ChessPieces.Queen color="dark" size={64} /></div>
                </div>
              </div>
            </div>
          </motion.button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="neu-raised rounded-3xl p-6">
            <div className="text-center">
              <div className="font-display text-4xl font-bold text-[#8B6914] mb-1">{dashboard?.summary?.total_bots || bots.length}</div>
              <div className="text-sm text-[#5C4A3A]">Bots uploaded</div>
            </div>
          </motion.div>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            onClick={() => navigate("/analysis")} className="neu-raised rounded-3xl p-6 text-left group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center mb-4">
              <Icon path={iconPaths.brain} size={22} className="text-[#8B6914]" />
            </div>
            <h3 className="font-display text-xl font-semibold text-[#2C1810] mb-2">AI Analysis</h3>
            <p className="text-xs text-[#5C4A3A]">Deep insights & learning</p>
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            onClick={() => navigate("/tournaments")} className="bento-1x2 neu-raised rounded-3xl p-6 text-left group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center mb-4">
              <Icon path={iconPaths.trophy} size={22} className="text-[#8B6914]" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#2C1810] mb-3">Tournaments</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between py-2 border-b border-[#c9c1b5]/30">
                <span className="text-sm text-[#2C1810]">Weekly Blitz</span>
                <span className="text-xs font-bold text-[#6B7F5E]">LIVE</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#c9c1b5]/30">
                <span className="text-sm text-[#2C1810]">Monthly GP</span>
                <span className="text-xs font-bold text-[#8B6914]">OPEN</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[#2C1810]">Championship</span>
                <span className="text-xs font-bold text-[#8B7A6A]">SOON</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all">
              <span className="text-sm">View all</span>
              <Icon path={iconPaths.arrow} size={16} />
            </div>
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            onClick={() => navigate("/arena")} className="bento-2x1 neu-raised rounded-3xl p-6 text-left group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center">
                <Icon path={iconPaths.bot} size={22} className="text-[#8B6914]" />
              </div>
              <Icon path={iconPaths.arrow} size={20} className="text-[#8B7A6A] group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Bot Arena</h3>
            <p className="text-sm text-[#5C4A3A]">Upload your engine. Watch autonomous battles. Track ELO.</p>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ─── LIVE MATCH PAGE ────────────────────────────────────────────────────────
function LiveMatch() {
  const navigate = useNavigate();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 40) + 10);
  const [evaluation, setEvaluation] = useState(0.0);
  const [boardState, setBoardState] = useState<(Record<string, string> | null)[][] | null>(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [matchStatus, setMatchStatus] = useState<"playing" | "completed">("playing");
  const [matchResult, setMatchResult] = useState("");
  const [bots, setBots] = useState<{ name: string; elo: number }[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{ bot1: { name: string; elo: number }; bot2: { name: string; elo: number } } | null>(null);

  const getInitialBoard = useCallback((): ({ piece: string; color: "dark" | "light" } | null)[][] => {
    const board: ({ piece: string; color: "dark" | "light" } | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    board[0][0] = { piece: "Rook", color: "dark" }; board[0][1] = { piece: "Knight", color: "dark" }; board[0][2] = { piece: "Bishop", color: "dark" }; board[0][3] = { piece: "Queen", color: "dark" }; board[0][4] = { piece: "King", color: "dark" }; board[0][5] = { piece: "Bishop", color: "dark" }; board[0][6] = { piece: "Knight", color: "dark" }; board[0][7] = { piece: "Rook", color: "dark" };
    for (let i = 0; i < 8; i++) board[1][i] = { piece: "Pawn", color: "dark" };
    board[7][0] = { piece: "Rook", color: "light" }; board[7][1] = { piece: "Knight", color: "light" }; board[7][2] = { piece: "Bishop", color: "light" }; board[7][3] = { piece: "Queen", color: "light" }; board[7][4] = { piece: "King", color: "light" }; board[7][5] = { piece: "Bishop", color: "light" }; board[7][6] = { piece: "Knight", color: "light" }; board[7][7] = { piece: "Rook", color: "light" };
    for (let i = 0; i < 8; i++) board[6][i] = { piece: "Pawn", color: "light" };
    return board;
  }, []);

  const demoMoves = [
    { move: "e4", from: [6, 4], to: [4, 4], commentary: "White opens with the King's Pawn. A classic choice controlling the center." },
    { move: "e5", from: [1, 4], to: [3, 4], commentary: "Black responds symmetrically. The battle for the center begins!" },
    { move: "Nf3", from: [7, 6], to: [5, 5], commentary: "Knight develops to f3, attacking the e5 pawn and preparing kingside castling." },
    { move: "Nc6", from: [0, 1], to: [2, 2], commentary: "Black defends the e5 pawn with the queen's knight. Solid development." },
    { move: "Bb5", from: [7, 5], to: [3, 1], commentary: "The Ruy Lopez! White pins the knight, creating long-term pressure." },
    { move: "a6", from: [1, 0], to: [2, 0], commentary: "Black challenges the bishop. The Morphy Defense - sharp and dynamic!" },
    { move: "Ba4", from: [3, 1], to: [4, 0], commentary: "Bishop retreats to a4, maintaining the pin. White keeps the tension." },
    { move: "Nf6", from: [0, 6], to: [2, 5], commentary: "Knight develops to f6, attacking e4. Both sides developing harmoniously." },
    { move: "O-O", from: [7, 4], to: [7, 6], commentary: "White castles kingside! King safety secured, rook activated on f1." },
    { move: "Be7", from: [0, 5], to: [2, 3], commentary: "Black develops the bishop, preparing to castle. Solid positional play." },
    { move: "Re1", from: [7, 7], to: [7, 4], commentary: "Rook to e1, putting pressure on the e-file. White eyes the e5 pawn." },
    { move: "b5", from: [1, 1], to: [3, 1], commentary: "Black pushes the b-pawn, gaining space on the queenside. Ambitious!" },
    { move: "Bb3", from: [4, 0], to: [5, 1], commentary: "Bishop retreats to b3, keeping an eye on the f7 square." },
    { move: "d6", from: [1, 3], to: [2, 3], commentary: "Black solidifies the center with d6. The pawn structure is becoming defined." },
    { move: "c3", from: [6, 2], to: [5, 2], commentary: "White prepares d4, challenging the center. The position is getting complex!" },
    { move: "O-O", from: [0, 4], to: [0, 6], commentary: "Black castles! Both kings are now safe. The middlegame battle begins." },
  ];

  useEffect(() => {
    const savedBots = localStorage.getItem("chessbots");
    if (savedBots) {
      const botList = JSON.parse(savedBots);
      setBots(botList);
      if (botList.length >= 2) {
        const shuffled = [...botList].sort(() => Math.random() - 0.5);
        setSelectedMatch({ bot1: shuffled[0], bot2: shuffled[1] });
      }
    } else {
      const demoBots = [
        { name: "StockfishBot", elo: 2847 },
        { name: "AlphaClone", elo: 2812 },
      ];
      setBots(demoBots);
      setSelectedMatch({ bot1: demoBots[0], bot2: demoBots[1] });
    }
  }, []);

  useEffect(() => { setBoardState(getInitialBoard()); }, [getInitialBoard]);

  useEffect(() => {
    if (!boardState || currentMoveIndex >= demoMoves.length) return;
    const newBoard = boardState.map(row => [...row]);
    const move = demoMoves[currentMoveIndex];
    if (move) {
      const [fromRow, fromCol] = move.from;
      const [toRow, toCol] = move.to;
      newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
      newBoard[fromRow][fromCol] = null;
      setBoardState(newBoard);
    }
  }, [currentMoveIndex, boardState]);

  useEffect(() => {
    if (matchStatus === "completed") return;
    const interval = setInterval(() => {
      setCurrentMoveIndex(prev => {
        if (prev >= demoMoves.length - 1) {
          setMatchStatus("completed");
          if (evaluation > 0.5) setMatchResult(`${selectedMatch?.bot1?.name || "White"} wins!`);
          else if (evaluation < -0.5) setMatchResult(`${selectedMatch?.bot2?.name || "Black"} wins!`);
          else setMatchResult("Draw!");
          return prev;
        }
        return prev + 1;
      });
      setEvaluation(prev => Math.max(-3, Math.min(3, prev + (Math.random() - 0.5) * 0.6)));
      setWhiteTime(prev => Math.max(0, prev - 3));
      setBlackTime(prev => Math.max(0, prev - 3));
    }, 3000);
    return () => clearInterval(interval);
  }, [matchStatus, evaluation, selectedMatch, demoMoves.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => Math.max(10, Math.min(500, prev + Math.floor(Math.random() * 8) - 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const currentMove = demoMoves[currentMoveIndex];
  const movesToShow = demoMoves.slice(0, currentMoveIndex + 1);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse-soft">LIVE</span>
              <span className="text-sm text-cyan-300">Demo Match Playing</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              {selectedMatch?.bot1?.name || "Bot 1"} vs {selectedMatch?.bot2?.name || "Bot 2"}
            </h1>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
            <Icon path={iconPaths.eye} size={18} className="text-cyan-400" />
            <span className="text-sm font-bold text-white">{viewers.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{selectedMatch?.bot2?.name || "Bot 2"}</div>
                    <div className="text-xs text-cyan-300">{selectedMatch?.bot2?.elo || 2800} ELO • Black</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-orange-400">{Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}</div>
                </div>
              </div>

              <div className="flex justify-center my-6">
                {boardState ? (
                  <div className="w-full max-w-md aspect-square grid grid-cols-8 gap-0 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                    {boardState.map((row, rowIndex) =>
                      row.map((piece, colIndex) => {
                        const isLight = (rowIndex + colIndex) % 2 === 0;
                        const isLastMove = currentMove && ((currentMove.from[0] === rowIndex && currentMove.from[1] === colIndex) || (currentMove.to[0] === rowIndex && currentMove.to[1] === colIndex));
                        const PieceComponent = piece ? ChessPieces[piece.piece as keyof typeof ChessPieces] : null;
                        return (
                          <div key={`${rowIndex}-${colIndex}`} className={`aspect-square flex items-center justify-center transition-all duration-500 ${isLight ? "bg-slate-200" : "bg-slate-500"} ${isLastMove ? "ring-2 ring-inset ring-cyan-400" : ""}`}>
                            {PieceComponent && piece && (
                              <motion.div key={`${piece.piece}-${piece.color}-${rowIndex}-${colIndex}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                                <PieceComponent color={piece.color as "dark" | "light"} size={40} />
                              </motion.div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-md aspect-square bg-white/5 rounded-lg flex items-center justify-center">
                    <div className="text-white/50">Loading board...</div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.Knight color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{selectedMatch?.bot1?.name || "Bot 1"}</div>
                    <div className="text-xs text-cyan-300">{selectedMatch?.bot1?.elo || 2800} ELO • White</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-white/50">{Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Evaluation</span>
                  <span className="text-sm font-bold text-white">{evaluation > 0 ? "+" : ""}{evaluation.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-cyan-400 to-orange-400 rounded-full" animate={{ width: `${50 + evaluation * 10}%` }} transition={{ duration: 0.5 }} />
                </div>
              </div>

              {matchStatus === "completed" && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Icon path={iconPaths.trophy} size={24} className="text-yellow-400" />
                    <div>
                      <div className="text-lg font-bold text-white">Match Completed!</div>
                      <div className="text-sm text-white/70">{matchResult}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Moves ({movesToShow.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {movesToShow.map((moveData, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="text-xs text-cyan-300 w-8">{Math.floor(idx / 2) + 1}.</span>
                    <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 0 ? moveData.move : "..."}</span>
                    <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 1 ? moveData.move : ""}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <motion.div key={currentMoveIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Icon path={iconPaths.sparkle} size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400 uppercase">AI Commentary</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{currentMove.commentary}</p>
            </motion.div>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Match Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-white/70">Opening</span><span className="text-sm font-semibold text-white">Ruy Lopez</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-white/70">Current Move</span><span className="text-sm font-semibold text-cyan-400">{currentMoveIndex + 1}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-white/70">Status</span><span className={`text-sm font-semibold ${matchStatus === "completed" ? "text-yellow-400" : "text-green-400"}`}>{matchStatus === "completed" ? "Completed" : "In Progress"}</span></div>
              </div>
            </div>
            <button onClick={() => navigate("/")} className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">Back to Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PLAY PAGE ──────────────────────────────────────────────────────────────
function Play() {
  const navigate = useNavigate();
  const [showBotModal, setShowBotModal] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBot1, setSelectedBot1] = useState<number | null>(null);
  const [selectedBot2, setSelectedBot2] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBots().then(setBots).catch(() => {
      const saved = localStorage.getItem("chessbots");
      if (saved) setBots(JSON.parse(saved));
    });
  }, []);

  const startGame = async (mode: "human" | "bot") => {
    if (mode === "human") { navigate("/play/human"); return; }
    if (!selectedBot1 || !selectedBot2) { toast.error("Please select both bots"); return; }
    setLoading(true);
    try {
      await api.createMatch(selectedBot1, selectedBot2);
      toast.success("Match created!");
      setShowBotModal(false);
      navigate("/live");
    } catch {
      toast.info("Backend not running. Starting in demo mode...");
      setShowBotModal(false);
      navigate("/live");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-4xl mx-auto">
        <h1 className="luxury-heading text-5xl text-[#2C1810] mb-2 text-center">Play Chess</h1>
        <p className="text-[#5C4A3A] text-center mb-12">Choose your opponent</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <button onClick={() => navigate("/play/human")} className="neu-raised rounded-3xl p-8 text-left group">
            <div className="w-16 h-16 rounded-2xl neu-flat flex items-center justify-center mb-4"><Icon path={iconPaths.users} size={32} className="text-[#8B6914]" /></div>
            <h2 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Play vs Human</h2>
            <p className="text-sm text-[#5C4A3A] mb-4">Local 2-player game with AI commentary</p>
            <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all"><span>Start game</span><Icon path={iconPaths.arrow} size={16} /></div>
          </button>
          <button onClick={() => setShowBotModal(true)} className="neu-raised rounded-3xl p-8 text-left group">
            <div className="w-16 h-16 rounded-2xl neu-flat flex items-center justify-center mb-4"><Icon path={iconPaths.bot} size={32} className="text-[#8B6914]" /></div>
            <h2 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Play vs Bot</h2>
            <p className="text-sm text-[#5C4A3A] mb-4">Practice against AI engines at any level</p>
            <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all"><span>Start game</span><Icon path={iconPaths.arrow} size={16} /></div>
          </button>
        </div>

        <AnimatePresence>
          {showBotModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBotModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Play vs Bot</h3>
                {bots.length < 2 ? (
                  <div className="mb-6 text-center py-8">
                    <p className="text-[#5C4A3A] mb-4">Need at least 2 bots. Upload some first!</p>
                    <button onClick={() => { setShowBotModal(false); navigate("/arena"); }} className="px-6 py-2 bg-[#8B6914] text-white rounded-xl font-semibold">Go to Bot Arena</button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="text-sm font-medium text-[#5C4A3A] mb-3 block">Your Bot</label>
                      <select value={selectedBot1 || ""} onChange={(e) => setSelectedBot1(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] outline-none">
                        <option value="">Choose your bot...</option>
                        {bots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                      </select>
                    </div>
                    <div className="mb-6">
                      <label className="text-sm font-medium text-[#5C4A3A] mb-3 block">Opponent Bot</label>
                      <select value={selectedBot2 || ""} onChange={(e) => setSelectedBot2(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] outline-none">
                        <option value="">Choose opponent...</option>
                        {bots.filter(b => b.id !== selectedBot1).map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowBotModal(false)} className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
                      <button onClick={() => startGame("bot")} disabled={loading || !selectedBot1 || !selectedBot2} className="flex-1 py-3 bg-[#8B6914] text-white rounded-xl font-semibold hover:bg-[#7a5a10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Creating..." : "Start Game"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <button onClick={() => navigate("/")} className="neu-btn px-6 py-3 rounded-xl font-medium text-[#5C4A3A] inline-flex items-center gap-2">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TOURNAMENTS PAGE ───────────────────────────────────────────────────────
function Tournaments() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<{ id: number; name: string; description: string | null; format: string; participant_limit: number; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", format: "KNOCKOUT", participant_limit: 16 });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = () => {
    setLoading(true);
    api.getTournaments()
      .then(data => { setTournaments(data); setLoading(false); })
      .catch(() => {
        setTournaments([
          { id: 1, name: "Weekly Blitz Championship", description: "Fast-paced blitz tournament", format: "KNOCKOUT", participant_limit: 16, status: "RUNNING" },
          { id: 2, name: "Monthly Rapid Open", description: "Open tournament for all levels", format: "SWISS", participant_limit: 32, status: "REGISTRATION_OPEN" },
          { id: 3, name: "Grand Prix Series - Round 3", description: "Third round of the Grand Prix", format: "ROUND_ROBIN", participant_limit: 8, status: "REGISTRATION_OPEN" },
          { id: 4, name: "Beginner Friendly", description: "Perfect for new bots", format: "SWISS", participant_limit: 64, status: "DRAFT" },
        ]);
        setLoading(false);
      });
  };

  const handleCreate = async () => {
    if (!createForm.name) { toast.error("Please enter a tournament name"); return; }
    setCreating(true);
    try {
      await api.createTournament(createForm);
      toast.success("Tournament created!");
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "", format: "KNOCKOUT", participant_limit: 16 });
      fetchTournaments();
    } catch {
      const demo = { id: Date.now(), name: createForm.name, description: createForm.description, format: createForm.format, participant_limit: createForm.participant_limit, status: "REGISTRATION_OPEN" };
      setTournaments(prev => [...prev, demo]);
      toast.success("Tournament created in demo mode!");
      setShowCreateModal(false);
      setCreateForm({ name: "", description: "", format: "KNOCKOUT", participant_limit: 16 });
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="luxury-heading text-5xl text-[#2C1810] mb-2">Tournaments</h1>
            <p className="text-[#5C4A3A]">Compete in automated tournaments</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="neu-accent px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2">Create Tournament</button>
        </div>

        <AnimatePresence>
          {showCreateModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Create Tournament</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Tournament Name *</label>
                    <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Weekly Blitz Championship" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Description</label>
                    <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="A fast-paced knockout tournament..." rows={3} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Format</label>
                    <select value={createForm.format} onChange={(e) => setCreateForm({ ...createForm, format: e.target.value })} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] outline-none">
                      <option value="KNOCKOUT">Knockout</option>
                      <option value="ROUND_ROBIN">Round Robin</option>
                      <option value="SWISS">Swiss</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Participant Limit</label>
                    <input type="number" value={createForm.participant_limit} onChange={(e) => setCreateForm({ ...createForm, participant_limit: Number(e.target.value) })} min={4} max={256} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] outline-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
                  <button onClick={handleCreate} disabled={creating} className="flex-1 py-3 bg-[#8B6914] text-white rounded-xl font-semibold hover:bg-[#7a5a10] transition-colors disabled:opacity-50">
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12"><div className="text-[#8B7A6A]">Loading tournaments...</div></div>
          ) : tournaments.length === 0 ? (
            <div className="col-span-full text-center py-12"><div className="text-[#8B7A6A]">No tournaments yet.</div></div>
          ) : (
            tournaments.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="neu-raised rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center"><Icon path={iconPaths.trophy} size={22} className="text-[#8B6914]" /></div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === "RUNNING" ? "bg-[#6B7F5E]/20 text-[#6B7F5E]" : t.status === "REGISTRATION_OPEN" ? "bg-[#8B6914]/20 text-[#8B6914]" : "bg-[#8B7A6A]/20 text-[#8B7A6A]"}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-[#2C1810] mb-2">{t.name}</h3>
                {t.description && <p className="text-sm text-[#5C4A3A] mb-3">{t.description}</p>}
                <div className="flex items-center justify-between pt-4 border-t border-[#c9c1b5]/30 mb-4">
                  <div><div className="text-xs text-[#8B7A6A]">Format</div><div className="text-sm font-bold text-[#2C1810]">{t.format}</div></div>
                  <div className="text-right"><div className="text-xs text-[#8B7A6A]">Limit</div><div className="text-sm font-bold text-[#2C1810]">{t.participant_limit}</div></div>
                </div>
                {t.status === "REGISTRATION_OPEN" && <button onClick={() => toast.success("Registered for tournament!")} className="w-full py-2 bg-[#8B6914] text-white rounded-xl text-sm font-semibold hover:bg-[#7a5a10] transition-colors">Register Bot</button>}
                {t.status === "RUNNING" && <button onClick={() => navigate("/live")} className="w-full py-2 bg-[#6B7F5E] text-white rounded-xl text-sm font-semibold hover:bg-[#5a6d50] transition-colors">Watch Live</button>}
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => navigate("/")} className="neu-btn px-6 py-3 rounded-xl font-medium text-[#5C4A3A] inline-flex items-center gap-2"><Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back to home</button>
        </div>
      </div>
    </div>
  );
}

// ─── ANALYSIS PAGE ──────────────────────────────────────────────────────────
function Analysis() {
  const navigate = useNavigate();
  const [selectedBlunder, setSelectedBlunder] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    api.getDashboard().then(setDashboardData).catch(() => {});
  }, []);

  const moveQualityData = [
    { name: "Excellent", value: 35, color: "#22c55e" },
    { name: "Good", value: 40, color: "#4ade80" },
    { name: "Inaccuracy", value: 15, color: "#facc15" },
    { name: "Mistake", value: 7, color: "#fb923c" },
    { name: "Blunder", value: 3, color: "#f87171" },
  ];

  const blunders = [
    { move: 23, played: "Qd3??", best: "Qf5!", eval: -2.4, explanation: "Your queen was exposed to a knight fork on e5. Moving to d3 allowed the opponent to win material.", suggestion: "Always check for opponent's knight forks before moving your queen." },
    { move: 15, played: "Nxe5??", best: "Nf3", eval: -1.8, explanation: "This capture looked tempting but missed a tactical shot. The opponent had a hidden defender.", suggestion: "Before capturing, verify all defenders. Nf3 would have maintained equality." },
    { move: 31, played: "Kg2??", best: "Kf1", eval: -3.1, explanation: "Walking the king into a mating net. The g2 square had no escape routes.", suggestion: "Keep escape squares for your king. Kf1 maintains safety." },
  ];

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-3">AI Analysis Dashboard</h1>
          <p className="text-gray-400 text-lg">Deep insights from your recent games</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Games", value: dashboardData?.summary?.total_games || 42, icon: iconPaths.check },
            { label: "Total Bots", value: dashboardData?.summary?.total_bots || 12, icon: iconPaths.alert },
            { label: "Active Tournaments", value: dashboardData?.summary?.active_tournaments || 3, icon: iconPaths.sparkle },
            { label: "Total Tournaments", value: dashboardData?.summary?.total_tournaments || 8, icon: iconPaths.trend },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3">
                <Icon path={stat.icon} size={20} className="text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-white mb-6">Move Quality Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={moveQualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {moveQualityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "12px", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {moveQualityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-300">{item.name}</span>
                  <span className="text-sm font-bold text-white ml-auto">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-white mb-6">Critical Blunders</h3>
            <div className="flex gap-2 mb-6">
              {blunders.map((_, i) => (
                <button key={i} onClick={() => setSelectedBlunder(i)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${selectedBlunder === i ? "bg-gradient-to-r from-white to-gray-200 text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
                  Move {blunders[i].move}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={selectedBlunder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-400 font-bold">Move {blunders[selectedBlunder].move}</span>
                    <span className="text-red-400">•</span>
                    <span className="text-red-400 font-mono font-bold">{blunders[selectedBlunder].eval}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/10">
                      <div className="text-xs text-red-300/70 mb-1">You Played</div>
                      <div className="text-lg font-mono font-bold text-white">{blunders[selectedBlunder].played}</div>
                    </div>
                    <div className="bg-green-900/20 rounded-xl p-3 border border-green-500/10">
                      <div className="text-xs text-green-300/70 mb-1">Best Move</div>
                      <div className="text-lg font-mono font-bold text-white">{blunders[selectedBlunder].best}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-gray-300 mb-2">What went wrong:</div>
                  <p className="text-sm text-gray-400 leading-relaxed">{blunders[selectedBlunder].explanation}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-4 border border-blue-500/20 backdrop-blur-sm">
                  <div className="text-sm font-semibold text-blue-300 mb-2">AI Suggestion:</div>
                  <p className="text-sm text-gray-300 leading-relaxed">{blunders[selectedBlunder].suggestion}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl mb-8">
          <h3 className="font-display text-2xl font-bold text-white mb-6">Performance Trend (Last 10 Games)</h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {[40, 55, 45, 60, 70, 65, 80, 75, 85, 90].map((val, i) => (
              <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${val}%` }} transition={{ delay: 0.5 + i * 0.05 }}
                className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-lg relative group cursor-pointer hover:from-blue-400 hover:to-purple-400 transition-all">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">{val}%</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {dashboardData?.grandmaster_summary && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/20 shadow-2xl mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Icon path={iconPaths.sparkle} size={24} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold text-white">Grandmaster AI Insights</h3>
                <p className="text-sm text-emerald-300/70">Powered by Gemini AI</p>
              </div>
            </div>
            <p className="text-white/90 leading-relaxed">{dashboardData.grandmaster_summary}</p>
          </motion.div>
        )}

        <div className="text-center">
          <button onClick={() => navigate("/")} className="bg-white/10 backdrop-blur-xl hover:bg-white/20 px-6 py-3 rounded-xl font-medium text-white border border-white/20 inline-flex items-center gap-2 transition-all">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOT ARENA PAGE ─────────────────────────────────────────────────────────
function BotArena() {
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", filename: "", description: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchBots(); }, []);

  const fetchBots = () => {
    setLoading(true);
    api.getBots()
      .then(data => { setBots(data); localStorage.setItem("chessbots", JSON.stringify(data)); setLoading(false); })
      .catch(() => {
        const saved = localStorage.getItem("chessbots");
        if (saved) { setBots(JSON.parse(saved)); setLoading(false); return; }
        const demoBots: Bot[] = [
          { id: 1, name: "Stockfish Demo", filename: "stockfish.py", description: "Demo Stockfish engine", created_at: new Date().toISOString() },
          { id: 2, name: "AlphaZero Demo", filename: "alphazero.py", description: "Demo AlphaZero engine", created_at: new Date().toISOString() },
        ];
        setBots(demoBots);
        localStorage.setItem("chessbots", JSON.stringify(demoBots));
        setLoading(false);
      });
  };

  const handleUpload = async () => {
    if (!uploadForm.name || !uploadForm.filename) { toast.error("Please fill in bot name and select a file"); return; }
    setUploading(true);
    try {
      await api.createBot(uploadForm);
      toast.success("Bot uploaded successfully!");
      setShowUploadModal(false);
      setUploadForm({ name: "", filename: "", description: "" });
      fetchBots();
    } catch {
      const demoBot: Bot = { id: Date.now(), name: uploadForm.name, filename: uploadForm.filename, description: uploadForm.description || "Demo bot", created_at: new Date().toISOString() };
      setBots(prev => { const newBots = [...prev, demoBot]; localStorage.setItem("chessbots", JSON.stringify(newBots)); return newBots; });
      toast.success("Bot added in demo mode! (Backend not running)");
      setShowUploadModal(false);
      setUploadForm({ name: "", filename: "", description: "" });
    } finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-6xl mx-auto">
        <h1 className="luxury-heading text-5xl text-[#2C1810] mb-2">Bot Arena</h1>
        <p className="text-[#5C4A3A] mb-12">Manage your chess bots</p>

        <div className="neu-raised rounded-3xl p-6 mb-8">
          <button onClick={() => setShowUploadModal(true)} className="neu-accent px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2">Upload New Bot</button>
        </div>

        <AnimatePresence>
          {showUploadModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Upload New Bot</h3>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Bot Name *</label>
                    <input type="text" value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} placeholder="My Awesome Bot" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Upload Bot File *</label>
                    <input type="file" accept=".py" onChange={(e) => { const file = e.target.files?.[0]; if (file) setUploadForm({ ...uploadForm, filename: file.name }); }} className="hidden" id="bot-file-input" />
                    <label htmlFor="bot-file-input" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] cursor-pointer flex items-center justify-between hover:bg-[#D4CFC5] transition-colors">
                      <span className={uploadForm.filename ? "text-[#2C1810]" : "text-[#8B7A6A]"}>{uploadForm.filename || "Choose Python file..."}</span>
                      <Icon path={iconPaths.server} size={18} className="text-[#8B6914]" />
                    </label>
                    <p className="text-xs text-[#8B7A6A] mt-1">Select a Python file (.py) with your bot logic</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Description</label>
                    <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="A brief description of your bot's strategy..." rows={3} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none resize-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
                  <button onClick={handleUpload} disabled={uploading} className="flex-1 py-3 bg-[#8B6914] text-white rounded-xl font-semibold hover:bg-[#7a5a10] transition-colors disabled:opacity-50">
                    {uploading ? "Uploading..." : "Upload Bot"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12"><div className="text-[#8B7A6A]">Loading bots...</div></div>
          ) : bots.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-[#8B7A6A] mb-4">No bots yet. Upload your first bot!</div>
              <button onClick={() => setShowUploadModal(true)} className="neu-accent px-6 py-3 rounded-xl font-semibold">Upload Bot</button>
            </div>
          ) : (
            bots.map((bot, i) => (
              <motion.div key={bot.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="neu-raised rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center"><ChessPieces.Knight color="dark" size={24} /></div>
                  <div>
                    <div className="font-semibold text-[#2C1810]">{bot.name}</div>
                    <div className="text-xs text-[#8B7A6A]">{bot.filename}</div>
                  </div>
                </div>
                {bot.description && <p className="text-sm text-[#5C4A3A] mb-4">{bot.description}</p>}
                <div className="pt-4 border-t border-[#c9c1b5]/30">
                  <div className="text-xs text-[#8B7A6A]">Created: {new Date(bot.created_at).toLocaleDateString()}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="mt-12 text-center">
          <button onClick={() => navigate("/")} className="neu-btn px-6 py-3 rounded-xl font-medium text-[#5C4A3A] inline-flex items-center gap-2"><Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back to home</button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#E8E0D4] grain">
        <Navbar />
        <ToastContainer />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live" element={<LiveMatch />} />
          <Route path="/play" element={<Play />} />
          <Route path="/play/human" element={<HumanGame />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/arena" element={<BotArena />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
