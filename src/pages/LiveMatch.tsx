import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "../ChessPieces";
import { createChessGame, getGameState, getBotMove, generateCommentary, type GameState } from "../services/chessEngine";
import { saveCompletedGame } from "../services/gameHistory";
import { toast } from "../components/Toast";

const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  sparkle: "M12 3v18M3 12h18",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z",
};

export default function LiveMatch() {
  const navigate = useNavigate();
  const [game, setGame] = useState(createChessGame());
  const [gameState, setGameState] = useState<GameState>(getGameState(createChessGame()));
  const [commentary, setCommentary] = useState("Match starting...");
  const [viewers, setViewers] = useState(Math.floor(Math.random() * 40) + 10);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [matchStatus, setMatchStatus] = useState<"playing" | "completed">("playing");
  const [matchResult, setMatchResult] = useState("");
  const [bot1Name] = useState("StockfishBot");
  const [bot2Name] = useState("AlphaClone");
  const [startTime] = useState(Date.now());
  const [showGameOver, setShowGameOver] = useState(false);

  // Viewer count simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setViewers(prev => Math.max(10, Math.min(500, prev + Math.floor(Math.random() * 8) - 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    if (matchStatus === "completed") return;
    const timer = setInterval(() => {
      if (gameState.turn === "w") {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.turn, matchStatus]);

  // Bot vs Bot gameplay
  useEffect(() => {
    if (matchStatus === "completed" || gameState.isGameOver) return;

    const interval = setInterval(() => {
      const botMove = getBotMove(game, "medium");
      if (botMove) {
        const move = game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
        if (move) {
          const newState = getGameState(game);
          setGameState(newState);
          
          // Generate AI commentary
          const comment = generateCommentary(move, newState, newState.moveHistory.slice(0, -1));
          setCommentary(comment);
        }
      }
    }, 2000); // Bot moves every 2 seconds

    return () => clearInterval(interval);
  }, [game, gameState.isGameOver, matchStatus]);

  // Check for game over
  useEffect(() => {
    if (gameState.isGameOver && matchStatus === "playing") {
      let result = "";
      let resultType: 'white' | 'black' | 'draw' = 'draw';
      
      if (gameState.isCheckmate) {
        if (gameState.turn === "w") {
          result = `${bot2Name} wins by checkmate!`;
          resultType = 'black';
        } else {
          result = `${bot1Name} wins by checkmate!`;
          resultType = 'white';
        }
      } else if (gameState.isDraw) {
        result = "Game drawn!";
        resultType = 'draw';
      }
      
      setMatchResult(result);
      setMatchStatus("completed");
      setShowGameOver(true);
      
      // Save game to history
      const duration = Math.floor((Date.now() - startTime) / 1000);
      saveCompletedGame(bot1Name, bot2Name, resultType, gameState.moveHistory, duration);
      toast.success(result);
    }
  }, [gameState.isGameOver, matchStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderPiece = (piece: string | null) => {
    if (!piece) return null;
    const color = piece[0] === 'w' ? 'light' : 'dark';
    const type = piece[1].toUpperCase() + piece.slice(2);
    const PieceComponent = ChessPieces[type as keyof typeof ChessPieces];
    if (!PieceComponent) return null;
    return <PieceComponent color={color as "dark" | "light"} size={40} />;
  };

  const startNewMatch = () => {
    const newGame = createChessGame();
    setGame(newGame);
    setGameState(getGameState(newGame));
    setCommentary("New match starting...");
    setWhiteTime(600);
    setBlackTime(600);
    setMatchStatus("playing");
    setMatchResult("");
    setShowGameOver(false);
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${matchStatus === "playing" ? "bg-red-500 animate-pulse-soft" : "bg-yellow-500"}`}>
                {matchStatus === "playing" ? "LIVE" : "COMPLETED"}
              </span>
              <span className="text-sm text-cyan-300">Bot vs Bot Match</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">
              {bot1Name} vs {bot2Name}
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
              {/* Black Player (Bot 2) */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{bot2Name}</div>
                    <div className="text-xs text-cyan-300">2812 ELO • Black</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${gameState.turn === "b" && matchStatus === "playing" ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(blackTime)}
                  </div>
                </div>
              </div>

              {/* Chess Board */}
              <div className="flex justify-center my-6">
                <div className="w-full max-w-md aspect-square grid grid-cols-8 gap-0 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                  {gameState.board.map((row, rowIndex) =>
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const file = String.fromCharCode(97 + colIndex);
                      const rank = (8 - rowIndex).toString();
                      const square = `${file}${rank}`;
                      const isLastMove = gameState.moveHistory.length > 0 && 
                        (gameState.moveHistory[gameState.moveHistory.length - 1].from === square || 
                         gameState.moveHistory[gameState.moveHistory.length - 1].to === square);

                      return (
                        <div key={`${rowIndex}-${colIndex}`} className={`aspect-square flex items-center justify-center transition-all duration-500 ${isLight ? "bg-slate-200" : "bg-slate-500"} ${isLastMove ? "ring-2 ring-inset ring-cyan-400" : ""}`}>
                          {piece && (
                            <motion.div key={`${piece}-${rowIndex}-${colIndex}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                              {renderPiece(piece)}
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* White Player (Bot 1) */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.Knight color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{bot1Name}</div>
                    <div className="text-xs text-cyan-300">2847 ELO • White</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${gameState.turn === "w" && matchStatus === "playing" ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(whiteTime)}
                  </div>
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

            {/* Move History */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Moves ({gameState.moveHistory.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gameState.moveHistory.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-4">Waiting for first move...</div>
                ) : (
                  gameState.moveHistory.map((move, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/10 transition-colors">
                      <span className="text-xs text-cyan-300 w-8">{Math.floor(idx / 2) + 1}.</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 0 ? move.san : "..."}</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 1 ? move.san : ""}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <motion.div key={commentary} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Icon path={iconPaths.sparkle} size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400 uppercase">AI Commentary</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{commentary}</p>
            </motion.div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Match Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Current Move</span>
                  <span className="text-sm font-semibold text-cyan-400">{gameState.moveHistory.length + 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Status</span>
                  <span className={`text-sm font-semibold ${matchStatus === "completed" ? "text-yellow-400" : "text-green-400"}`}>
                    {matchStatus === "completed" ? "Completed" : "In Progress"}
                  </span>
                </div>
                {gameState.isCheck && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-400">Check!</span>
                    <span className="text-sm font-semibold text-red-400">King under attack</span>
                  </div>
                )}
              </div>
            </div>

            {matchStatus === "completed" && (
              <button onClick={startNewMatch} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                Start New Match
              </button>
            )}

            <button onClick={() => navigate("/")} className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
              Back to Home
            </button>
          </div>
        </div>

        {/* Game Over Modal */}
        <AnimatePresence>
          {showGameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="font-display text-3xl font-bold text-white mb-2">Match Complete!</h2>
                  <p className="text-xl text-cyan-400 mb-6">{matchResult}</p>
                  <div className="space-y-3">
                    <button onClick={startNewMatch} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                      Watch Another Match
                    </button>
                    <button onClick={() => navigate("/analysis")} className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
                      View Analysis
                    </button>
                    <button onClick={() => navigate("/")} className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
                      Back to Home
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
