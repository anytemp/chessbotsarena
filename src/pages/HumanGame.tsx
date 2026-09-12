import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChessPieces } from "../ChessPieces";

const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  sparkle: "M12 3v18M3 12h18",
};

type PieceType = "King" | "Queen" | "Rook" | "Bishop" | "Knight" | "Pawn";
type PieceColor = "white" | "black";

interface Piece {
  type: PieceType;
  color: PieceColor;
}

interface Position {
  row: number;
  col: number;
}

const createInitialBoard = (): (Piece | null)[][] => {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  board[0][0] = { type: "Rook", color: "black" };
  board[0][1] = { type: "Knight", color: "black" };
  board[0][2] = { type: "Bishop", color: "black" };
  board[0][3] = { type: "Queen", color: "black" };
  board[0][4] = { type: "King", color: "black" };
  board[0][5] = { type: "Bishop", color: "black" };
  board[0][6] = { type: "Knight", color: "black" };
  board[0][7] = { type: "Rook", color: "black" };
  for (let i = 0; i < 8; i++) board[1][i] = { type: "Pawn", color: "black" };
  board[7][0] = { type: "Rook", color: "white" };
  board[7][1] = { type: "Knight", color: "white" };
  board[7][2] = { type: "Bishop", color: "white" };
  board[7][3] = { type: "Queen", color: "white" };
  board[7][4] = { type: "King", color: "white" };
  board[7][5] = { type: "Bishop", color: "white" };
  board[7][6] = { type: "Knight", color: "white" };
  board[7][7] = { type: "Rook", color: "white" };
  for (let i = 0; i < 8; i++) board[6][i] = { type: "Pawn", color: "white" };
  return board;
};

const aiCommentary = [
  "An interesting opening choice. Let's see how this develops.",
  "Classic development move. Controlling the center is key.",
  "Good positional play. The pieces are finding their squares.",
  "A tactical opportunity might be emerging here.",
  "Solid move. Maintaining tension in the position.",
  "The pawn structure is becoming more defined now.",
  "Both players are developing harmoniously.",
  "This could lead to sharp complications.",
  "A prophylactic move, preventing opponent's ideas.",
  "The position is getting interesting!",
];

export default function HumanGame() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<(Piece | null)[][]>(createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>("white");
  const [moves, setMoves] = useState<string[]>([]);
  const [commentaryIndex, setCommentaryIndex] = useState(0);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentTurn === "white") setWhiteTime(t => Math.max(0, t - 1));
      else setBlackTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTurn]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCommentaryIndex(i => (i + 1) % aiCommentary.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSquareClick = (row: number, col: number) => {
    const piece = board[row][col];
    if (!selectedSquare) {
      if (piece && piece.color === currentTurn) setSelectedSquare({ row, col });
    } else {
      if (selectedSquare.row === row && selectedSquare.col === col) {
        setSelectedSquare(null);
        return;
      }
      if (piece && piece.color === currentTurn) {
        setSelectedSquare({ row, col });
        return;
      }
      const movingPiece = board[selectedSquare.row][selectedSquare.col];
      if (movingPiece) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = movingPiece;
        newBoard[selectedSquare.row][selectedSquare.col] = null;
        const cols = "abcdefgh";
        const moveNotation = `${cols[selectedSquare.col]}${8 - selectedSquare.row}${piece ? "x" : "-"}${cols[col]}${8 - row}`;
        setMoves([...moves, moveNotation]);
        setBoard(newBoard);
        setSelectedSquare(null);
        setCurrentTurn(currentTurn === "white" ? "black" : "white");
      }
    }
  };

  const renderPiece = (piece: Piece | null) => {
    if (!piece) return null;
    const PieceComponent = ChessPieces[piece.type];
    if (!PieceComponent) return null;
    return <PieceComponent color={piece.color === "white" ? "light" : "dark"} size={40} />;
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="max-w-7xl mx-auto">
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
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="dark" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Player 2 (Black)</div>
                    <div className="text-xs text-cyan-300">{currentTurn === "black" ? "Your turn" : "Waiting..."}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${currentTurn === "black" ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(blackTime)}
                  </div>
                </div>
              </div>

              <div className="flex justify-center my-6">
                <div className="grid grid-cols-8 gap-0 border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                  {board.map((row, rowIndex) =>
                    row.map((piece, colIndex) => {
                      const isLight = (rowIndex + colIndex) % 2 === 0;
                      const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          onClick={() => handleSquareClick(rowIndex, colIndex)}
                          className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center cursor-pointer transition-all ${
                            isLight ? "bg-slate-200" : "bg-slate-500"
                          } ${isSelected ? "ring-4 ring-cyan-400 ring-inset" : ""} hover:brightness-110`}
                        >
                          {renderPiece(piece)}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                    <ChessPieces.King color="light" size={24} />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Player 1 (White)</div>
                    <div className="text-xs text-cyan-300">{currentTurn === "white" ? "Your turn" : "Waiting..."}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-2xl font-bold ${currentTurn === "white" ? "text-orange-400" : "text-white/50"}`}>
                    {formatTime(whiteTime)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <h3 className="text-sm font-bold text-white mb-3 uppercase">Move History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {moves.length === 0 ? (
                  <div className="text-white/60 text-sm text-center py-4">No moves yet. White starts!</div>
                ) : (
                  moves.map((move, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/10 transition-colors">
                      <span className="text-xs text-cyan-300 w-8">{Math.floor(idx / 2) + 1}.</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 0 ? move : "..."}</span>
                      <span className="text-sm font-mono font-semibold text-white flex-1">{idx % 2 === 1 ? move : ""}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/20">
              <div className="flex items-center gap-2 mb-3">
                <Icon path={iconPaths.sparkle} size={16} className="text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400 uppercase">AI Commentary</span>
              </div>
              <p className="text-sm text-white leading-relaxed">{aiCommentary[commentaryIndex]}</p>
            </div>
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
                  <span className="text-sm font-semibold text-cyan-400">{currentTurn === "white" ? "White" : "Black"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Moves Played</span>
                  <span className="text-sm font-semibold text-white">{moves.length}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => { setBoard(createInitialBoard()); setMoves([]); setCurrentTurn("white"); setWhiteTime(600); setBlackTime(600); }}
              className="w-full py-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all"
            >
              Reset Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
