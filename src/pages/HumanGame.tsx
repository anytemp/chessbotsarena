import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "../ChessPieces";
import { createChessGame, getGameState, makeMove, generateCommentary, type GameState } from "../services/chessEngine";
import { saveCompletedGame } from "../services/gameHistory";
import { getCurrentUser } from "../services/auth";
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
};

export default function HumanGame() {
  const navigate = useNavigate();
  const [game, setGame] = useState(createChessGame());
  const [gameState, setGameState] = useState<GameState>(getGameState(createChessGame()));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [commentary, setCommentary] = useState("Game started! White to move.");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [startTime] = useState(Date.now());
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // Timer
  useEffect(() => {
    if (gameState.isGameOver) return;
    const timer = setInterval(() => {
      if (gameState.turn === "w") {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.turn, gameState.isGameOver]);

  // Check for game over
  useEffect(() => {
    if (gameState.isGameOver && !showGameOver) {
      let result = "";
      if (gameState.isCheckmate) {
        result = gameState.turn === "w" ? "Black wins by checkmate!" : "White wins by checkmate!";
      } else if (gameState.isDraw) {
        result = "Game drawn!";
      }
      setGameResult(result);
      setShowGameOver(true);
      
      // Save game to history
      const user = getCurrentUser();
      const whitePlayer = user?.username || "White Player";
      const blackPlayer = "Black Player";
      const gameResultType = gameState.isCheckmate 
        ? (gameState.turn === "w" ? "black" : "white")
        : "draw";
      const duration = Math.floor((Date.now() - startTime) / 1000);
      
      saveCompletedGame(whitePlayer, blackPlayer, gameResultType, gameState.moveHistory, duration);
      toast.success(result);
    }
  }, [gameState.isGameOver, showGameOver]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (gameState.isGameOver) return;

    const file = String.fromCharCode(97 + col); // a-h
    const rank = (8 - row).toString(); // 1-8
    const square = `${file}${rank}`;

    const piece = gameState.board[row][col];

    // If no piece selected yet
    if (!selectedSquare) {
      // Check if there's a piece of the current turn's color
      if (piece && piece[0] === gameState.turn) {
        setSelectedSquare(square);
      }
    } else {
      // If clicking the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      // If clicking another piece of same color, select that instead
      if (piece && piece[0] === gameState.turn) {
        setSelectedSquare(square);
        return;
      }

      // Try to move
      const move = makeMove(game, selectedSquare, square);
      if (move) {
        const newState = getGameState(game);
        setGameState(newState);
        
        // Generate AI commentary
        const comment = generateCommentary(move, newState, newState.moveHistory.slice(0, -1));
        setCommentary(comment);
        
        // Text-to-speech
        if (ttsEnabled && isTTSAvailable()) {
          speak(comment);
        }
        
        setSelectedSquare(null);
      } else {
        // Invalid move
        setSelectedSquare(null);
      }
    }
  };

  const renderPiece = (piece: string | null) => {
    if (!piece) return null;
    const color = piece[0] === 'w' ? 'light' : 'dark';
    const typeChar = piece[1];
    const typeMap: Record<string, string> = {
      p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
    };
    const type = typeMap[typeChar];
    if (!type) return null;
    const PieceComponent = ChessPieces[type as keyof typeof ChessPieces];
    if (!PieceComponent) return null;
    return <PieceComponent color={color as "dark" | "light"} size={40} />;
  };

  const resetGame = () => {
    const newGame = createChessGame();
    setGame(newGame);
    setGameState(getGameState(newGame));
    setSelectedSquare(null);
    setCommentary("Game started! White to move.");
    setWhiteTime(600);
    setBlackTime(600);
    setShowGameOver(false);
    setGameResult("");
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">HUMAN VS HUMAN</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white">Local Chess Game</h1>
          </div>
          <button onClick={() => navigate("/play")} className="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
            Exit Game
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Board */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              {/* Black Player */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Player 2 (Black)</div>
                    <div className="text-xs text-cyan-300">{gameState.turn === "b" && !gameState.isGameOver ? "Your turn" : "Waiting..."}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${gameState.turn === "b" && !gameState.isGameOver ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(blackTime)}
                  </div>
                </div>
              </div>

              {/* Chess Board */}
              <div className="flex justify-center my-6">
                <div className="grid grid-cols-8 gap-0 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                  {gameState.board.map((row, rowIndex) =>
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const file = String.fromCharCode(97 + colIndex);
                      const rank = (8 - rowIndex).toString();
                      const square = `${file}${rank}`;
                      const isSelected = selectedSquare === square;
                      const isLastMove = gameState.moveHistory.length > 0 && 
                        (gameState.moveHistory[gameState.moveHistory.length - 1].from === square || 
                         gameState.moveHistory[gameState.moveHistory.length - 1].to === square);

                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          onClick={() => handleSquareClick(rowIndex, colIndex)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center cursor-pointer transition-all ${
                            isLight ? "bg-slate-200" : "bg-slate-500"
                          } ${isSelected ? "ring-4 ring-cyan-400 ring-inset" : ""} ${isLastMove ? "bg-yellow-400/30" : ""} hover:brightness-110`}
                        >
                          {renderPiece(piece)}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* White Player */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="light" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Player 1 (White)</div>
                    <div className="text-xs text-cyan-300">{gameState.turn === "w" && !gameState.isGameOver ? "Your turn" : "Waiting..."}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${gameState.turn === "w" && !gameState.isGameOver ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(whiteTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* Move History */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Move History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gameState.moveHistory.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-4">No moves yet. White starts!</div>
                ) : (
                  gameState.moveHistory.map((move, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/10 transition-colors">
                      <span className="text-xs text-cyan-300 w-8">{Math.floor(idx / 2) + 1}.</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 0 ? move.san : "..."}</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 1 ? move.san : ""}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - AI Commentary */}
          <div className="space-y-4">
            <motion.div key={commentary} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon path={iconPaths.sparkle} size={16} className="text-cyan-400" />
                  <span className="text-sm font-bold text-cyan-400 uppercase">AI Commentary</span>
                </div>
                {isTTSAvailable() && (
                  <button
                    onClick={() => {
                      if (ttsEnabled) {
                        stop();
                      }
                      setTtsEnabled(!ttsEnabled);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      ttsEnabled 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    🔊 {ttsEnabled ? 'ON' : 'OFF'}
                  </button>
                )}
              </div>
              <p className="text-sm text-white leading-relaxed">{commentary}</p>
            </motion.div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Game Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Mode</span>
                  <span className="text-sm font-semibold text-white">Human vs Human</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Time Control</span>
                  <span className="text-sm font-semibold text-white">10 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Current Turn</span>
                  <span className="text-sm font-semibold text-cyan-400">{gameState.turn === "w" ? "White" : "Black"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Moves Played</span>
                  <span className="text-sm font-semibold text-white">{gameState.moveHistory.length}</span>
                </div>
                {gameState.isCheck && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-400">Check!</span>
                    <span className="text-sm font-semibold text-red-400">King under attack</span>
                  </div>
                )}
              </div>
            </div>

            <button onClick={resetGame} className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
              Reset Game
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
                  <h2 className="font-display text-3xl font-bold text-white mb-2">Game Over!</h2>
                  <p className="text-xl text-cyan-400 mb-6">{gameResult}</p>
                  <div className="space-y-3">
                    <button onClick={resetGame} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                      Play Again
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
