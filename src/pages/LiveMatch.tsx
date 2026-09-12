import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "../ChessPieces";
import { createChessGame, getGameState, getBotMove, generateCommentary, type GameState } from "../services/chessEngine";
import { saveCompletedGame } from "../services/gameHistory";
import { toast } from "../components/Toast";
import { speak, stop, isTTSAvailable } from "../services/tts";

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
  const [ttsEnabled, setTtsEnabled] = useState(false);

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

  // Bot vs Bot play
  useEffect(() => {
    if (matchStatus === "completed") return;

    const makeBotMove = () => {
      const currentGame = createChessGame();
      // Replay all moves
      gameState.moveHistory.forEach(move => {
        currentGame.move(move.san);
      });

      if (currentGame.isGameOver()) {
        setMatchStatus("completed");
        if (currentGame.isCheckmate()) {
          const winner = currentGame.turn() === "w" ? bot2Name : bot1Name;
          setMatchResult(`${winner} wins by checkmate!`);
        } else {
          setMatchResult("Match ended in a draw!");
        }
        setShowGameOver(true);
        const duration = Math.floor((Date.now() - startTime) / 1000);
        saveCompletedGame(bot1Name, bot2Name, currentGame.isCheckmate() ? (currentGame.turn() === "w" ? "black" : "white") : "draw", gameState.moveHistory, duration);
        toast.success("Match completed! Saved to history.");
        return;
      }

      // Get bot move
      const difficulty = Math.random() > 0.5 ? "hard" : "medium";
      const botMove = getBotMove(currentGame, difficulty);

      if (botMove) {
        const move = currentGame.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
        if (move) {
          const newState = getGameState(currentGame);
          setGameState(newState);
          setGame(currentGame);
          const newCommentary = generateCommentary(move, newState, newState.moveHistory);
          setCommentary(newCommentary);
          if (ttsEnabled && isTTSAvailable()) {
            speak(newCommentary);
          }

          if (currentGame.isGameOver()) {
            setMatchStatus("completed");
            if (currentGame.isCheckmate()) {
              const winner = currentGame.turn() === "w" ? bot2Name : bot1Name;
              setMatchResult(`${winner} wins by checkmate!`);
            } else {
              setMatchResult("Match ended in a draw!");
            }
            setShowGameOver(true);
            const duration = Math.floor((Date.now() - startTime) / 1000);
            saveCompletedGame(bot1Name, bot2Name, currentGame.isCheckmate() ? (currentGame.turn() === "w" ? "black" : "white") : "draw", newState.moveHistory, duration);
            toast.success("Match completed! Saved to history.");
          }
        }
      }
    };

    const interval = setInterval(makeBotMove, 1500);
    return () => clearInterval(interval);
  }, [matchStatus, ttsEnabled]);

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
    stop();
  };

  const board = gameState.board;

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-4xl text-white mb-1">Live Match</h1>
            <p className="text-gray-400 text-sm">{bot1Name} vs {bot2Name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl">
              <Icon path={iconPaths.eye} size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-white">{viewers} watching</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />
              <span className="text-sm font-semibold text-red-400">LIVE</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="glass-strong rounded-3xl p-4 sm:p-6 shadow-2xl">
              {/* Bot 1 (White) */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                    <ChessPieces.King color="dark" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{bot1Name}</div>
                    <div className="text-xs text-gray-400">White • Hard AI</div>
                  </div>
                </div>
                <div className={`font-mono text-xl font-bold ${gameState.turn === "w" && matchStatus === "playing" ? "text-yellow-400" : "text-gray-500"}`}>
                  {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
                </div>
              </div>

              {/* Chess board */}
              <div className="flex justify-center">
                <div className="w-full max-w-lg aspect-square grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
                  {Array.from({ length: 64 }, (_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isLight = (row + col) % 2 === 0;
                    const pieceData = board[row][col];
                    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
                    const square = `${"abcdefgh"[col]}${8 - row}`;
                    const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

                    let pieceComponent = null;
                    if (pieceData) {
                      const [color, type] = pieceData;
                      const pieceName = type === "p" ? "Pawn" : type === "n" ? "Knight" : type === "b" ? "Bishop" : type === "r" ? "Rook" : type === "q" ? "Queen" : "King";
                      const Piece = ChessPieces[pieceName as keyof typeof ChessPieces];
                      pieceComponent = <Piece color={color === "w" ? "light" : "dark"} size={32} />;
                    }

                    return (
                      <div
                        key={square}
                        className={`aspect-square flex items-center justify-center transition-all ${
                          isLight ? "bg-[#F0E4D0]" : "bg-[#B8956A]"
                        } ${isLastMove ? (isLight ? "bg-[#f0e68c]" : "bg-[#c9a84c]") : ""}`}
                      >
                        {pieceComponent}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bot 2 (Black) */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
                    <ChessPieces.King color="light" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{bot2Name}</div>
                    <div className="text-xs text-gray-400">Black • Medium AI</div>
                  </div>
                </div>
                <div className={`font-mono text-xl font-bold ${gameState.turn === "b" && matchStatus === "playing" ? "text-yellow-400" : "text-gray-500"}`}>
                  {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Commentary */}
            <div className="glass-strong rounded-3xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon path={iconPaths.sparkle} size={16} className="text-yellow-400" />
                  <span className="text-sm font-semibold text-white">AI Commentary</span>
                </div>
                <button onClick={() => { setTtsEnabled(!ttsEnabled); if (!ttsEnabled) stop(); }} className={`text-xs px-3 py-1 rounded-lg transition-all ${ttsEnabled ? "bg-yellow-500 text-black font-semibold" : "glass text-gray-300"}`}>
                  {ttsEnabled ? "🔊 On" : "🔇 Off"}
                </button>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{commentary}</p>
            </div>

            {/* Match status */}
            <div className="glass-strong rounded-3xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-3">Match Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-medium ${matchStatus === "playing" ? "text-green-400" : "text-yellow-400"}`}>
                    {matchStatus === "playing" ? "In Progress" : "Completed"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Moves</span>
                  <span className="font-medium text-white">{gameState.moveHistory.length}</span>
                </div>
                {gameState.isCheck && (
                  <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium">
                    ⚠️ Check!
                  </div>
                )}
              </div>
            </div>

            {/* Move history */}
            <div className="glass-strong rounded-3xl p-5 shadow-xl">
              <h3 className="text-sm font-semibold text-white mb-3">Move History</h3>
              <div className="max-h-48 overflow-y-auto">
                {gameState.moveHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">Match starting...</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {gameState.moveHistory.map((move, i) => (
                      <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? "text-gray-200" : "text-gray-400"}`}>
                        {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."} {move.san}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            {matchStatus === "completed" && (
              <button onClick={startNewMatch} className="w-full py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all">
                Start New Match
              </button>
            )}
          </div>
        </div>

        {/* Game over modal */}
        <AnimatePresence>
          {showGameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-strong rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="font-display text-3xl font-semibold text-white mb-2">Match Complete</h2>
                <p className="text-gray-300 mb-6">{matchResult}</p>
                <div className="flex gap-3">
                  <button onClick={startNewMatch} className="flex-1 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl font-semibold shadow-lg">New Match</button>
                  <button onClick={() => navigate("/analysis")} className="flex-1 py-3 glass rounded-xl font-medium text-white hover:bg-white/10 transition-all">View Analysis</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
