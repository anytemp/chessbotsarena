import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { ChessPieces } from "../ChessPieces";
import { getBotMove, generateCommentary } from "../services/chessEngine";
import { 
  createTournament, 
  advanceTournament, 
  getTournaments, 
  saveTournament,
  deleteTournament,
  getTournamentStats,
  type Tournament,
  type TournamentBot,
  type TournamentMatch
} from "../services/tournament";
import { toast } from "../components/Toast";

const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z",
  play: "M5 3l14 9-14 9V3z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  sparkle: "M12 3v18M3 12h18",
};

// Live Match Viewer Component
function TournamentMatchViewer({ match, onComplete }: { match: TournamentMatch; onComplete: (result: TournamentMatch) => void }) {
  const [game, setGame] = useState(new Chess());
  const [commentary, setCommentary] = useState("Match starting...");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;
    const timer = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [game, isComplete]);

  useEffect(() => {
    if (isComplete || !match.bot1 || !match.bot2) return;

    let cancelled = false;
    const currentGame = new Chess();
    let moveCount = 0;
    const maxMoves = 100;

    const makeNextMove = () => {
      if (cancelled) return;
      if (currentGame.isGameOver() || moveCount >= maxMoves) {
        setIsComplete(true);
        let winner: TournamentBot | null = null;
        let result: 'white' | 'black' | 'draw' | null = null;

        if (currentGame.isCheckmate()) {
          winner = currentGame.turn() === "w" ? match.bot2! : match.bot1!;
          result = currentGame.turn() === "w" ? "black" : "white";
        } else {
          winner = Math.random() > 0.5 ? match.bot1! : match.bot2!;
          result = "draw";
        }

        const completedMatch: TournamentMatch = {
          ...match,
          winner,
          status: "completed",
          moves: currentGame.history(),
          result,
        };

        setTimeout(() => onComplete(completedMatch), 2000);
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
        }
      }

      setTimeout(makeNextMove, 1500);
    };

    setTimeout(makeNextMove, 500);
    return () => { cancelled = true; };
  }, [match, isComplete]);

  const board = game.board();

  return (
    <div className="glass-strong rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">LIVE</span>
          <span className="text-sm text-gray-400">Tournament Match</span>
        </div>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ChessPieces.King color="dark" size={20} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{match.bot1?.name}</div>
            <div className="text-xs text-gray-400">White • {match.bot1?.difficulty}</div>
          </div>
        </div>
        <div className={`font-mono text-lg font-bold ${game.turn() === "w" && !isComplete ? "text-yellow-400" : "text-gray-500"}`}>
          {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center mb-4">
        <div className="w-full max-w-md aspect-square grid grid-cols-8 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/10">
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
          <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
            <ChessPieces.King color="light" size={20} />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{match.bot2?.name}</div>
            <div className="text-xs text-gray-400">Black • {match.bot2?.difficulty}</div>
          </div>
        </div>
        <div className={`font-mono text-lg font-bold ${game.turn() === "b" && !isComplete ? "text-yellow-400" : "text-gray-500"}`}>
          {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
        </div>
      </div>

      {/* Commentary */}
      <div className="glass rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon path={iconPaths.sparkle} size={14} className="text-yellow-400" />
          <span className="text-xs font-semibold text-white">AI Commentary</span>
        </div>
        <p className="text-xs text-gray-300">{commentary}</p>
      </div>

      {isComplete && (
        <div className="mt-4 text-center">
          <span className="text-sm font-semibold text-yellow-400">Match Complete!</span>
        </div>
      )}
    </div>
  );
}

export default function TournamentPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<TournamentMatch | null>(null);

  useEffect(() => {
    const tournaments = getTournaments();
    setTournaments(tournaments);
  }, []);

  const handleCreateTournament = (name: string, bots: TournamentBot[]) => {
    if (bots.length < 2) {
      toast.error("Need at least 2 bots to create a tournament");
      return;
    }
    const tournament = createTournament(name, bots);
    saveTournament(tournament);
    setTournaments(getTournaments());
    setShowCreateModal(false);
    toast.success("Tournament created!");
  };

  const handleStartTournament = (tournament: Tournament) => {
    const updated = { ...tournament, status: 'in_progress' as const };
    saveTournament(updated);
    setSelectedTournament(updated);
    setTournaments(getTournaments());
    toast.success("Tournament started!");
  };

  const handlePlayNextMatch = (tournament: Tournament) => {
    const currentRound = tournament.rounds[tournament.currentRound - 1];
    const pendingMatch = currentRound.find(m => m.status === 'pending');
    
    if (!pendingMatch) {
      const advanced = advanceTournament(tournament);
      saveTournament(advanced);
      setSelectedTournament(advanced);
      setTournaments(getTournaments());
      
      if (advanced.status === 'completed') {
        toast.success(`Tournament complete! Winner: ${advanced.winner?.name}`);
      } else {
        toast.success("Advanced to next round!");
      }
      return;
    }

    setCurrentMatch(pendingMatch);
  };

  const handleMatchComplete = (completedMatch: TournamentMatch) => {
    if (!selectedTournament) return;

    const updatedRounds = selectedTournament.rounds.map((round, ri) => {
      if (ri === selectedTournament.currentRound - 1) {
        return round.map(m => m.id === completedMatch.id ? completedMatch : m);
      }
      return round;
    });

    const updated = { ...selectedTournament, rounds: updatedRounds };
    saveTournament(updated);
    setSelectedTournament(updated);
    setTournaments(getTournaments());
    setCurrentMatch(null);
    toast.success(`Match complete! Winner: ${completedMatch.winner?.name}`);
  };

  const handleDeleteTournament = (id: string) => {
    deleteTournament(id);
    setTournaments(getTournaments());
    if (selectedTournament?.id === id) {
      setSelectedTournament(null);
    }
    toast.success("Tournament deleted");
  };

  const stats = getTournamentStats();

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-4xl text-white mb-1">Tournaments</h1>
            <p className="text-gray-400 text-sm">Manage automated chess tournaments</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="px-5 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
            <Icon path={iconPaths.trophy} size={18} />
            Create Tournament
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-strong rounded-2xl p-4 text-center shadow-xl">
            <div className="font-display text-2xl font-bold text-yellow-400">{stats.totalTournaments}</div>
            <div className="text-xs text-gray-400">Tournaments</div>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center shadow-xl">
            <div className="font-display text-2xl font-bold text-yellow-400">{stats.completedTournaments}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
          <div className="glass-strong rounded-2xl p-4 text-center shadow-xl">
            <div className="font-display text-2xl font-bold text-yellow-400">{stats.totalMatches}</div>
            <div className="text-xs text-gray-400">Total Matches</div>
          </div>
        </div>

        {/* Live Match Viewer */}
        <AnimatePresence>
          {currentMatch && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <TournamentMatchViewer match={currentMatch} onComplete={handleMatchComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected tournament detail */}
        {selectedTournament && !currentMatch && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">{selectedTournament.name}</h2>
                <p className="text-sm text-gray-400">
                  {selectedTournament.bots.length} bots • Round {selectedTournament.currentRound} •{" "}
                  <span className={`font-medium ${
                    selectedTournament.status === 'completed' ? 'text-green-400' :
                    selectedTournament.status === 'in_progress' ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {selectedTournament.status === 'completed' ? 'Completed' :
                     selectedTournament.status === 'in_progress' ? 'In Progress' : 'Registration'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedTournament.status === 'registration' && (
                  <button onClick={() => handleStartTournament(selectedTournament)} className="px-4 py-2 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl text-sm font-semibold shadow-lg">
                    Start Tournament
                  </button>
                )}
                {selectedTournament.status === 'in_progress' && (
                  <button onClick={() => handlePlayNextMatch(selectedTournament)} className="px-4 py-2 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl text-sm font-semibold shadow-lg inline-flex items-center gap-2">
                    <Icon path={iconPaths.play} size={16} />
                    Play Next Match
                  </button>
                )}
                <button onClick={() => setSelectedTournament(null)} className="px-4 py-2 glass rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all">
                  Close
                </button>
              </div>
            </div>

            {/* Tournament bracket */}
            <div className="space-y-6">
              {selectedTournament.rounds.map((round, ri) => (
                <div key={ri}>
                  <h3 className="text-sm font-semibold text-white mb-3">Round {ri + 1}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {round.map(match => (
                      <div key={match.id} className={`p-3 rounded-xl border ${
                        match.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                        match.status === 'playing' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'glass border-white/10'
                      }`}>
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-gray-400">Match {match.matchNumber}</span>
                          <span className={`font-medium ${
                            match.status === 'completed' ? 'text-green-400' :
                            match.status === 'playing' ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {match.status === 'completed' ? '✓ Complete' :
                             match.status === 'playing' ? '⏳ Playing' : '○ Pending'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className={`text-sm font-medium ${match.winner?.id === match.bot1?.id ? 'text-green-400' : 'text-white'}`}>
                            {match.bot1?.name || 'TBD'} {match.bot1 && `(${match.bot1.difficulty})`}
                          </div>
                          <div className="text-xs text-gray-500">vs</div>
                          <div className={`text-sm font-medium ${match.winner?.id === match.bot2?.id ? 'text-green-400' : 'text-white'}`}>
                            {match.bot2?.name || 'TBD'} {match.bot2 && `(${match.bot2.difficulty})`}
                          </div>
                        </div>
                        {match.winner && (
                          <div className="mt-2 text-xs text-green-400 font-medium">
                            🏆 Winner: {match.winner.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedTournament.winner && (
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 text-center">
                <div className="text-3xl mb-2">🏆</div>
                <div className="font-display text-xl font-semibold text-white">Tournament Champion</div>
                <div className="text-yellow-400 font-bold text-lg">{selectedTournament.winner.name}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tournament list */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament, i) => (
            <motion.div
              key={tournament.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-strong rounded-3xl p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
                    <Icon path={iconPaths.trophy} size={22} className="text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{tournament.name}</div>
                    <div className="text-xs text-gray-400">{tournament.bots.length} bots</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteTournament(tournament.id)}
                  className="p-2 glass rounded-lg hover:bg-red-500/20 transition-all"
                >
                  <Icon path={iconPaths.trash} size={16} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                  tournament.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  tournament.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                  'glass text-gray-300'
                }`}>
                  {tournament.status === 'completed' ? 'Completed' :
                   tournament.status === 'in_progress' ? 'In Progress' : 'Registration'}
                </span>
                {tournament.winner && (
                  <span className="text-xs text-yellow-400 font-medium">🏆 {tournament.winner.name}</span>
                )}
              </div>
              <button 
                onClick={() => setSelectedTournament(tournament)}
                className="w-full py-2 glass rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all"
              >
                View Details
              </button>
            </motion.div>
          ))}
        </div>

        {tournaments.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="font-display text-2xl text-white mb-2">No Tournaments Yet</h3>
            <p className="text-gray-400 mb-6">Create your first tournament to get started</p>
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl font-semibold shadow-lg">
              Create Tournament
            </button>
          </div>
        )}

        {/* Create tournament modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateTournamentModal
              onClose={() => setShowCreateModal(false)}
              onCreate={handleCreateTournament}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── CREATE TOURNAMENT MODAL ────────────────────────────────────────────────
function CreateTournamentModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, bots: TournamentBot[]) => void }) {
  const [name, setName] = useState("");
  const [selectedBots, setSelectedBots] = useState<TournamentBot[]>([]);

  // Get uploaded bots from localStorage
  const getUploadedBots = (): TournamentBot[] => {
    const saved = localStorage.getItem("chessbots");
    if (saved) {
      try {
        const bots = JSON.parse(saved);
        return bots.map((bot: any, index: number) => ({
          id: bot.id || index + 1,
          name: bot.name,
          filename: bot.filename || "bot.py",
          description: bot.description || "",
          difficulty: (["easy", "medium", "hard"][index % 3] as "easy" | "medium" | "hard")
        }));
      } catch {
        return [];
      }
    }
    return [];
  };

  // Default bots
  const defaultBots: TournamentBot[] = [
    { id: 101, name: "StockfishBot", filename: "stockfish.py", description: "Advanced chess engine", difficulty: "hard" },
    { id: 102, name: "AlphaClone", filename: "alphazero.py", description: "Neural network based", difficulty: "hard" },
    { id: 103, name: "DeepPawn", filename: "deeppawn.py", description: "Deep learning engine", difficulty: "medium" },
    { id: 104, name: "KnightRider", filename: "knight.py", description: "Knight specialist", difficulty: "medium" },
    { id: 105, name: "RookieBot", filename: "rookie.py", description: "Beginner friendly", difficulty: "easy" },
    { id: 106, name: "BishopAI", filename: "bishop.py", description: "Diagonal master", difficulty: "easy" },
  ];

  const uploadedBots = getUploadedBots();
  const allBots = [...uploadedBots, ...defaultBots];

  const toggleBot = (bot: TournamentBot) => {
    if (selectedBots.find(b => b.id === bot.id)) {
      setSelectedBots(selectedBots.filter(b => b.id !== bot.id));
    } else {
      setSelectedBots([...selectedBots, bot]);
    }
  };

  const handleCreate = () => {
    if (!name) {
      toast.error("Please enter a tournament name");
      return;
    }
    if (selectedBots.length < 2) {
      toast.error("Select at least 2 bots");
      return;
    }
    onCreate(name, selectedBots);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-strong rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-3xl font-semibold text-white mb-6">Create Tournament</h3>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Tournament Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Grand Prix 2024" 
              className="w-full px-4 py-3 glass rounded-xl text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-yellow-500/50" 
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Select Bots ({selectedBots.length})
              {uploadedBots.length > 0 && (
                <span className="ml-2 text-xs text-yellow-400">({uploadedBots.length} uploaded)</span>
              )}
            </label>
            
            {uploadedBots.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-400 mb-2">Your Uploaded Bots</div>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedBots.map(bot => (
                    <button
                      key={bot.id}
                      onClick={() => toggleBot(bot)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedBots.find(b => b.id === bot.id) 
                          ? "glass-strong border-2 border-yellow-500/50" 
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChessPieces.Knight color="dark" size={16} />
                        <div>
                          <div className="text-xs font-semibold text-white">{bot.name}</div>
                          <div className="text-[10px] text-gray-400 capitalize">{bot.difficulty}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-400 mb-2">Default Bots</div>
            <div className="grid grid-cols-2 gap-2">
              {defaultBots.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => toggleBot(bot)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedBots.find(b => b.id === bot.id) 
                      ? "glass-strong border-2 border-yellow-500/50" 
                      : "glass hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChessPieces.Knight color="dark" size={16} />
                    <div>
                      <div className="text-xs font-semibold text-white">{bot.name}</div>
                      <div className="text-[10px] text-gray-400 capitalize">{bot.difficulty}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 glass rounded-xl font-medium text-white hover:bg-white/10 transition-all">Cancel</button>
          <button onClick={handleCreate} className="flex-1 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl font-semibold shadow-lg">Create</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
