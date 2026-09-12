import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChessPieces } from "../ChessPieces";
import { 
  createTournament, 
  playTournamentMatch, 
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
};

export default function TournamentPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMatchResult, setCurrentMatchResult] = useState<TournamentMatch | null>(null);

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
      // All matches in round completed, advance
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

    setIsPlaying(true);
    
    // Simulate match with animation
    setTimeout(() => {
      const completedMatch = playTournamentMatch(pendingMatch);
      setCurrentMatchResult(completedMatch);
      
      // Update tournament
      const updatedRounds = tournament.rounds.map((round, ri) => {
        if (ri === tournament.currentRound - 1) {
          return round.map(m => m.id === completedMatch.id ? completedMatch : m);
        }
        return round;
      });
      
      const updated = { ...tournament, rounds: updatedRounds };
      saveTournament(updated);
      setSelectedTournament(updated);
      setTournaments(getTournaments());
      
      setIsPlaying(false);
      toast.success(`Match complete! Winner: ${completedMatch.winner?.name}`);
    }, 2000);
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

        {/* Selected tournament detail */}
        {selectedTournament && (
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
                {selectedTournament.status === 'in_progress' && !isPlaying && (
                  <button onClick={() => handlePlayNextMatch(selectedTournament)} className="px-4 py-2 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-xl text-sm font-semibold shadow-lg inline-flex items-center gap-2">
                    <Icon path={iconPaths.play} size={16} />
                    Play Next Match
                  </button>
                )}
                {isPlaying && (
                  <div className="px-4 py-2 glass rounded-xl text-sm text-yellow-400 font-medium inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    Playing Match...
                  </div>
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

  const availableBots: TournamentBot[] = [
    { id: 1, name: "StockfishBot", filename: "stockfish.py", description: "Advanced chess engine", difficulty: "hard" },
    { id: 2, name: "AlphaClone", filename: "alphazero.py", description: "Neural network based", difficulty: "hard" },
    { id: 3, name: "DeepPawn", filename: "deeppawn.py", description: "Deep learning engine", difficulty: "medium" },
    { id: 4, name: "KnightRider", filename: "knight.py", description: "Knight specialist", difficulty: "medium" },
    { id: 5, name: "RookieBot", filename: "rookie.py", description: "Beginner friendly", difficulty: "easy" },
    { id: 6, name: "BishopAI", filename: "bishop.py", description: "Diagonal master", difficulty: "easy" },
  ];

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
            <label className="text-sm font-medium text-gray-300 mb-2 block">Select Bots ({selectedBots.length})</label>
            <div className="grid grid-cols-2 gap-2">
              {availableBots.map(bot => (
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
