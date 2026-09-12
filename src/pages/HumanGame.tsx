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
      setShowGameOver(true);
      if (gameState.isCheckmate) {
        const winner = gameState.turn === "w" ? "Black" : "White";
        setGameResult(`${winner} wins by checkmate!`);
      } else if (gameState.isDraw) {
        setGameResult("Game ended in a draw!");
      }
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const user = getCurrentUser();
      saveCompletedGame(
        "White (Player 1)",
        "Black (Player 2)",
        gameState.isCheckmate ? (gameState.turn === "w" ? "black" : "white") : "draw",
        gameState.moveHistory,
        duration
      );
      toast.success("Game completed! Saved to history.");
    }
  }, [gameState.isGameOver, showGameOver]);

  const handleSquareClick = (square: string) => {
    if (gameState.isGameOver) return;

    const piece = game.get(square as any);

    if (selectedSquare) {
      // Try to make a move
      const move = makeMove(game, selectedSquare, square);
      if (move) {
        const newState = getGameState(game);
        setGameState(newState);
        const newCommentary = generateCommentary(move, newState, newState.moveHistory);
        setCommentary(newCommentary);
        if (ttsEnabled && isTTSAvailable()) {
          speak(newCommentary);
        }
        setSelectedSquare(null);
      } else {
        // If clicked on own piece, select it
        if (piece && piece.color === gameState.turn) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      // Select a piece
      if (piece && piece.color === gameState.turn) {
        setSelectedSquare(square);
      }
    }
  };

  const getLegalSquares = (): string[] => {
    if (!selectedSquare) return [];
    const moves = game.moves({ square: selectedSquare as any, verbose: true });
    return moves.map(m => m.to);
  };

  const resetGame = () => {
    const newGame = createChessGame();
    setGame(newGame);
    setGameState(getGameState(newGame));
    setSelectedSquare(null);
    setCommentary("New game started! White to move.");
    setWhiteTime(600);
    setBlackTime(600);
    setShowGameOver(false);
    setGameResult("");
    stop();
  };

  const legalSquares = getLegalSquares();
  const board = gameState.board;

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-4xl text-[#2C1810] mb-1">Play vs Human</h1>
            <p className="text-[#5C4A3A] text-sm">Local 2-player game</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setTtsEnabled(!ttsEnabled); if (!ttsEnabled) stop(); }} className={`neu-btn px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 ${ttsEnabled ? "text-[#8B6914]" : "text-[#5C4A3A]"}`}>
              <Icon path={iconPaths.sparkle} size={16} />
              {ttsEnabled ? "TTS On" : "TTS Off"}
            </button>
            <button onClick={resetGame} className="neu-btn px-4 py-2 rounded-xl text-sm font-medium text-[#5C4A3A]">New Game</button>
            <button onClick={() => navigate("/play")} className="neu-btn px-4 py-2 rounded-xl text-sm font-medium text-[#5C4A3A] inline-flex items-center gap-2">
              <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="neu-raised rounded-3xl p-4 sm:p-6">
              {/* Player indicators */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl neu-flat flex items-center justify-center">
                    <ChessPieces.King color="dark" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#2C1810] text-sm">Player 1 (Black)</div>
                    <div className="text-xs text-[#8B7A6A]">Captured pieces shown here</div>
                  </div>
                </div>
                <div className={`font-mono text-xl font-bold ${gameState.turn === "b" ? "text-[#8B6914]" : "text-[#8B7A6A]"}`}>
                  {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
                </div>
              </div>

              {/* Chess board */}
              <div className="flex justify-center">
                <div className="w-full max-w-lg aspect-square grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-[#c9c1b5]/50">
                  {Array.from({ length: 64 }, (_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const square = `${"abcdefgh"[col]}${8 - row}`;
                    const isLight = (row + col) % 2 === 0;
                    const pieceData = board[row][col];
                    const isSelected = selectedSquare === square;
                    const isLegal = legalSquares.includes(square);
                    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
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
                        onClick={() => handleSquareClick(square)}
                        className={`aspect-square flex items-center justify-center cursor-pointer relative transition-all ${
                          isLight ? "bg-[#F0E4D0]" : "bg-[#B8956A]"
                        } ${isSelected ? "ring-4 ring-inset ring-[#8B6914]" : ""} ${isLastMove ? (isLight ? "bg-[#f0e68c]" : "bg-[#c9a84c]") : ""}`}
                      >
                        {pieceComponent}
                        {isLegal && !pieceData && (
                          <div className="absolute w-[30%] h-[30%] rounded-full bg-black/20" />
                        )}
                        {isLegal && pieceData && (
                          <div className="absolute inset-0 ring-4 ring-inset ring-black/20 rounded-sm" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* White player */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl neu-flat flex items-center justify-center">
                    <ChessPieces.King color="light" size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#2C1810] text-sm">Player 2 (White)</div>
                    <div className="text-xs text-[#8B7A6A]">Captured pieces shown here</div>
                  </div>
                </div>
                <div className={`font-mono text-xl font-bold ${gameState.turn === "w" ? "text-[#8B6914]" : "text-[#8B7A6A]"}`}>
                  {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Commentary */}
            <div className="neu-raised rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon path={iconPaths.sparkle} size={16} className="text-[#8B6914]" />
                <span className="text-sm font-semibold text-[#2C1810]">AI Commentary</span>
              </div>
              <p className="text-sm text-[#5C4A3A] leading-relaxed">{commentary}</p>
            </div>

            {/* Game status */}
            <div className="neu-raised rounded-3xl p-5">
              <h3 className="text-sm font-semibold text-[#2C1810] mb-3">Game Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5C4A3A]">Turn</span>
                  <span className="font-medium text-[#2C1810]">{gameState.turn === "w" ? "White" : "Black"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#5C4A3A]">Moves</span>
                  <span className="font-medium text-[#2C1810]">{gameState.moveHistory.length}</span>
                </div>
                {gameState.isCheck && (
                  <div className="px-3 py-2 bg-red-100 rounded-lg text-sm text-red-700 font-medium">
                    ⚠️ Check!
                  </div>
                )}
              </div>
            </div>

            {/* Move history */}
            <div className="neu-raised rounded-3xl p-5">
              <h3 className="text-sm font-semibold text-[#2C1810] mb-3">Move History</h3>
              <div className="max-h-48 overflow-y-auto">
                {gameState.moveHistory.length === 0 ? (
                  <p className="text-xs text-[#8B7A6A]">No moves yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {gameState.moveHistory.map((move, i) => (
                      <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? "text-[#2C1810]" : "text-[#5C4A3A]"}`}>
                        {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."} {move.san}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Game over modal */}
        <AnimatePresence>
          {showGameOver && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#E8E0D4] rounded-3xl p-8 max-w-md w-full neu-raised text-center">
                <div className="text-5xl mb-4">🏆</div>
                <h2 className="font-display text-3xl font-semibold text-[#2C1810] mb-2">Game Over</h2>
                <p className="text-[#5C4A3A] mb-6">{gameResult}</p>
                <div className="flex gap-3">
                  <button onClick={resetGame} className="flex-1 py-3 bg-gradient-to-br from-[#8B6914] to-[#B8941C] text-white rounded-xl font-semibold">Play Again</button>
                  <button onClick={() => navigate("/analysis")} className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]">View Analysis</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
