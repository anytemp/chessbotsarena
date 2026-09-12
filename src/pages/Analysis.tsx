import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getGameHistory, getGameStats, type CompletedGame } from "../services/gameHistory";
import { toast } from "../components/Toast";

const Icon = ({ path, size = 20, className = "" }: { path: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={path} />
  </svg>
);

const iconPaths = {
  arrow: "M5 12h14M12 5l7 7-7 7",
  sparkle: "M12 3v18M3 12h18",
  check: "M20 6L9 17l-5-5",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  trend: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M18 2H6v7a6 6 0 0 0 12 0V2Z",
};

export default function Analysis() {
  const navigate = useNavigate();
  const [games, setGames] = useState<CompletedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<CompletedGame | null>(null);
  const [stats, setStats] = useState(getGameStats());

  useEffect(() => {
    const history = getGameHistory();
    setGames(history);
    setStats(getGameStats());
    if (history.length > 0) {
      setSelectedGame(history[0]);
    }
  }, []);

  const moveQualityData = selectedGame ? [
    { name: "Excellent", value: selectedGame.analysis.moveQuality.excellent, color: "#22c55e" },
    { name: "Good", value: selectedGame.analysis.moveQuality.good, color: "#4ade80" },
    { name: "Inaccuracy", value: selectedGame.analysis.moveQuality.inaccuracy, color: "#facc15" },
    { name: "Mistake", value: selectedGame.analysis.moveQuality.mistake, color: "#fb923c" },
    { name: "Blunder", value: selectedGame.analysis.moveQuality.blunder, color: "#f87171" },
  ] : [];

  if (games.length === 0) {
    return (
      <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="text-6xl mb-6">📊</div>
            <h1 className="font-display text-5xl font-bold text-white mb-4">No Games Yet</h1>
            <p className="text-gray-400 text-lg mb-8">Play some games to see analysis and insights!</p>
            <div className="flex gap-4 justify-center">
              <button onClick={() => navigate("/play")} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                Play a Game
              </button>
              <button onClick={() => navigate("/live")} className="px-8 py-4 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 text-white hover:bg-white/20 transition-all">
                Watch Live Match
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-5xl sm:text-6xl font-bold text-white mb-3">AI Analysis Dashboard</h1>
          <p className="text-gray-400 text-lg">Deep insights from your games</p>
        </motion.div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Games", value: stats.totalGames, icon: iconPaths.check },
            { label: "White Wins", value: stats.whiteWins, icon: iconPaths.trophy },
            { label: "Black Wins", value: stats.blackWins, icon: iconPaths.alert },
            { label: "Draws", value: stats.draws, icon: iconPaths.trend },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3">
                <Icon path={stat.icon} size={20} className="text-white" />
              </div>
              <div className="text-4xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Game Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-300 mb-2 block">Select Game to Analyze</label>
          <select
            value={selectedGame?.id || ""}
            onChange={(e) => {
              const game = games.find(g => g.id === e.target.value);
              if (game) setSelectedGame(game);
            }}
            className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white outline-none"
          >
            {games.map(game => (
              <option key={game.id} value={game.id} className="bg-gray-900">
                {game.whitePlayer} vs {game.blackPlayer} - {new Date(game.completedAt).toLocaleDateString()} ({game.result})
              </option>
            ))}
          </select>
        </div>

        {selectedGame && (
          <>
            {/* Game Info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm text-gray-400 mb-1">White</div>
                  <div className="text-lg font-bold text-white">{selectedGame.whitePlayer}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Black</div>
                  <div className="text-lg font-bold text-white">{selectedGame.blackPlayer}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Result</div>
                  <div className="text-lg font-bold text-cyan-400">{selectedGame.result === 'white' ? 'White Wins' : selectedGame.result === 'black' ? 'Black Wins' : 'Draw'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Duration</div>
                  <div className="text-lg font-bold text-white">{Math.floor(selectedGame.duration / 60)}m {selectedGame.duration % 60}s</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Moves</div>
                  <div className="text-2xl font-bold text-white">{selectedGame.analysis.totalMoves}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Captures</div>
                  <div className="text-2xl font-bold text-white">{selectedGame.analysis.captures}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Checks</div>
                  <div className="text-2xl font-bold text-white">{selectedGame.analysis.checks}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Castles</div>
                  <div className="text-2xl font-bold text-white">{selectedGame.analysis.castles}</div>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Move Quality Distribution */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                <h3 className="font-display text-2xl font-bold text-white mb-6">Move Quality Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={moveQualityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {moveQualityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "12px", color: "#fff" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {moveQualityData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-300">{item.name}</span>
                      <span className="text-sm font-bold text-white ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Critical Moments */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                <h3 className="font-display text-2xl font-bold text-white mb-6">Critical Moments</h3>
                {selectedGame.analysis.criticalMoments.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">✨</div>
                    <p className="text-gray-400">No critical moments detected. Clean game!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedGame.analysis.criticalMoments.map((moment, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-400 font-bold">Move {moment.move}</span>
                          <span className="text-red-400">•</span>
                          <span className="text-red-400 font-mono font-bold">{moment.eval}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-red-900/20 rounded-xl p-3 border border-red-500/10">
                            <div className="text-xs text-red-300/70 mb-1">Played</div>
                            <div className="text-lg font-mono font-bold text-white">{moment.played}</div>
                          </div>
                          <div className="bg-green-900/20 rounded-xl p-3 border border-green-500/10">
                            <div className="text-xs text-green-300/70 mb-1">Best Move</div>
                            <div className="text-lg font-mono font-bold text-white">{moment.best}</div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{moment.explanation}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Move List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl mb-8">
              <h3 className="font-display text-2xl font-bold text-white mb-6">Move History</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {selectedGame.moves.map((move, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-xs text-cyan-300 w-6">{Math.floor(idx / 2) + 1}.</span>
                    <span className="text-sm font-mono font-semibold text-white">{move}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}

        <div className="text-center">
          <button onClick={() => navigate("/")} className="bg-white/10 backdrop-blur-xl hover:bg-white/20 px-6 py-3 rounded-xl font-medium text-white border border-white/20 inline-flex items-center gap-2 transition-all">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
