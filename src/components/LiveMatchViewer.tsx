import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from 'chess.js';
import { ChessPieces } from "../ChessPieces";
import { getBotMove, generateCommentary } from "../services/chessEngine";
import { speak, stop, isTTSAvailable } from "../services/tts";
import { playMatchLive } from "../services/tournament";
import type { TournamentMatch } from "../services/tournament";

const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  sparkle: "M12 3v18M3 12h18",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
};

interface LiveMatchViewerProps {
  match: TournamentMatch;
  onComplete: () => void;
}

export default function LiveMatchViewer({ match, onComplete }: LiveMatchViewerProps) {
  const [game, setGame] = useState(new Chess());
  const [commentary, setCommentary] = useState("Match starting...");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [matchStatus, setMatchStatus] = useState<"playing" | "completed">("playing");
  const [matchResult, setMatchResult] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [viewers] = useState(Math.floor(Math.random() * 40) + 10);

  // Timer
  useEffect(() => {
    if (matchStatus === "completed") return;
    const timer = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [game, matchStatus]);

  // Play match using playMatchLive
  useEffect(() => {
    if (matchStatus === "completed") return;

    const stopMatch = playMatchLive(
      match,
      (updatedGame) => {
        // Update game state on each move
        const newGame = new Chess(updatedGame.fen());
        setGame(newGame);
        
        // Generate commentary for the last move
        const history = updatedGame.history({ verbose: true });
        if (history.length > 0) {
          const lastMove = history[history.length - 1];
          const comment = generateCommentary(lastMove, {
            board: updatedGame.board().map(row => row.map(cell => cell ? `${cell.color}${cell.type}` : null)),
            turn: updatedGame.turn(),
            isCheck: updatedGame.isCheck(),
            isCheckmate: updatedGame.isCheckmate(),
            isDraw: updatedGame.isDraw(),
            isGameOver: updatedGame.isGameOver(),
            moveHistory: history,
            fen: updatedGame.fen(),
          }, history.slice(0, -1));
          
          setCommentary(comment);
          
          // Text-to-speech
          if (ttsEnabled && isTTSAvailable()) {
            speak(comment);
          }
        }
      },
      (result, winner) => {
        // Match completed
        let resultText = "";
        if (result === 'draw') {
          resultText = "Game drawn!";
        } else {
          resultText = `${winner?.name} wins by checkmate!`;
        }
        
        setMatchResult(resultText);
        setMatchStatus("completed");
        
        if (ttsEnabled && isTTSAvailable()) {
          speak(resultText);
        }
        
        // Call onComplete after a delay
        setTimeout(() => {
          onComplete();
        }, 3000);
      }
    );

    return () => {
      stopMatch();
    };
  }, [match, matchStatus, ttsEnabled, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderPiece = (piece: { type: string; color: string } | null) => {
    if (!piece) return null;
    const color = piece.color === 'w' ? 'light' : 'dark';
    const typeMap: Record<string, string> = {
      p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
    };
    const type = typeMap[piece.type];
    if (!type) return null;
    const PieceComponent = ChessPieces[type as keyof typeof ChessPieces];
    if (!PieceComponent) return null;
    return <PieceComponent color={color as "dark" | "light"} size={32} />;
  };

  const board = game.board();
  const history = game.history({ verbose: true });
  const lastMove = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 rounded-3xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${matchStatus === "playing" ? "bg-red-500 animate-pulse" : "bg-yellow-500"}`}>
              {matchStatus === "playing" ? "LIVE" : "COMPLETED"}
            </span>
            <span className="text-sm text-cyan-300">Tournament Match</span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-white">
            {match.bot1?.name} vs {match.bot2?.name}
          </h2>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20">
          <Icon path={iconPaths.eye} size={18} className="text-cyan-400" />
          <span className="text-sm font-bold text-white">{viewers}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
            {/* Black Player */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                  <ChessPieces.King color="dark" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{match.bot2?.name}</div>
                  <div className="text-xs text-cyan-300">Black</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-xl font-bold ${game.turn() === "b" && matchStatus === "playing" ? "text-orange-400" : "text-white/50"}`}>
                  {formatTime(blackTime)}
                </div>
              </div>
            </div>

            {/* Chess Board */}
            <div className="flex justify-center my-4">
              <div className="w-full max-w-sm aspect-square grid grid-cols-8 gap-0 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                {board.map((row, rowIndex) =>
                  row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const file = String.fromCharCode(97 + colIndex);
                    const rank = (8 - rowIndex).toString();
                    const square = `${file}${rank}`;
                    const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

                    return (
                      <div key={`${rowIndex}-${colIndex}`} className={`aspect-square flex items-center justify-center transition-all duration-500 ${isLight ? "bg-slate-200" : "bg-slate-500"} ${isLastMove ? "ring-2 ring-inset ring-cyan-400" : ""}`}>
                        {piece && (
                          <motion.div key={`${piece.type}-${piece.color}-${rowIndex}-${colIndex}`} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
                            {renderPiece(piece)}
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* White Player */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                  <ChessPieces.Knight color="dark" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{match.bot1?.name}</div>
                  <div className="text-xs text-cyan-300">White</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-xl font-bold ${game.turn() === "w" && matchStatus === "playing" ? "text-orange-400" : "text-white/50"}`}>
                  {formatTime(whiteTime)}
                </div>
              </div>
            </div>

            {matchStatus === "completed" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                <div className="text-center">
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-lg font-bold text-white">{matchResult}</div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Move History */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20 mt-4">
            <h3 className="text-sm font-bold text-white mb-3 uppercase">Moves ({history.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-white/60 text-sm text-center py-4">Waiting for first move...</div>
              ) : (
                history.map((move, idx) => (
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
            <h3 className="text-sm font-bold text-white mb-3 uppercase">Match Info</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Current Move</span>
                <span className="text-sm font-semibold text-cyan-400">{history.length + 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Status</span>
                <span className={`text-sm font-semibold ${matchStatus === "completed" ? "text-yellow-400" : "text-green-400"}`}>
                  {matchStatus === "completed" ? "Completed" : "In Progress"}
                </span>
              </div>
              {game.isCheck() && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-400">Check!</span>
                  <span className="text-sm font-semibold text-red-400">King under attack</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
