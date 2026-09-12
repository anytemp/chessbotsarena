import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "./ChessPieces";
import { getCurrentUser, signIn, signUp, signOut, type User } from "./services/auth";
import { getGameStats } from "./services/gameHistory";
import HumanGame from "./pages/HumanGame";
import LiveMatch from "./pages/LiveMatch";
import Analysis from "./pages/Analysis";
import TournamentPage from "./pages/Tournament";
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
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
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
  const [user, setUser] = useState<User | null>(getCurrentUser());
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

  const handleSignOut = () => {
    signOut();
    setUser(null);
    toast.success("Signed out successfully");
  };

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
              {user ? (
                <>
                  <span className="text-sm font-medium text-[#5C4A3A]">Hi, {user.username}</span>
                  <button onClick={handleSignOut} className="px-4 py-2 text-sm font-medium text-[#5C4A3A] hover:text-[#2C1810] inline-flex items-center gap-2">
                    <Icon path={iconPaths.logout} size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowSignIn(true)} className="px-4 py-2 text-sm font-medium text-[#5C4A3A] hover:text-[#2C1810]">Sign in</button>
                  <button onClick={() => setShowGetStarted(true)} className="px-5 py-2 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-[#F5EDE0] text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
                    Get Started
                  </button>
                </>
              )}
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
                  {user ? (
                    <>
                      <div className="mb-4">
                        <div className="text-sm text-[#8B7A6A]">Signed in as</div>
                        <div className="font-semibold text-[#2C1810]">{user.username}</div>
                      </div>
                      <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A] inline-flex items-center justify-center gap-2">
                        <Icon path={iconPaths.logout} size={16} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setShowSignIn(true); setMobileOpen(false); }} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A] mb-2">Sign in</button>
                      <button onClick={() => { setShowGetStarted(true); setMobileOpen(false); }} className="w-full py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-[#F5EDE0] rounded-xl font-semibold">Get Started</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign In Modal */}
      <AnimatePresence>
        {showSignIn && (
          <SignInModal
            onClose={() => setShowSignIn(false)}
            onSwitchToSignUp={() => { setShowSignIn(false); setShowGetStarted(true); }}
            onSignIn={(email, password) => {
              const u = signIn(email, password);
              setUser(u);
              setShowSignIn(false);
              toast.success(`Welcome back, ${u.username}!`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Get Started Modal */}
      <AnimatePresence>
        {showGetStarted && (
          <SignUpModal
            onClose={() => setShowGetStarted(false)}
            onSwitchToSignIn={() => { setShowGetStarted(false); setShowSignIn(true); }}
            onSignUp={(username, email, password) => {
              const u = signUp(username, email, password);
              setUser(u);
              setShowGetStarted(false);
              toast.success(`Welcome, ${u.username}! Account created.`);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── SIGN IN MODAL ──────────────────────────────────────────────────────────
function SignInModal({ onClose, onSwitchToSignUp, onSignIn }: { onClose: () => void; onSwitchToSignUp: () => void; onSignIn: (email: string, password: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    onSignIn(email, password);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Sign In</h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
          </div>
        </div>
        <button onClick={handleSubmit} className="w-full py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-white rounded-xl font-semibold hover:shadow-xl transition-all mb-3">
          Sign In
        </button>
        <button onClick={onClose} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
        <p className="text-center text-sm text-[#5C4A3A] mt-4">
          Don't have an account?{" "}
          <button onClick={onSwitchToSignUp} className="text-[#8B6914] font-semibold hover:underline">Get Started</button>
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── SIGN UP MODAL ──────────────────────────────────────────────────────────
function SignUpModal({ onClose, onSwitchToSignIn, onSignUp }: { onClose: () => void; onSwitchToSignIn: () => void; onSignUp: (username: string, email: string, password: string) => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = () => {
    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    onSignUp(username, email, password);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">Get Started</h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="chessmaster123" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none" />
          </div>
        </div>
        <button onClick={handleSubmit} className="w-full py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-white rounded-xl font-semibold hover:shadow-xl transition-all mb-3">
          Create Account
        </button>
        <button onClick={onClose} className="w-full py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
        <p className="text-center text-sm text-[#5C4A3A] mt-4">
          Already have an account?{" "}
          <button onClick={onSwitchToSignIn} className="text-[#8B6914] font-semibold hover:underline">Sign In</button>
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────────
function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(getGameStats());

  useEffect(() => {
    setStats(getGameStats());
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
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
              <span className="text-sm text-[#5C4A3A]">Bot Championship</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#2C1810] mb-3">Watch Live Match</h2>
            <p className="text-[#5C4A3A] mb-6">StockfishBot vs AlphaClone</p>
            <div className="flex justify-center mb-6"><ChessBoard size="md" /></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon path={iconPaths.eye} size={16} className="text-[#8B7A6A]" />
                <span className="text-sm font-medium text-[#2C1810]">Live now</span>
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
            <p className="text-sm text-[#5C4A3A] mb-4">Challenge humans or bots. Real chess logic with checkmate detection.</p>
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
              <div className="font-display text-4xl font-bold text-[#8B6914] mb-1">{stats.totalGames}</div>
              <div className="text-sm text-[#5C4A3A]">Games played</div>
            </div>
          </motion.div>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            onClick={() => navigate("/analysis")} className="neu-raised rounded-3xl p-6 text-left group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center mb-4">
              <Icon path={iconPaths.brain} size={22} className="text-[#8B6914]" />
            </div>
            <h3 className="font-display text-xl font-semibold text-[#2C1810] mb-2">AI Analysis</h3>
            <p className="text-xs text-[#5C4A3A]">Deep insights from your games</p>
          </motion.button>

          <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            onClick={() => navigate("/tournaments")} className="bento-1x2 neu-raised rounded-3xl p-6 text-left group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center mb-4">
              <Icon path={iconPaths.trophy} size={22} className="text-[#8B6914]" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-[#2C1810] mb-3">Tournaments</h3>
            <p className="text-sm text-[#5C4A3A] mb-4">Compete in automated tournaments</p>
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
            <p className="text-sm text-[#5C4A3A]">Upload your engine. Watch autonomous battles.</p>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ─── PLAY PAGE ──────────────────────────────────────────────────────────────
function Play() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-4xl mx-auto">
        <h1 className="luxury-heading text-5xl text-[#2C1810] mb-2 text-center">Play Chess</h1>
        <p className="text-[#5C4A3A] text-center mb-12">Choose your opponent</p>
        <div className="grid sm:grid-cols-2 gap-6">
          <button onClick={() => navigate("/play/human")} className="neu-raised rounded-3xl p-8 text-left group">
            <div className="w-16 h-16 rounded-2xl neu-flat flex items-center justify-center mb-4"><Icon path={iconPaths.users} size={32} className="text-[#8B6914]" /></div>
            <h2 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Play vs Human</h2>
            <p className="text-sm text-[#5C4A3A] mb-4">Local 2-player game with real chess logic and AI commentary</p>
            <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all"><span>Start game</span><Icon path={iconPaths.arrow} size={16} /></div>
          </button>
          <button onClick={() => { toast.info("Bot vs Bot matches available in Live Match page!"); navigate("/live"); }} className="neu-raised rounded-3xl p-8 text-left group">
            <div className="w-16 h-16 rounded-2xl neu-flat flex items-center justify-center mb-4"><Icon path={iconPaths.bot} size={32} className="text-[#8B6914]" /></div>
            <h2 className="font-display text-2xl font-semibold text-[#2C1810] mb-2">Watch Bot Match</h2>
            <p className="text-sm text-[#5C4A3A] mb-4">Watch AI bots play against each other in real-time</p>
            <div className="flex items-center gap-2 text-[#8B6914] font-medium group-hover:gap-3 transition-all"><span>Watch now</span><Icon path={iconPaths.arrow} size={16} /></div>
          </button>
        </div>
        <div className="mt-12 text-center">
          <button onClick={() => navigate("/")} className="neu-btn px-6 py-3 rounded-xl font-medium text-[#5C4A3A] inline-flex items-center gap-2">
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
  const [bots, setBots] = useState<{ id: number; name: string; filename: string; description: string }[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: "", filename: "", description: "" });

  useEffect(() => {
    const saved = localStorage.getItem("chessbots");
    if (saved) {
      setBots(JSON.parse(saved));
    } else {
      const demoBots = [
        { id: 1, name: "StockfishBot", filename: "stockfish.py", description: "Advanced chess engine" },
        { id: 2, name: "AlphaClone", filename: "alphazero.py", description: "Neural network based engine" },
      ];
      setBots(demoBots);
      localStorage.setItem("chessbots", JSON.stringify(demoBots));
    }
  }, []);

  const handleUpload = () => {
    if (!uploadForm.name || !uploadForm.filename) {
      toast.error("Please fill in bot name and select a file");
      return;
    }
    const newBot = { id: Date.now(), name: uploadForm.name, filename: uploadForm.filename, description: uploadForm.description };
    const newBots = [...bots, newBot];
    setBots(newBots);
    localStorage.setItem("chessbots", JSON.stringify(newBots));
    toast.success("Bot uploaded successfully!");
    setShowUploadModal(false);
    setUploadForm({ name: "", filename: "", description: "" });
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
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">Description</label>
                    <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="A brief description..." rows={3} className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none resize-none" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">Cancel</button>
                  <button onClick={handleUpload} className="flex-1 py-3 bg-[#8B6914] text-white rounded-xl font-semibold hover:bg-[#7a5a10] transition-colors">Upload Bot</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bots.map((bot, i) => (
            <motion.div key={bot.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="neu-raised rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center"><ChessPieces.Knight color="dark" size={24} /></div>
                <div>
                  <div className="font-semibold text-[#2C1810]">{bot.name}</div>
                  <div className="text-xs text-[#8B7A6A]">{bot.filename}</div>
                </div>
              </div>
              {bot.description && <p className="text-sm text-[#5C4A3A] mb-4">{bot.description}</p>}
            </motion.div>
          ))}
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
          <Route path="/tournaments" element={<TournamentPage />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/arena" element={<BotArena />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
