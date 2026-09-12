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
  target: "M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
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
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-6">📊</div>
          <h1 className="font-display text-4xl text-white mb-4">No Games Yet</h1>
          <p className="text-gray-400 mb-8">Play some games to see analysis and insights</p>
          <button onClick={() => navigate("/play")} className="px-8 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
            <Icon path={iconPaths.sparkle} size={18} />
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-4xl text-white mb-1">Game Analysis</h1>
            <p className="text-gray-400 text-sm">Deep insights from your games</p>
          </div>
          <button onClick={() => navigate("/")} className="glass px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all inline-flex items-center gap-2">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back
          </button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Games", value: stats.totalGames, color: "text-white" },
            { label: "White Wins", value: stats.whiteWins, color: "text-green-400" },
            { label: "Black Wins", value: stats.blackWins, color: "text-red-400" },
            { label: "Draws", value: stats.draws, color: "text-yellow-400" },
            { label: "Avg Moves", value: Math.round(stats.avgMoves), color: "text-blue-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-strong rounded-2xl p-4 text-center shadow-xl"
            >
              <div className={`font-display text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-xs text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game list */}
          <div className="lg:col-span-1">
            <div className="glass-strong rounded-3xl p-5 shadow-xl sticky top-24">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Icon path={iconPaths.trophy} size={16} className="text-yellow-400" />
                Recent Games
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedGame?.id === game.id ? "glass-strong border border-yellow-500/30" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white truncate pr-2">{game.whitePlayer} vs {game.blackPlayer}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${game.result === "white" ? "text-green-400" : game.result === "black" ? "text-red-400" : "text-yellow-400"}`}>
                        {game.result === "white" ? "White wins" : game.result === "black" ? "Black wins" : "Draw"}
                      </span>
                      <span className="text-gray-500">{game.moveCount} moves</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis details - REORDERED */}
          <div className="lg:col-span-2 space-y-6">
            {selectedGame && (
              <>
                {/* 1. PIE CHART FIRST */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                      <Icon path={iconPaths.target} size={16} className="text-black" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Move Quality Distribution</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6 items-center">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={moveQualityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {moveQualityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              background: "rgba(0,0,0,0.8)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                              color: "white",
                              fontSize: "12px"
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {moveQualityData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }} />
                            <span className="text-sm text-gray-300">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                            </div>
                            <span className="text-sm font-bold text-white w-10 text-right">{item.value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* 2. GAME STATISTICS */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-strong rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Icon path={iconPaths.zap} size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Game Statistics</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Captures", value: selectedGame.analysis.captures, icon: "⚔️", color: "from-red-500/20 to-red-600/20", border: "border-red-500/30" },
                      { label: "Checks", value: selectedGame.analysis.checks, icon: "⚡", color: "from-yellow-500/20 to-yellow-600/20", border: "border-yellow-500/30" },
                      { label: "Castles", value: selectedGame.analysis.castles, icon: "🏰", color: "from-blue-500/20 to-blue-600/20", border: "border-blue-500/30" },
                      { label: "Promotions", value: selectedGame.analysis.promotions, icon: "👑", color: "from-purple-500/20 to-purple-600/20", border: "border-purple-500/30" },
                    ].map((stat) => (
                      <div key={stat.label} className={`p-4 rounded-2xl bg-gradient-to-br ${stat.color} border ${stat.border} text-center`}>
                        <div className="text-2xl mb-2">{stat.icon}</div>
                        <div className="font-display text-3xl font-bold text-white">{stat.value}</div>
                        <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* 3. CRITICAL MOMENTS */}
                {selectedGame.analysis.criticalMoments.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-strong rounded-3xl p-6 shadow-xl"
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                        <Icon path={iconPaths.alert} size={16} className="text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Critical Moments</h3>
                    </div>
                    <div className="space-y-3">
                      {selectedGame.analysis.criticalMoments.map((moment, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-red-500/20 rounded text-xs font-bold text-red-400">Move {moment.move}</span>
                              <span className="text-sm font-semibold text-white">{moment.played}</span>
                            </div>
                            <span className="text-xs text-red-400 font-mono">Eval: {moment.eval}</span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{moment.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 4. GAME INFO */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-strong rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <Icon path={iconPaths.check} size={16} className="text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Game Info</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl glass">
                      <div className="text-xs text-gray-400 mb-1">White</div>
                      <div className="text-sm font-medium text-white">{selectedGame.whitePlayer}</div>
                    </div>
                    <div className="p-3 rounded-xl glass">
                      <div className="text-xs text-gray-400 mb-1">Black</div>
                      <div className="text-sm font-medium text-white">{selectedGame.blackPlayer}</div>
                    </div>
                    <div className="p-3 rounded-xl glass">
                      <div className="text-xs text-gray-400 mb-1">Result</div>
                      <div className={`text-sm font-medium ${
                        selectedGame.result === "white" ? "text-green-400" : 
                        selectedGame.result === "black" ? "text-red-400" : "text-yellow-400"
                      }`}>
                        {selectedGame.result === "white" ? "White wins" : selectedGame.result === "black" ? "Black wins" : "Draw"}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl glass">
                      <div className="text-xs text-gray-400 mb-1">Duration</div>
                      <div className="text-sm font-medium text-white">{Math.floor(selectedGame.duration / 60)}m {selectedGame.duration % 60}s</div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
