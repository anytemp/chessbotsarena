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
};

export default function TournamentPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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
    setTournaments([tournament, ...tournaments]);
    setSelectedTournament(tournament);
    setShowCreateModal(false);
    toast.success("Tournament created!");
  };

  const handleRunTournament = async (tournament: Tournament) => {
    setIsRunning(true);
    setSelectedTournament(tournament);

    // Run all pending matches
    for (let roundIdx = 0; roundIdx < tournament.rounds.length; roundIdx++) {
      const round = tournament.rounds[roundIdx];
      
      for (const match of round) {
        if (match.status === 'pending' && match.bot1 && match.bot2) {
          match.status = 'playing';
          setSelectedTournament({ ...tournament });
          
          // Play the match
          await playTournamentMatch(match);
          setSelectedTournament({ ...tournament });
          
          // Small delay between matches
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Advance to next round
      await advanceTournament(tournament);
      setSelectedTournament({ ...tournament });
      
      if (tournament.status === 'completed') {
        break;
      }
    }

    saveTournament(tournament);
    setTournaments(getTournaments());
    setIsRunning(false);
    
    if (tournament.winner) {
      toast.success(`🏆 ${tournament.winner.name} wins the tournament!`);
    }
  };

  const stats = selectedTournament ? getTournamentStats(selectedTournament) : null;

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="luxury-heading text-5xl text-[#2C1810] mb-2">Tournaments</h1>
            <p className="text-[#5C4A3A]">Create and manage bot tournaments</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="neu-accent px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
          >
            <Icon path={iconPaths.trophy} size={20} />
            Create Tournament
          </button>
        </div>

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-display text-3xl font-semibold text-[#2C1810] mb-4">No Tournaments Yet</h2>
            <p className="text-[#5C4A3A] mb-6">Create your first tournament with uploaded bots!</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="neu-accent px-8 py-4 rounded-xl font-semibold"
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {tournaments.map((tournament, idx) => (
              <motion.div
                key={tournament.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="neu-raised rounded-3xl p-6 cursor-pointer hover:scale-105 transition-transform"
                onClick={() => setSelectedTournament(tournament)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center">
                    <Icon path={iconPaths.trophy} size={24} className="text-[#8B6914]" />
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    tournament.status === 'completed' ? 'bg-green-500/20 text-green-700' :
                    tournament.status === 'in_progress' ? 'bg-blue-500/20 text-blue-700' :
                    'bg-gray-500/20 text-gray-700'
                  }`}>
                    {tournament.status === 'completed' ? 'Completed' : 
                     tournament.status === 'in_progress' ? 'In Progress' : 'Registration'}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-[#2C1810] mb-2">{tournament.name}</h3>
                <div className="text-sm text-[#5C4A3A] mb-4">
                  {tournament.bots.length} bots • {tournament.rounds.length} rounds
                </div>
                {tournament.winner && (
                  <div className="pt-4 border-t border-[#c9c1b5]/30">
                    <div className="text-xs text-[#8B7A6A] mb-1">Winner</div>
                    <div className="font-semibold text-[#8B6914] flex items-center gap-2">
                      <span>🏆</span> {tournament.winner.name}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Selected Tournament Details */}
        {selectedTournament && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="neu-raised rounded-3xl p-8 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-3xl font-semibold text-[#2C1810] mb-2">
                  {selectedTournament.name}
                </h2>
                <div className="text-sm text-[#5C4A3A]">
                  {selectedTournament.bots.length} bots • Round {selectedTournament.currentRound} of {selectedTournament.rounds.length}
                </div>
              </div>
              {selectedTournament.status !== 'completed' && (
                <button
                  onClick={() => handleRunTournament(selectedTournament)}
                  disabled={isRunning}
                  className="neu-accent px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Icon path={iconPaths.play} size={20} />
                  {isRunning ? 'Running...' : 'Run Tournament'}
                </button>
              )}
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">Total Matches</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.totalMatches}</div>
                </div>
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">Completed</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.completedMatches}</div>
                </div>
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">Total Moves</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.totalMoves}</div>
                </div>
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">White Wins</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.whiteWins}</div>
                </div>
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">Black Wins</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.blackWins}</div>
                </div>
                <div className="neu-pressed rounded-xl p-4">
                  <div className="text-xs text-[#8B7A6A] mb-1">Draws</div>
                  <div className="text-2xl font-bold text-[#2C1810]">{stats.draws}</div>
                </div>
              </div>
            )}

            {/* Tournament Bracket */}
            <div className="space-y-8">
              {selectedTournament.rounds.map((round, roundIdx) => (
                <div key={roundIdx}>
                  <h3 className="font-display text-xl font-semibold text-[#2C1810] mb-4">
                    Round {roundIdx + 1}
                    {roundIdx === selectedTournament.rounds.length - 1 && ' (Final)'}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {round.map((match, matchIdx) => (
                      <TournamentMatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Winner Announcement */}
            {selectedTournament.winner && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-8 p-8 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-3xl border-2 border-yellow-500/30 text-center"
              >
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="font-display text-4xl font-bold text-[#2C1810] mb-2">
                  Tournament Champion!
                </h3>
                <div className="text-2xl font-semibold text-[#8B6914]">
                  {selectedTournament.winner.name}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Create Tournament Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <CreateTournamentModal
              onClose={() => setShowCreateModal(false)}
              onCreate={handleCreateTournament}
            />
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
          <button 
            onClick={() => navigate("/")}
            className="neu-btn px-6 py-3 rounded-xl font-medium text-[#5C4A3A] inline-flex items-center gap-2"
          >
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

function TournamentMatchCard({ match }: { match: TournamentMatch }) {
  return (
    <div className={`neu-pressed rounded-xl p-4 ${
      match.status === 'playing' ? 'ring-2 ring-blue-500' : ''
    }`}>
      <div className="text-xs text-[#8B7A6A] mb-2">Match {match.matchNumber}</div>
      
      <div className="space-y-2">
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          match.winner?.id === match.bot1?.id ? 'bg-green-500/20' : ''
        }`}>
          <ChessPieces.Knight color="light" size={20} />
          <span className="text-sm font-medium text-[#2C1810] flex-1">
            {match.bot1?.name || 'TBD'}
          </span>
          {match.winner?.id === match.bot1?.id && <span>🏆</span>}
        </div>
        
        <div className="text-center text-xs text-[#8B7A6A]">vs</div>
        
        <div className={`flex items-center gap-2 p-2 rounded-lg ${
          match.winner?.id === match.bot2?.id ? 'bg-green-500/20' : ''
        }`}>
          <ChessPieces.Knight color="dark" size={20} />
          <span className="text-sm font-medium text-[#2C1810] flex-1">
            {match.bot2?.name || 'TBD'}
          </span>
          {match.winner?.id === match.bot2?.id && <span>🏆</span>}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-[#c9c1b5]/30">
        <div className="text-xs text-[#8B7A6A]">
          {match.status === 'pending' && '⏳ Pending'}
          {match.status === 'playing' && '🎮 Playing...'}
          {match.status === 'completed' && (
            match.result === 'draw' ? '🤝 Draw' : 
            `✅ ${match.winner?.name} wins`
          )}
        </div>
        {match.moves.length > 0 && (
          <div className="text-xs text-[#8B7A6A] mt-1">
            {match.moves.length} moves
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTournamentModal({ 
  onClose, 
  onCreate 
}: { 
  onClose: () => void;
  onCreate: (name: string, bots: TournamentBot[]) => void;
}) {
  const [name, setName] = useState('');
  const [selectedBots, setSelectedBots] = useState<TournamentBot[]>([]);
  const [availableBots, setAvailableBots] = useState<TournamentBot[]>([]);

  useEffect(() => {
    // Load bots from localStorage
    const savedBots = localStorage.getItem('chessbots');
    if (savedBots) {
      const bots = JSON.parse(savedBots).map((bot: any) => ({
        id: bot.id,
        name: bot.name,
        filename: bot.filename,
        description: bot.description || '',
        difficulty: 'medium' as const,
      }));
      setAvailableBots(bots);
    }
  }, []);

  const toggleBot = (bot: TournamentBot) => {
    if (selectedBots.find(b => b.id === bot.id)) {
      setSelectedBots(selectedBots.filter(b => b.id !== bot.id));
    } else {
      setSelectedBots([...selectedBots, bot]);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a tournament name");
      return;
    }
    if (selectedBots.length < 2) {
      toast.error("Please select at least 2 bots");
      return;
    }
    onCreate(name, selectedBots);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#E8E0D4] rounded-3xl p-8 max-w-2xl w-full neu-raised max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-3xl font-semibold text-[#2C1810] mb-6">
          Create Tournament
        </h3>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">
              Tournament Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekly Blitz Championship"
              className="w-full px-4 py-3 rounded-xl neu-pressed text-[#2C1810] placeholder-[#8B7A6A] outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#5C4A3A] mb-2 block">
              Select Bots ({selectedBots.length} selected)
            </label>
            {availableBots.length === 0 ? (
              <div className="text-center py-8 text-[#8B7A6A]">
                No bots uploaded yet. Go to Bot Arena to upload bots first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {availableBots.map(bot => (
                  <div
                    key={bot.id}
                    onClick={() => toggleBot(bot)}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      selectedBots.find(b => b.id === bot.id)
                        ? 'neu-accent text-white'
                        : 'neu-pressed text-[#2C1810] hover:scale-105'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ChessPieces.Knight color={selectedBots.find(b => b.id === bot.id) ? 'light' : 'dark'} size={20} />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{bot.name}</div>
                        <div className="text-xs opacity-70">{bot.filename}</div>
                      </div>
                      {selectedBots.find(b => b.id === bot.id) && (
                        <span className="text-lg">✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 neu-btn rounded-xl font-medium text-[#5C4A3A]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 py-3 bg-[#8B6914] text-white rounded-xl font-semibold hover:bg-[#7a5a10] transition-colors"
          >
            Create Tournament
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
