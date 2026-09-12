import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { ChessPieces } from "../ChessPieces";
import { getBotMove, generateCommentary } from "../services/chessEngine";
import { saveCompletedGame } from "../services/gameHistory";
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
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  sparkle: "M12 3v18M3 12h18",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
};

// Live Tournament Match Viewer Component
function TournamentMatchViewer({ match, onComplete }: { match: TournamentMatch; onComplete: (result: TournamentMatch) => void }) {
  const [game, setGame] = useState(new Chess());
  const [commentary, setCommentary] = useState("Match starting...");
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

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
    let moves = 0;
    const maxMoves = 100;

    const makeNextMove = () => {
      if (cancelled) return;
      if (currentGame.isGameOver() || moves >= maxMoves) {
        setIsComplete(true);
        let winner: TournamentBot | null = null;
        let result: 'white' | 'black' | 'draw' | null = null;

        if (currentGame.isCheckmate()) {
          winner = currentGame.turn() === "w" ? match.bot2! : match.bot1!;
          result = currentGame.turn() === "w" ? "black" : "white";
          setCommentary(`Checkmate! ${winner.name} wins!`);
        } else {
          winner = Math.random() > 0.5 ? match.bot1! : match.bot2!;
          result = "draw";
          setCommentary(`Game drawn. ${winner.name} advances.`);
        }

        const completedMatch: TournamentMatch = {
          ...match,
          winner,
          status: "completed",
          moves: currentGame.history(),
          result,
        };

        setTimeout(() => onComplete(completedMatch), 3000);
        return;
      }

      const currentBot = currentGame.turn() === "w" ? match.bot1! : match.bot2!;
      const botMove = getBotMove(currentGame, currentBot.difficulty);
      if (botMove) {
        const move = currentGame.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
        if (move) {
          moves++;
          setMoveCount(moves);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />
            <span className="text-sm font-bold text-red-400">LIVE</span>
          </div>
          <span className="text-base text-gray-300 font-medium">Tournament Match • Round {match.round}</span>
        </div>
        <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-lg">
          <Icon path={iconPaths.eye} size={16} className="text-gray-400" />
          <span className="text-sm text-gray-300">{Math.floor(Math.random() * 30) + 10} watching</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Board Section */}
        <div className="lg:col-span-2">
          {/* White Player */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                <ChessPieces.King color="dark" size={24} />
              </div>
              <div>
                <div className="font-semibold text-white text-base">{match.bot1?.name}</div>
                <div className="text-sm text-gray-400">White • {match.bot1?.difficulty}</div>
              </div>
            </div>
            <div className={`font-mono text-2xl font-bold ${game.turn() === "w" && !isComplete ? "text-yellow-400" : "text-gray-500"}`}>
              {Math.floor(whiteTime / 60)}:{(whiteTime % 60).toString().padStart(2, "0")}
            </div>
          </div>

          {/* Chess Board */}
          <div className="flex justify-center mb-4">
            <div className="w-full max-w-lg aspect-square grid grid-cols-8 rounded-lg overflow-hidden shadow-lg border-2 border-gray-300">
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
                  pieceComponent = <Piece color={pieceColor === "w" ? "light" : "dark"} size={32} />;
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

          {/* Black Player */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                <ChessPieces.King color="light" size={24} />
              </div>
              <div>
                <div className="font-semibold text-white text-base">{match.bot2?.name}</div>
                <div className="text-sm text-gray-400">Black • {match.bot2?.difficulty}</div>
              </div>
            </div>
            <div className={`font-mono text-2xl font-bold ${game.turn() === "b" && !isComplete ? "text-yellow-400" : "text-gray-500"}`}>
              {Math.floor(blackTime / 60)}:{(blackTime % 60).toString().padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Commentary */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon path={iconPaths.sparkle} size={16} className="text-yellow-400" />
              <span className="text-sm font-semibold text-white">AI Commentary</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">{commentary}</p>
          </div>

          {/* Match Stats */}
          <div className="glass rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Match Stats</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Moves</span>
                <span className="font-medium text-white">{moveCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status</span>
                <span className={`font-medium ${isComplete ? "text-green-400" : "text-yellow-400"}`}>
                  {isComplete ? "Complete" : "Playing"}
                </span>
              </div>
              {game.isCheck() && (
                <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 font-medium">
                  Check!
                </div>
              )}
            </div>
          </div>

          {/* Move History */}
          <div className="glass rounded-2xl p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Moves</h4>
            <div className="max-h-32 overflow-y-auto">
              {game.history().length === 0 ? (
                <p className="text-xs text-gray-500">Starting...</p>
              ) : (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {game.history().map((move, i) => (
                    <div key={i} className={`px-2 py-1 rounded ${i % 2 === 0 ? "text-gray-200" : "text-gray-400"}`}>
                      {Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."} {move}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isComplete && (
            <div className="text-center py-3">
              <div className="text-lg font-bold text-yellow-400 mb-1">Match Complete!</div>
              <div className="text-sm text-gray-400">Updating bracket...</div>
            </div>
          )}
        </div>
      </div>
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

    // Save the game to history with full move details
    if (completedMatch.bot1 && completedMatch.bot2 && completedMatch.moves.length > 0) {
      const game = new Chess();
      completedMatch.moves.forEach(move => game.move(move));
      const verboseMoves = game.history({ verbose: true });
      const duration = completedMatch.moves.length * 3;
      saveCompletedGame(
        completedMatch.bot1.name,
        completedMatch.bot2.name,
        completedMatch.result || 'draw',
        verboseMoves,
        duration
      );
    }

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
            <h1 className="font-display text-5xl font-bold text-white mb-1">Tournaments</h1>
            <p className="text-gray-400 text-base">Manage and watch automated chess tournaments</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-base inline-flex items-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">
            <Icon path={iconPaths.trophy} size={20} />
            Create Tournament
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-strong rounded-2xl p-5 text-center shadow-2xl">
            <div className="font-display text-3xl font-bold text-white">{stats.totalTournaments}</div>
            <div className="text-sm text-gray-400">Tournaments</div>
          </div>
          <div className="glass-strong rounded-2xl p-5 text-center shadow-2xl">
            <div className="font-display text-3xl font-bold text-white">{stats.completedTournaments}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="glass-strong rounded-2xl p-5 text-center shadow-2xl">
            <div className="font-display text-3xl font-bold text-white">{stats.totalMatches}</div>
            <div className="text-sm text-gray-400">Total Matches</div>
          </div>
        </div>

        {/* LIVE TOURNAMENT MATCH VIEWER */}
        <AnimatePresence>
          {currentMatch && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8"
            >
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />
                    <span className="text-sm font-bold text-red-400">LIVE NOW</span>
                  </div>
                  Watch Tournament Match
                </h2>
                <p className="text-gray-400">
                  {currentMatch.bot1?.name} vs {currentMatch.bot2?.name} • Round {currentMatch.round} • Match {currentMatch.matchNumber}
                </p>
              </div>
              <TournamentMatchViewer match={currentMatch} onComplete={handleMatchComplete} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected tournament detail */}
        {selectedTournament && !currentMatch && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-3xl font-semibold text-white">{selectedTournament.name}</h2>
                <p className="text-base text-gray-400 mt-1">
                  {selectedTournament.bots.length} bots • Round {selectedTournament.currentRound} •{" "}
                  <span className={`font-medium ${
                    selectedTournament.status === 'completed' ? 'text-green-400' :
                    selectedTournament.status === 'in_progress' ? 'text-yellow-400' : 'text-gray-500'
                  }`}>
                    {selectedTournament.status === 'completed' ? 'Completed' :
                     selectedTournament.status === 'in_progress' ? 'In Progress' : 'Registration'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {selectedTournament.status === 'registration' && (
                  <button onClick={() => handleStartTournament(selectedTournament)} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-5 py-2.5 rounded-xl text-base font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg">
                    Start Tournament
                  </button>
                )}
                {selectedTournament.status === 'in_progress' && (
                  <button onClick={() => handlePlayNextMatch(selectedTournament)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2.5 rounded-xl text-base font-semibold inline-flex items-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">
                    <Icon path={iconPaths.play} size={18} />
                    Play Next Match
                  </button>
                )}
                <button onClick={() => setSelectedTournament(null)} className="glass text-gray-300 px-5 py-2.5 rounded-xl text-base font-medium hover:bg-white/10 transition-colors">
                  Close
                </button>
              </div>
            </div>

            {/* Tournament bracket */}
            <div className="space-y-6">
              {selectedTournament.rounds.map((round, ri) => (
                <div key={ri}>
                  <h3 className="text-base font-semibold text-white mb-3">Round {ri + 1}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {round.map(match => (
                      <div key={match.id} className={`p-4 rounded-xl border ${
                        match.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                        match.status === 'playing' ? 'bg-yellow-500/10 border-yellow-500/30' :
                        'glass border-white/10'
                      }`}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-400">Match {match.matchNumber}</span>
                          <span className={`font-medium ${
                            match.status === 'completed' ? 'text-green-400' :
                            match.status === 'playing' ? 'text-yellow-400' : 'text-gray-500'
                          }`}>
                            {match.status === 'completed' ? '✓ Complete' :
                             match.status === 'playing' ? '⏳ Playing' : '○ Pending'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className={`text-base font-medium ${match.winner?.id === match.bot1?.id ? 'text-green-400' : 'text-white'}`}>
                            {match.bot1?.name || 'TBD'} <span className="text-sm text-gray-500">({match.bot1?.difficulty})</span>
                          </div>
                          <div className="text-sm text-gray-500">vs</div>
                          <div className={`text-base font-medium ${match.winner?.id === match.bot2?.id ? 'text-green-400' : 'text-white'}`}>
                            {match.bot2?.name || 'TBD'} <span className="text-sm text-gray-500">({match.bot2?.difficulty})</span>
                          </div>
                        </div>
                        {match.winner && (
                          <div className="mt-3 text-sm text-green-400 font-medium flex items-center gap-1">
                            <Icon path={iconPaths.trophy} size={14} />
                            Winner: {match.winner.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedTournament.winner && (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/30 text-center">
                <Icon path={iconPaths.trophy} size={40} className="text-yellow-400 mx-auto mb-3" />
                <div className="font-display text-2xl font-semibold text-white mb-1">Tournament Champion</div>
                <div className="text-yellow-400 font-bold text-xl">{selectedTournament.winner.name}</div>
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
              className="glass-strong rounded-3xl p-6 shadow-2xl hover:shadow-purple-500/20 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl glass flex items-center justify-center">
                    <Icon path={iconPaths.trophy} size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-base">{tournament.name}</div>
                    <div className="text-sm text-gray-400">{tournament.bots.length} bots</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteTournament(tournament.id)}
                  className="p-2 rounded-lg glass hover:bg-red-500/20 transition-all"
                >
                  <Icon path={iconPaths.trash} size={18} className="text-gray-400 hover:text-red-400" />
                </button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                  tournament.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  tournament.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
                  'glass text-gray-300'
                }`}>
                  {tournament.status === 'completed' ? 'Completed' :
                   tournament.status === 'in_progress' ? 'In Progress' : 'Registration'}
                </span>
                {tournament.winner && (
                  <span className="text-sm text-yellow-400 font-medium flex items-center gap-1">
                    <Icon path={iconPaths.trophy} size={14} />
                    {tournament.winner.name}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedTournament(tournament)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-base font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                View Details
              </button>
            </motion.div>
          ))}
        </div>

        {tournaments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl glass-strong mx-auto mb-6 flex items-center justify-center">
              <Icon path={iconPaths.trophy} size={40} className="text-yellow-400" />
            </div>
            <h3 className="font-display text-3xl text-white mb-3">No Tournaments Yet</h3>
            <p className="text-gray-400 text-base mb-8">Create your first tournament to get started</p>
            <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-base hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">
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
            <label className="text-base font-medium text-gray-300 mb-2 block">Tournament Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Grand Prix 2024" 
              className="w-full px-4 py-3 glass rounded-xl text-white text-base placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500/50" 
            />
          </div>

          <div>
            <label className="text-base font-medium text-gray-300 mb-2 block">
              Select Bots ({selectedBots.length})
              {uploadedBots.length > 0 && (
                <span className="ml-2 text-sm text-yellow-400">({uploadedBots.length} uploaded)</span>
              )}
            </label>
            
            {uploadedBots.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-2 font-medium">Your Uploaded Bots</div>
                <div className="grid grid-cols-2 gap-2">
                  {uploadedBots.map(bot => (
                    <button
                      key={bot.id}
                      onClick={() => toggleBot(bot)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedBots.find(b => b.id === bot.id) 
                          ? "glass-strong border-2 border-purple-500/50" 
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChessPieces.Knight color="dark" size={18} />
                        <div>
                          <div className="text-sm font-semibold text-white">{bot.name}</div>
                          <div className="text-xs text-gray-400 capitalize">{bot.difficulty}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-400 mb-2 font-medium">Default Bots</div>
            <div className="grid grid-cols-2 gap-2">
              {defaultBots.map(bot => (
                <button
                  key={bot.id}
                  onClick={() => toggleBot(bot)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    selectedBots.find(b => b.id === bot.id) 
                      ? "glass-strong border-2 border-purple-500/50" 
                      : "glass hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChessPieces.Knight color="dark" size={18} />
                    <div>
                      <div className="text-sm font-semibold text-white">{bot.name}</div>
                      <div className="text-xs text-gray-400 capitalize">{bot.difficulty}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 glass rounded-xl font-medium text-white text-base hover:bg-white/10 transition-all">Cancel</button>
          <button onClick={handleCreate} className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-base hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg">Create</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
