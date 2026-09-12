import { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Move } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "./ChessPieces";

// ─── TYPES ──────────────────────────────────────────────────────────────────
type Page = "home" | "live" | "play" | "tournaments" | "analysis";
type GameMode = "human" | "bot";

interface Bot {
  id: number;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  avatar: string;
}

interface GameRecord {
  id: string;
  white: string;
  black: string;
  result: "white" | "black" | "draw";
  moves: number;
  date: string;
}

// ─── BOT DATA ───────────────────────────────────────────────────────────────
const BOTS: Bot[] = [
  { id: 1, name: "StockfishBot", difficulty: "hard", avatar: "🤖" },
  { id: 2, name: "AlphaClone", difficulty: "hard", avatar: "🧠" },
  { id: 3, name: "DeepPawn", difficulty: "medium", avatar: "♟️" },
  { id: 4, name: "KnightRider", difficulty: "medium", avatar: "🐴" },
  { id: 5, name: "RookieBot", difficulty: "easy", avatar: "🏰" },
  { id: 6, name: "BishopAI", difficulty: "easy", avatar: "⛪" },
];

// ─── CHESS ENGINE HELPERS ───────────────────────────────────────────────────
function getBotMove(game: Chess, difficulty: "easy" | "medium" | "hard"): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  if (difficulty === "easy") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

  const scored = moves.map(move => {
    const testGame = new Chess(game.fen());
    testGame.move(move.san);
    let score = 0;
    const board = testGame.board();
    for (const row of board) {
      for (const cell of row) {
        if (cell) {
          const val = pieceValues[cell.type] || 0;
          score += cell.color === "w" ? val : -val;
        }
      }
    }
    score += (testGame.turn() === "w" ? 1 : -1) * testGame.moves().length * 2;
    if (testGame.isCheckmate()) score += (testGame.turn() === "w" ? -10000 : 10000);
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === "medium") {
    const top = scored.slice(0, Math.min(5, scored.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  return scored[0].move;
}

function generateCommentary(move: Move, game: Chess): string {
  if (game.isCheckmate()) return "♚ Checkmate! A brilliant finish!";
  if (game.isCheck()) return "⚡ Check! The king is under attack!";
  if (move.captured) return `⚔️ Capture! ${move.piece.toUpperCase()}x${move.to}`;
  if (move.flags.includes("k") || move.flags.includes("q")) return "🏰 Castling! King finds safety.";
  if (move.promotion) return `👑 Promotion! A new queen rises!`;
  const comments = ["Solid move.", "Interesting choice.", "The position grows complex.", "Strategic maneuvering."];
  return comments[Math.floor(Math.random() * comments.length)];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── CHESS BOARD COMPONENT ──────────────────────────────────────────────────
function ChessBoard({
  game,
  selectedSquare,
  legalMoves,
  onSquareClick,
  flipped = false,
  size = "md",
}: {
  game: Chess;
  selectedSquare: string | null;
  legalMoves: string[];
  onSquareClick: (sq: string) => void;
  flipped?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = size === "sm" ? "w-64 h-64" : size === "md" ? "w-80 h-80 sm:w-96 sm:h-96" : "w-full max-w-lg aspect-square";
  const board = game.board();
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <div className={`${sizeClasses} grid grid-cols-8 rounded-xl overflow-hidden shadow-2xl border border-white/10`}>
      {rows.map(r =>
        cols.map(c => {
          const sq = `${"abcdefgh"[c]}${8 - r}`;
          const piece = board[r][c];
          const isLight = (r + c) % 2 === 0;
          const isSelected = selectedSquare === sq;
          const isLegal = legalMoves.includes(sq);
          const isLastMove = game.history({ verbose: true }).length > 0 &&
            (game.history({ verbose: true }).slice(-1)[0]?.to === sq || game.history({ verbose: true }).slice(-1)[0]?.from === sq);

          const PieceComponent = piece ? ChessPieces[piece.type === "p" ? "Pawn" : piece.type === "n" ? "Knight" : piece.type === "b" ? "Bishop" : piece.type === "r" ? "Rook" : piece.type === "q" ? "Queen" : "King"] : null;

          return (
            <div
              key={sq}
              onClick={() => onSquareClick(sq)}
              className={`aspect-square flex items-center justify-center cursor-pointer relative transition-all duration-150 ${
                isLight ? "bg-[#e8dcc8]" : "bg-[#8b6e4e]"
              } ${isSelected ? "ring-2 ring-inset ring-yellow-400" : ""} ${isLastMove ? (isLight ? "bg-[#f0e68c]" : "bg-[#b8a038]") : ""}`}
            >
              {PieceComponent && (
                <PieceComponent
                  color={piece!.color === "w" ? "light" : "dark"}
                  size={size === "sm" ? 20 : size === "md" ? 28 : 36}
                />
              )}
              {isLegal && !piece && (
                <div className="absolute w-[30%] h-[30%] rounded-full bg-black/20" />
              )}
              {isLegal && piece && (
                <div className="absolute inset-0 ring-4 ring-inset ring-black/20 rounded-sm" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── ICON COMPONENT ─────────────────────────────────────────────────────────
function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, string> = {
    play: "M5 3l14 9-14 9V3z",
    trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z",
    brain: "M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6l1 2h6l1-2c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    arrow: "M5 12h14M12 5l7 7-7 7",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
    menu: "M3 12h18M3 6h18M3 18h18",
    x: "M18 6L6 18M6 6l12 12",
    chart: "M18 20V10M12 20V4M6 20v-6",
    zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={paths[name] || paths.home} />
    </svg>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] grain">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => setPage("home")} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
                <ChessPieces.Knight color="dark" size={18} />
              </div>
              <span className="font-display text-xl font-semibold text-white hidden sm:block">
                Chess<span className="gold-text">Bot</span>
              </span>
            </button>

            <div className="hidden md:flex items-center gap-1">
              {[
                { label: "Home", page: "home" as Page },
                { label: "Live Match", page: "live" as Page },
                { label: "Play", page: "play" as Page },
                { label: "Tournaments", page: "tournaments" as Page },
                { label: "Analysis", page: "analysis" as Page },
              ].map(item => (
                <button
                  key={item.page}
                  onClick={() => setPage(item.page)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    page === item.page
                      ? "text-yellow-400 bg-white/5"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Icon name={mobileMenuOpen ? "x" : "menu"} size={24} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/5"
            >
              <div className="p-4 space-y-1">
                {[
                  { label: "Home", page: "home" as Page },
                  { label: "Live Match", page: "live" as Page },
                  { label: "Play", page: "play" as Page },
                  { label: "Tournaments", page: "tournaments" as Page },
                  { label: "Analysis", page: "analysis" as Page },
                ].map(item => (
                  <button
                    key={item.page}
                    onClick={() => { setPage(item.page); setMobileMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      page === item.page ? "text-yellow-400 bg-white/5" : "text-zinc-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Pages */}
      <main className="relative pt-16">
        <AnimatePresence mode="wait">
          {page === "home" && <HomePage key="home" setPage={setPage} />}
          {page === "live" && <LiveMatchPage key="live" />}
          {page === "play" && <PlayPage key="play" />}
          {page === "tournaments" && <TournamentsPage key="tournaments" />}
          {page === "analysis" && <AnalysisPage key="analysis" />}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── HOME PAGE ──────────────────────────────────────────────────────────────
function HomePage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen">
      {/* Hero */}
      <section className="relative px-4 sm:px-6 pt-20 pb-32">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-live" />
              Live matches happening now
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight">
              Where AI Bots
              <br />
              <span className="gold-text italic">Battle</span> for Glory
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Watch autonomous chess engines compete in real-time tournaments.
              Upload your bot, analyze games, and climb the leaderboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setPage("live")}
                className="px-8 py-4 gold-gradient rounded-xl font-semibold text-black hover:scale-105 transition-transform flex items-center gap-2 glow-gold"
              >
                <Icon name="play" size={18} />
                Watch Live Match
              </button>
              <button
                onClick={() => setPage("play")}
                className="px-8 py-4 glass rounded-xl font-semibold text-white hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <Icon name="zap" size={18} />
                Play Chess
              </button>
            </div>
          </motion.div>

          {/* Decorative board */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 flex justify-center"
          >
            <div className="animate-float">
              <MiniBoard />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "eye",
                title: "Live Bot Matches",
                desc: "Watch AI engines compete in real-time with live commentary and analysis.",
                action: () => setPage("live"),
              },
              {
                icon: "users",
                title: "Play vs Humans",
                desc: "Challenge friends locally or test your skills against different bot difficulties.",
                action: () => setPage("play"),
              },
              {
                icon: "trophy",
                title: "Tournaments",
                desc: "Create and manage automated tournaments with bracket progression.",
                action: () => setPage("tournaments"),
              },
              {
                icon: "chart",
                title: "Deep Analysis",
                desc: "Review completed games with move quality analysis and critical moments.",
                action: () => setPage("analysis"),
              },
              {
                icon: "brain",
                title: "Bot Arena",
                desc: "Upload your chess engine and watch it battle other bots autonomously.",
                action: () => setPage("tournaments"),
              },
              {
                icon: "zap",
                title: "Real-time Engine",
                desc: "Powered by chess.js with full rule enforcement and move validation.",
                action: () => setPage("play"),
              },
            ].map((feature, i) => (
              <motion.button
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                onClick={feature.action}
                className="glass rounded-2xl p-6 text-left group hover:bg-white/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon name={feature.icon} size={22} className="text-black" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400">{feature.desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-4xl mx-auto glass rounded-2xl p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: "1,247", label: "Games Played" },
              { value: "42", label: "Active Bots" },
              { value: "18", label: "Tournaments" },
              { value: "99.9%", label: "Uptime" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-3xl sm:text-4xl font-bold gold-text">{stat.value}</div>
                <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ─── MINI BOARD (decorative) ────────────────────────────────────────────────
function MiniBoard() {
  const pieces: Record<string, { piece: keyof typeof ChessPieces; color: "dark" | "light" }> = {
    "4-0": { piece: "King", color: "dark" }, "3-0": { piece: "Queen", color: "dark" },
    "4-7": { piece: "King", color: "light" }, "3-7": { piece: "Queen", color: "light" },
    "2-3": { piece: "Knight", color: "light" }, "5-4": { piece: "Bishop", color: "dark" },
  };

  return (
    <div className="w-48 h-48 sm:w-64 sm:h-64 grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border border-white/10 glow-gold">
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8), c = i % 8;
        const isLight = (r + c) % 2 === 0;
        const p = pieces[`${c}-${r}`];
        const Piece = p ? ChessPieces[p.piece] : null;
        return (
          <div key={i} className={`aspect-square flex items-center justify-center ${isLight ? "bg-[#e8dcc8]" : "bg-[#8b6e4e]"}`}>
            {Piece && <Piece color={p.color} size={18} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── LIVE MATCH PAGE ────────────────────────────────────────────────────────
function LiveMatchPage() {
  const [game, setGame] = useState(new Chess());
  const [commentary, setCommentary] = useState("Match starting...");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isPlaying, setIsPlaying] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState("");
  const [viewers, setViewers] = useState(42);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Viewer count
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(v => Math.max(10, Math.min(200, v + Math.floor(Math.random() * 10) - 4)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    if (!isPlaying || gameOver) return;
    const timer = setInterval(() => {
      if (game.turn() === "w") setWhiteTime(t => Math.max(0, t - 1));
      else setBlackTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [game, isPlaying, gameOver]);

  // Bot vs Bot play
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const makeBotMove = () => {
      setGame(prev => {
        const newGame = new Chess(prev.fen());
        if (newGame.isGameOver()) {
          setGameOver(true);
          setIsPlaying(false);
          if (newGame.isCheckmate()) {
            setResult(newGame.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!");
          } else {
            setResult("Draw!");
          }
          return prev;
        }

        const difficulty = Math.random() > 0.5 ? "hard" : "medium";
        const move = getBotMove(newGame, difficulty);
        if (move) {
          newGame.move(move.san);
          const state = {
            isCheckmate: newGame.isCheckmate(),
            isCheck: newGame.isCheck(),
            turn: newGame.turn(),
            isGameOver: newGame.isGameOver(),
            isDraw: newGame.isDraw(),
            moveHistory: newGame.history({ verbose: true }),
            board: newGame.board(),
            fen: newGame.fen(),
          };
          setCommentary(generateCommentary(move, state as any));
          setMoveHistory(newGame.history());

          if (newGame.isGameOver()) {
            setGameOver(true);
            setIsPlaying(false);
            if (newGame.isCheckmate()) {
              setResult(newGame.turn() === "w" ? "Black wins by checkmate!" : "White wins by checkmate!");
            } else {
              setResult("Draw!");
            }
          }
        }
        return newGame;
      });
    };

    intervalRef.current = setInterval(makeBotMove, 1500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, gameOver]);

  const handleNewGame = () => {
    setGame(new Chess());
    setCommentary("New match starting...");
    setWhiteTime(600);
    setBlackTime(600);
    setGameOver(false);
    setResult("");
    setMoveHistory([]);
    setIsPlaying(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Live Match</h1>
            <p className="text-zinc-400 text-sm mt-1">StockfishBot vs AlphaClone</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg">
              <Icon name="eye" size={16} className="text-zinc-400" />
              <span className="text-sm text-zinc-300">{viewers}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-live" />
              <span className="text-sm text-red-400 font-medium">LIVE</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-4 sm:p-6">
              {/* Player info */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🤖</div>
                  <div>
                    <div className="text-white font-medium text-sm">StockfishBot</div>
                    <div className="text-zinc-500 text-xs">White</div>
                  </div>
                </div>
                <div className={`font-mono text-lg font-bold ${game.turn() === "w" && !gameOver ? "text-yellow-400" : "text-zinc-400"}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>

              {/* Board */}
              <div className="flex justify-center">
                <ChessBoard
                  game={game}
                  selectedSquare={null}
                  legalMoves={[]}
                  onSquareClick={() => {}}
                  size="lg"
                />
              </div>

              {/* Black player info */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">🧠</div>
                  <div>
                    <div className="text-white font-medium text-sm">AlphaClone</div>
                    <div className="text-zinc-500 text-xs">Black</div>
                  </div>
                </div>
                <div className={`font-mono text-lg font-bold ${game.turn() === "b" && !gameOver ? "text-yellow-400" : "text-zinc-400"}`}>
                  {formatTime(blackTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Commentary */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="zap" size={16} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">AI Commentary</span>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed">{commentary}</p>
            </div>

            {/* Move history */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Moves</h3>
              <div className="max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {moveHistory.map((move, i) => (
                    <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? "text-zinc-300" : "text-zinc-400"}`}>
                      {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."} {move}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Game over / controls */}
            {gameOver ? (
              <div className="glass rounded-2xl p-5 text-center">
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-white font-semibold mb-1">{result}</div>
                <button onClick={handleNewGame} className="mt-3 px-6 py-2 gold-gradient rounded-lg text-sm font-semibold text-black">
                  New Match
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-full glass rounded-2xl p-4 text-center hover:bg-white/5 transition-all"
              >
                <span className="text-sm text-zinc-300">{isPlaying ? "Pause" : "Resume"} Match</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── PLAY PAGE ──────────────────────────────────────────────────────────────
function PlayPage() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [commentary, setCommentary] = useState("Game started! White to move.");
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState("");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  // Timer
  useEffect(() => {
    if (gameOver || !mode) return;
    const timer = setInterval(() => {
      if (game.turn() === "w") setWhiteTime(t => Math.max(0, t - 1));
      else setBlackTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [game, gameOver, mode]);

  // Bot move
  useEffect(() => {
    if (mode !== "bot" || gameOver || game.turn() !== "b") return;
    const timeout = setTimeout(() => {
      const newGame = new Chess(game.fen());
      const move = getBotMove(newGame, botDifficulty);
      if (move) {
        newGame.move(move.san);
        const state = {
          isCheckmate: newGame.isCheckmate(),
          isCheck: newGame.isCheck(),
          turn: newGame.turn(),
          isGameOver: newGame.isGameOver(),
          isDraw: newGame.isDraw(),
          moveHistory: newGame.history({ verbose: true }),
          board: newGame.board(),
          fen: newGame.fen(),
        };
        setCommentary(generateCommentary(move, state as any));
        setGame(newGame);
        if (newGame.isGameOver()) {
          setGameOver(true);
          if (newGame.isCheckmate()) setResult("Bot wins by checkmate!");
          else setResult("Draw!");
        }
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [game, mode, gameOver, botDifficulty]);

  const handleSquareClick = useCallback((sq: string) => {
    if (gameOver) return;
    if (mode === "bot" && game.turn() === "b") return;

    const piece = game.get(sq as any);

    if (selectedSquare) {
      // Try to make a move
      const newGame = new Chess(game.fen());
      try {
        const move = newGame.move({ from: selectedSquare, to: sq });
        if (move) {
          const state = {
            isCheckmate: newGame.isCheckmate(),
            isCheck: newGame.isCheck(),
            turn: newGame.turn(),
            isGameOver: newGame.isGameOver(),
            isDraw: newGame.isDraw(),
            moveHistory: newGame.history({ verbose: true }),
            board: newGame.board(),
            fen: newGame.fen(),
          };
          setCommentary(generateCommentary(move, state as any));
          setGame(newGame);
          setSelectedSquare(null);
          setLegalMoves([]);

          if (newGame.isGameOver()) {
            setGameOver(true);
            if (newGame.isCheckmate()) {
              setResult(newGame.turn() === "w" ? "Black wins!" : "White wins!");
            } else {
              setResult("Draw!");
            }
          }
          return;
        }
      } catch { /* invalid move */ }

      // If clicked own piece, select it
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
        const moves = game.moves({ square: sq as any, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      // Select a piece
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
        const moves = game.moves({ square: sq as any, verbose: true });
        setLegalMoves(moves.map(m => m.to));
      }
    }
  }, [game, selectedSquare, gameOver, mode]);

  const startNewGame = (m: GameMode) => {
    setMode(m);
    setGame(new Chess());
    setSelectedSquare(null);
    setLegalMoves([]);
    setCommentary("Game started! White to move.");
    setGameOver(false);
    setResult("");
    setWhiteTime(600);
    setBlackTime(600);
  };

  if (!mode) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white text-center mb-3">Play Chess</h1>
          <p className="text-zinc-400 text-center mb-12">Choose your game mode</p>

          <div className="grid sm:grid-cols-2 gap-6">
            <button
              onClick={() => startNewGame("human")}
              className="glass rounded-2xl p-8 text-left group hover:bg-white/5 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon name="users" size={28} className="text-black" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-white mb-2">Play vs Human</h2>
              <p className="text-zinc-400 text-sm mb-4">Local 2-player game on the same device</p>
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <span>Start game</span>
                <Icon name="arrow" size={14} />
              </div>
            </button>

            <button
              onClick={() => startNewGame("bot")}
              className="glass rounded-2xl p-8 text-left group hover:bg-white/5 transition-all"
            >
              <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon name="brain" size={28} className="text-black" />
              </div>
              <h2 className="font-display text-2xl font-semibold text-white mb-2">Play vs Bot</h2>
              <p className="text-zinc-400 text-sm mb-4">Challenge an AI with adjustable difficulty</p>
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <span>Start game</span>
                <Icon name="arrow" size={14} />
              </div>
            </button>
          </div>

          {mode === null && (
            <div className="mt-8 text-center">
              <button onClick={() => {}} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                ← Back to home
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              {mode === "human" ? "Human vs Human" : "You vs Bot"}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {game.turn() === "w" ? "White" : "Black"} to move
              {game.isCheck() && " • Check!"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {mode === "bot" && (
              <select
                value={botDifficulty}
                onChange={(e) => setBotDifficulty(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            )}
            <button
              onClick={() => setMode(null)}
              className="glass px-4 py-2 rounded-lg text-sm text-zinc-300 hover:bg-white/5"
            >
              New Game
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-4 sm:p-6">
              {/* White player */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <ChessPieces.King color="light" size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{mode === "bot" ? "You" : "White"}</div>
                  </div>
                </div>
                <div className={`font-mono text-lg font-bold ${game.turn() === "w" ? "text-yellow-400" : "text-zinc-400"}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>

              <div className="flex justify-center">
                <ChessBoard
                  game={game}
                  selectedSquare={selectedSquare}
                  legalMoves={legalMoves}
                  onSquareClick={handleSquareClick}
                  flipped={false}
                  size="lg"
                />
              </div>

              {/* Black player */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <ChessPieces.King color="dark" size={20} />
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{mode === "bot" ? "Bot" : "Black"}</div>
                  </div>
                </div>
                <div className={`font-mono text-lg font-bold ${game.turn() === "b" ? "text-yellow-400" : "text-zinc-400"}`}>
                  {formatTime(blackTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Commentary */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="zap" size={16} className="text-yellow-400" />
                <span className="text-sm font-medium text-white">Commentary</span>
              </div>
              <p className="text-zinc-300 text-sm">{commentary}</p>
            </div>

            {/* Move list */}
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Moves</h3>
              <div className="max-h-60 overflow-y-auto">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {game.history().map((move, i) => (
                    <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? "text-zinc-300" : "text-zinc-400"}`}>
                      {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."} {move}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Game over */}
            {gameOver && (
              <div className="glass rounded-2xl p-5 text-center glow-gold">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-white font-semibold mb-1">Game Over</div>
                <div className="text-zinc-400 text-sm mb-3">{result}</div>
                <button
                  onClick={() => startNewGame(mode)}
                  className="px-6 py-2 gold-gradient rounded-lg text-sm font-semibold text-black"
                >
                  Play Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TOURNAMENTS PAGE ───────────────────────────────────────────────────────
function TournamentsPage() {
  const [bots] = useState(BOTS);
  const [selectedBots, setSelectedBots] = useState<number[]>([]);
  const [tournamentRunning, setTournamentRunning] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<{ bot1: Bot; bot2: Bot } | null>(null);
  const [results, setResults] = useState<{ winner: string; loser: string }[]>([]);
  const [champion, setChampion] = useState<string | null>(null);

  const toggleBot = (id: number) => {
    setSelectedBots(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : prev.length < 8 ? [...prev, id] : prev
    );
  };

  const startTournament = () => {
    if (selectedBots.length < 2) return;
    setTournamentRunning(true);
    setResults([]);
    setChampion(null);
    runNextMatch([...selectedBots]);
  };

  const runNextMatch = (remaining: number[]) => {
    if (remaining.length <= 1) {
      const winner = BOTS.find(b => b.id === remaining[0]);
      setChampion(winner?.name || "Unknown");
      setTournamentRunning(false);
      setCurrentMatch(null);
      return;
    }

    // Pick two random bots
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    const bot1 = BOTS.find(b => b.id === shuffled[0])!;
    const bot2 = BOTS.find(b => b.id === shuffled[1])!;
    setCurrentMatch({ bot1, bot2 });

    // Simulate match
    setTimeout(() => {
      const game = new Chess();
      let moves = 0;
      while (!game.isGameOver() && moves < 100) {
        const diff1 = bot1.difficulty;
        const diff2 = bot2.difficulty;
        const currentDiff = game.turn() === "w" ? diff1 : diff2;
        const move = getBotMove(game, currentDiff);
        if (move) game.move(move.san);
        moves++;
      }

      let winnerId: number;
      if (game.isCheckmate()) {
        winnerId = game.turn() === "w" ? bot2.id : bot1.id;
      } else {
        winnerId = Math.random() > 0.5 ? bot1.id : bot2.id;
      }

      const loserId = winnerId === bot1.id ? bot2.id : bot1.id;
      const winnerBot = BOTS.find(b => b.id === winnerId)!;
      const loserBot = BOTS.find(b => b.id === loserId)!;

      setResults(prev => [...prev, { winner: winnerBot.name, loser: loserBot.name }]);

      const nextRemaining = remaining.filter(id => id !== loserId);
      setTimeout(() => runNextMatch(nextRemaining), 1000);
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">Tournaments</h1>
        <p className="text-zinc-400 mb-8">Create knockout tournaments between AI bots</p>

        {/* Bot selection */}
        {!tournamentRunning && !champion && (
          <>
            <div className="glass rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Bots ({selectedBots.length}/8)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {bots.map(bot => (
                  <button
                    key={bot.id}
                    onClick={() => toggleBot(bot.id)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      selectedBots.includes(bot.id)
                        ? "bg-yellow-500/20 border-2 border-yellow-500/50"
                        : "glass hover:bg-white/5"
                    }`}
                  >
                    <div className="text-2xl mb-2">{bot.avatar}</div>
                    <div className="text-xs text-white font-medium truncate">{bot.name}</div>
                    <div className="text-xs text-zinc-500 mt-1 capitalize">{bot.difficulty}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startTournament}
              disabled={selectedBots.length < 2}
              className={`px-8 py-4 rounded-xl font-semibold transition-all ${
                selectedBots.length >= 2
                  ? "gold-gradient text-black hover:scale-105 glow-gold"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              }`}
            >
              Start Tournament ({selectedBots.length} bots)
            </button>
          </>
        )}

        {/* Running tournament */}
        {tournamentRunning && currentMatch && (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-sm text-zinc-400 mb-6">Current Match</div>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-4xl mb-2">{currentMatch.bot1.avatar}</div>
                <div className="text-white font-medium">{currentMatch.bot1.name}</div>
                <div className="text-xs text-zinc-500 capitalize">{currentMatch.bot1.difficulty}</div>
              </div>
              <div className="text-2xl text-zinc-500 font-display">vs</div>
              <div className="text-center">
                <div className="text-4xl mb-2">{currentMatch.bot2.avatar}</div>
                <div className="text-white font-medium">{currentMatch.bot2.name}</div>
                <div className="text-xs text-zinc-500 capitalize">{currentMatch.bot2.difficulty}</div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm text-zinc-400">Match in progress...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-8 glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Match Results</h3>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/5">
                  <span className="text-zinc-400 text-sm">Match {i + 1}</span>
                  <span className="text-yellow-400 text-sm font-medium">{r.winner}</span>
                  <span className="text-zinc-500 text-sm">defeated</span>
                  <span className="text-zinc-300 text-sm">{r.loser}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Champion */}
        {champion && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-8 glass rounded-2xl p-8 text-center glow-gold-strong"
          >
            <div className="text-5xl mb-4">🏆</div>
            <div className="text-sm text-zinc-400 mb-2">Tournament Champion</div>
            <div className="font-display text-3xl font-bold gold-text">{champion}</div>
            <button
              onClick={() => { setChampion(null); setResults([]); setSelectedBots([]); }}
              className="mt-6 px-6 py-3 gold-gradient rounded-xl text-sm font-semibold text-black"
            >
              New Tournament
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── ANALYSIS PAGE ──────────────────────────────────────────────────────────
function AnalysisPage() {
  const [games] = useState<GameRecord[]>(() => {
    const saved = localStorage.getItem("chessbot_analysis_games");
    if (saved) return JSON.parse(saved);
    // Generate some demo games
    const demoGames: GameRecord[] = [
      { id: "1", white: "StockfishBot", black: "AlphaClone", result: "white", moves: 42, date: "2024-01-15" },
      { id: "2", white: "DeepPawn", black: "KnightRider", result: "black", moves: 38, date: "2024-01-14" },
      { id: "3", white: "You", black: "RookieBot", result: "white", moves: 28, date: "2024-01-13" },
      { id: "4", white: "AlphaClone", black: "BishopAI", result: "white", moves: 55, date: "2024-01-12" },
      { id: "5", white: "StockfishBot", black: "DeepPawn", result: "draw", moves: 60, date: "2024-01-11" },
    ];
    localStorage.setItem("chessbot_analysis_games", JSON.stringify(demoGames));
    return demoGames;
  });

  const totalGames = games.length;
  const whiteWins = games.filter(g => g.result === "white").length;
  const blackWins = games.filter(g => g.result === "black").length;
  const draws = games.filter(g => g.result === "draw").length;
  const avgMoves = Math.round(games.reduce((s, g) => s + g.moves, 0) / totalGames);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen px-4 sm:px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-3">Analysis</h1>
        <p className="text-zinc-400 mb-8">Game statistics and insights</p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Games", value: totalGames, color: "text-white" },
            { label: "White Wins", value: whiteWins, color: "text-green-400" },
            { label: "Black Wins", value: blackWins, color: "text-red-400" },
            { label: "Draws", value: draws, color: "text-yellow-400" },
            { label: "Avg Moves", value: avgMoves, color: "text-blue-400" },
          ].map(stat => (
            <div key={stat.label} className="glass rounded-xl p-4 text-center">
              <div className={`font-display text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Win distribution bar */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h3 className="text-sm font-medium text-white mb-4">Win Distribution</h3>
          <div className="h-8 rounded-full overflow-hidden flex">
            <div className="bg-green-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${(whiteWins / totalGames) * 100}%` }}>
              {Math.round((whiteWins / totalGames) * 100)}%
            </div>
            <div className="bg-yellow-500 flex items-center justify-center text-xs font-bold text-black" style={{ width: `${(draws / totalGames) * 100}%` }}>
              {Math.round((draws / totalGames) * 100)}%
            </div>
            <div className="bg-red-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: `${(blackWins / totalGames) * 100}%` }}>
              {Math.round((blackWins / totalGames) * 100)}%
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            <span>White wins</span>
            <span>Draws</span>
            <span>Black wins</span>
          </div>
        </div>

        {/* Game history */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Games</h3>
          <div className="space-y-2">
            {games.map(game => (
              <div key={game.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    game.result === "white" ? "bg-green-500" : game.result === "black" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                  <div>
                    <div className="text-sm text-white">
                      {game.white} <span className="text-zinc-500">vs</span> {game.black}
                    </div>
                    <div className="text-xs text-zinc-500">{game.date}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-300 capitalize">{game.result === "white" ? "White wins" : game.result === "black" ? "Black wins" : "Draw"}</div>
                  <div className="text-xs text-zinc-500">{game.moves} moves</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
