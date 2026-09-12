import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getGameHistory, getGameStats, type CompletedGame } from "../services/gameHistory";

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
  sword: "M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  castle: "M3 21h18M5 21V7l4-4v4M9 21V11M15 21V11M19 21V7l-4-4v4M11 7h2M11 11h2M11 15h2",
  crown: "M2 20h20M5 20V8l4 4 3-6 3 6 4-4v12",
  clock: "M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0M12 6v6l4 2",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-4 py-3 rounded-xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-semibold text-white">{payload[0].name}</p>
        <p className="text-lg font-bold text-white">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export default function Analysis() {
  const navigate = useNavigate();
  const [games, setGames] = useState<CompletedGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<CompletedGame | null>(null);
  const [stats, setStats] = useState(getGameStats());

  useEffect(() => {
    // Always fetch fresh data
    const history = getGameHistory();
    setGames(history);
    setStats(getGameStats());
    if (history.length > 0) {
      setSelectedGame(history[0]);
    }
  }, []);

  // Refresh data when component mounts
  const refreshData = () => {
    const history = getGameHistory();
    setGames(history);
    setStats(getGameStats());
    if (history.length > 0 && !selectedGame) {
      setSelectedGame(history[0]);
    }
  };

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
          <div className="w-20 h-20 rounded-2xl glass-strong mx-auto mb-6 flex items-center justify-center">
            <Icon path={iconPaths.trend} size={36} className="text-yellow-400" />
          </div>
          <h1 className="font-display text-4xl text-white mb-4">No Games Yet</h1>
          <p className="text-gray-400 text-lg mb-8">Play some games to see analysis and insights</p>
          <button onClick={() => navigate("/play")} className="px-8 py-4 bg-gradient-to-br from-yellow-500 to-yellow-600 text-black rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2">
            <Icon path={iconPaths.sparkle} size={20} />
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-5xl text-white mb-1">AI Dashboard</h1>
            <p className="text-neutral-400 text-base">Deep insights and analytics from your games</p>
          </div>
          <button onClick={() => navigate("/")} className="glass px-5 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-all inline-flex items-center gap-2">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back
          </button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Games", value: stats.totalGames, color: "text-white", icon: iconPaths.trophy },
            { label: "White Wins", value: stats.whiteWins, color: "text-green-400", icon: iconPaths.check },
            { label: "Black Wins", value: stats.blackWins, color: "text-red-400", icon: iconPaths.check },
            { label: "Draws", value: stats.draws, color: "text-yellow-400", icon: iconPaths.alert },
            { label: "Avg Moves", value: Math.round(stats.avgMoves), color: "text-blue-400", icon: iconPaths.trend },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-strong rounded-2xl p-5 text-center shadow-xl"
            >
              <Icon path={stat.icon} size={18} className={`${stat.color} mx-auto mb-2 opacity-60`} />
              <div className={`font-display text-4xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game list */}
          <div className="lg:col-span-1">
            <div className="glass-strong rounded-3xl p-5 shadow-xl sticky top-24">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Icon path={iconPaths.trophy} size={18} className="text-yellow-400" />
                Recent Games
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      selectedGame?.id === game.id ? "glass-strong border border-yellow-500/30" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate pr-2">{game.whitePlayer} vs {game.blackPlayer}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
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

          {/* Analysis details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedGame && (
              <>
                {/* 1. PIE CHART */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong rounded-3xl p-6 shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-lg">
                      <Icon path={iconPaths.target} size={20} className="text-black" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Move Quality Distribution</h3>
                      <p className="text-sm text-gray-400">How well each move was played</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-8 items-center">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={moveQualityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                          >
                            {moveQualityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-4">
                      {moveQualityData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}50` }} />
                            <span className="text-base text-gray-200">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2.5 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                            </div>
                            <span className="text-base font-bold text-white w-12 text-right">{item.value}%</span>
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Icon path={iconPaths.zap} size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Game Statistics</h3>
                      <p className="text-sm text-gray-400">Key events during the game</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Captures", value: selectedGame.analysis.captures, icon: iconPaths.sword, color: "from-red-500/20 to-red-600/20", border: "border-red-500/30", iconColor: "text-red-400" },
                      { label: "Checks", value: selectedGame.analysis.checks, icon: iconPaths.bolt, color: "from-yellow-500/20 to-yellow-600/20", border: "border-yellow-500/30", iconColor: "text-yellow-400" },
                      { label: "Castles", value: selectedGame.analysis.castles, icon: iconPaths.castle, color: "from-blue-500/20 to-blue-600/20", border: "border-blue-500/30", iconColor: "text-blue-400" },
                      { label: "Promotions", value: selectedGame.analysis.promotions, icon: iconPaths.crown, color: "from-purple-500/20 to-purple-600/20", border: "border-purple-500/30", iconColor: "text-purple-400" },
                    ].map((stat) => (
                      <div key={stat.label} className={`p-5 rounded-2xl bg-gradient-to-br ${stat.color} border ${stat.border} text-center`}>
                        <Icon path={stat.icon} size={28} className={`${stat.iconColor} mx-auto mb-3`} />
                        <div className="font-display text-4xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
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
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                        <Icon path={iconPaths.alert} size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">Critical Moments</h3>
                        <p className="text-sm text-gray-400">Moves that changed the game</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {selectedGame.analysis.criticalMoments.map((moment, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-red-500/20 rounded-lg text-sm font-bold text-red-400">Move {moment.move}</span>
                              <span className="text-base font-semibold text-white font-mono">{moment.played}</span>
                            </div>
                            <span className="text-sm text-red-400 font-mono">Eval: {moment.eval}</span>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">{moment.explanation}</p>
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                      <Icon path={iconPaths.check} size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Game Info</h3>
                      <p className="text-sm text-gray-400">Match details and metadata</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl glass">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon path={iconPaths.users} size={14} className="text-gray-500" />
                        <div className="text-sm text-gray-400">White</div>
                      </div>
                      <div className="text-base font-medium text-white">{selectedGame.whitePlayer}</div>
                    </div>
                    <div className="p-4 rounded-xl glass">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon path={iconPaths.users} size={14} className="text-gray-500" />
                        <div className="text-sm text-gray-400">Black</div>
                      </div>
                      <div className="text-base font-medium text-white">{selectedGame.blackPlayer}</div>
                    </div>
                    <div className="p-4 rounded-xl glass">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon path={iconPaths.trophy} size={14} className="text-gray-500" />
                        <div className="text-sm text-gray-400">Result</div>
                      </div>
                      <div className={`text-base font-medium ${
                        selectedGame.result === "white" ? "text-green-400" : 
                        selectedGame.result === "black" ? "text-red-400" : "text-yellow-400"
                      }`}>
                        {selectedGame.result === "white" ? "White wins" : selectedGame.result === "black" ? "Black wins" : "Draw"}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl glass">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon path={iconPaths.clock} size={14} className="text-gray-500" />
                        <div className="text-sm text-gray-400">Duration</div>
                      </div>
                      <div className="text-base font-medium text-white">{Math.floor(selectedGame.duration / 60)}m {selectedGame.duration % 60}s</div>
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
