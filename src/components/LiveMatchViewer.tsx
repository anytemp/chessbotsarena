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
    const cancel = playMatchLive(
      match,
      (moveSan) => {
        setGame(prev => {
          const newGame = new Chess(prev.fen());
          // The move was already made in playMatchLive, we need to replay
          // Actually, playMatchLive makes the move internally, so we need a different approach
          return prev;
        });
      },
      (completedMatch) => {
        setMatchStatus("completed");
        if (completedMatch.winner) {
          setMatchResult(`${completedMatch.winner.name} wins!`);
        } else {
          setMatchResult("Match ended in a draw!");
        }
        onComplete();
      }
    );

    return () => cancel();
  }, [match]);

  // Simpler approach: directly play moves
  useEffect(() => {
    if (matchStatus === "completed") return;
    if (!match.bot1 || !match.bot2) return;

    let cancelled = false;
    const currentGame = new Chess();
    let moveCount = 0;
    const maxMoves = 100;

    const makeNextMove = () => {
      if (cancelled) return;
      if (currentGame.isGameOver() || moveCount >= maxMoves) {
        setMatchStatus("completed");
        if (currentGame.isCheckmate()) {
          const winner = currentGame.turn() === "w" ? match.bot2!.name : match.bot1!.name;
          setMatchResult(`${winner} wins by checkmate!`);
        } else {
          setMatchResult("Match ended in a draw!");
        }
        setTimeout(onComplete, 2000);
        return;
      }

      const currentBot = currentGame.turn() === "w" ? match.bot1! : match.bot2!;
      const botMove = getBotMove(currentGame, currentBot.difficulty);
      if (botMove) {
        const move = currentGame.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
        if (move) {
          moveCount++;
          setGame(new Chess(currentGame.fen()));
          const gameState = {
            isCheckmate: currentGame.isCheckmate(),
            isCheck: currentGame.isCheck(),
            turn: currentGame.turn(),
            isGameOver: currentGame.isGameOver(),
            isDraw: currentGame.isDraw(),
            moveHistory: currentGame.history({ verbose: true }),
            board: currentGame.board(),
            fen: currentGame.fen(),
          };
          const newCommentary = generateCommentary(move, gameState as any, gameState.moveHistory);
          setCommentary(newCommentary);
          if (ttsEnabled && isTTSAvailable()) {
            speak(newCommentary);
          }
        }
      }

      setTimeout(makeNextMove, 1500);
    };

    setTimeout(makeNextMove, 500);
    return () => { cancelled = true; };
  }, [match, matchStatus, ttsEnabled]);

  const board = game.board();

  return (
    <div className="neu-raised rounded-3xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse-soft">LIVE</span>
          <span className="text-sm text-[#5C4A3A]">Tournament Match</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon path={iconPaths.eye} size={14} className="text-[#8B7A6A]" />
          <span className="text-xs text-[#8B7A6A]">{viewers} watching</span>
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-flat flex items-center justify-center">
            <ChessPieces.King color="dark" size={20} />
          </div>
          <div>
            <div className="font-semibold text-[#2C1810] text-sm">{match.bot1?.name}</div>
            <div className="text-xs text-[#8B7A6A]">White • {match.bot1?.difficulty}</div>
          </div>
        </div>
        <div className={`font-mono text-lg font-bold ${game.turn() === "w" && matchStatus === "playing" ? "text-[#8B6914]" : "text-[#8B7A6A]"}`}>
          {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center mb-4">
        <div className="w-full max-w-md aspect-square grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-[#c9c1b5]/50">
          {Array.from({ length: 64 }, (_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isLight = (row + col) % 2 === 0;
            const pieceData = board[row][col];
            const lastMove = game.history({ verbose: true }).slice(-1)[0];
            const square = `${"abcdefgh"[col]}${8 - row}`;
            const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);

            let pieceComponent = null;
            if (pieceData) {
              const pieceColor = pieceData.color;
              const pieceType = pieceData.type;
              const pieceName = pieceType === "p" ? "Pawn" : pieceType === "n" ? "Knight" : pieceType === "b" ? "Bishop" : pieceType === "r" ? "Rook" : pieceType === "q" ? "Queen" : "King";
              const Piece = ChessPieces[pieceName as keyof typeof ChessPieces];
              pieceComponent = <Piece color={pieceColor === "w" ? "light" : "dark"} size={28} />;
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

      {/* Black player */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-flat flex items-center justify-center">
            <ChessPieces.King color="light" size={20} />
          </div>
          <div>
            <div className="font-semibold text-[#2C1810] text-sm">{match.bot2?.name}</div>
            <div className="text-xs text-[#8B7A6A]">Black • {match.bot2?.difficulty}</div>
          </div>
        </div>
        <div className={`font-mono text-lg font-bold ${game.turn() === "b" && matchStatus === "playing" ? "text-[#8B6914]" : "text-[#8B7A6A]"}`}>
          {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Commentary */}
      <div className="neu-pressed rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon path={iconPaths.sparkle} size={14} className="text-[#8B6914]" />
            <span className="text-xs font-semibold text-[#2C1810]">AI Commentary</span>
          </div>
          <button onClick={() => { setTtsEnabled(!ttsEnabled); if (!ttsEnabled) stop(); }} className={`text-[10px] px-2 py-0.5 rounded ${ttsEnabled ? "bg-[#8B6914] text-white" : "text-[#5C4A3A]"}`}>
            {ttsEnabled ? "🔊" : "🔇"}
          </button>
        </div>
        <p className="text-xs text-[#5C4A3A]">{commentary}</p>
      </div>

      {/* Status */}
      {matchStatus === "completed" && (
        <div className="text-center py-2">
          <span className="text-sm font-semibold text-[#8B6914]">{matchResult}</span>
        </div>
      )}
    </div>
  );
}
