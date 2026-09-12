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
      <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="text-6xl mb-6">📊</div>
          <h1 className="font-display text-4xl text-[#2C1810] mb-4">No Games Yet</h1>
          <p className="text-[#5C4A3A] mb-8">Play some games to see analysis and insights</p>
          <button onClick={() => navigate("/play")} className="neu-accent px-8 py-4 rounded-2xl font-semibold inline-flex items-center gap-2">
            <Icon path={iconPaths.sparkle} size={18} />
            Start Playing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 page-enter">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="luxury-heading text-4xl text-[#2C1810] mb-1">Game Analysis</h1>
            <p className="text-[#5C4A3A] text-sm">Deep insights from your games</p>
          </div>
          <button onClick={() => navigate("/")} className="neu-btn px-4 py-2 rounded-xl text-sm font-medium text-[#5C4A3A] inline-flex items-center gap-2">
            <Icon path={iconPaths.arrow} size={16} className="rotate-180" />Back
          </button>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Games", value: stats.totalGames, icon: iconPaths.trophy },
            { label: "White Wins", value: stats.whiteWins, icon: iconPaths.check },
            { label: "Black Wins", value: stats.blackWins, icon: iconPaths.check },
            { label: "Draws", value: stats.draws, icon: iconPaths.alert },
            { label: "Avg Moves", value: Math.round(stats.avgMoves), icon: iconPaths.trend },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="neu-raised rounded-2xl p-4 text-center"
            >
              <div className="font-display text-3xl font-bold text-[#8B6914] mb-1">{stat.value}</div>
              <div className="text-xs text-[#5C4A3A]">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game list */}
          <div className="lg:col-span-1">
            <div className="neu-raised rounded-3xl p-5">
              <h3 className="text-sm font-semibold text-[#2C1810] mb-4">Recent Games</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {games.map((game, i) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedGame?.id === game.id ? "neu-pressed" : "hover:bg-[#D4CFC5]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#2C1810]">{game.whitePlayer} vs {game.blackPlayer}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#8B7A6A]">
                      <span className={`font-medium ${game.result === "white" ? "text-green-600" : game.result === "black" ? "text-red-600" : "text-yellow-600"}`}>
                        {game.result === "white" ? "White wins" : game.result === "black" ? "Black wins" : "Draw"}
                      </span>
                      <span>{game.moveCount} moves</span>
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
                {/* Move quality chart */}
                <div className="neu-raised rounded-3xl p-6">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Move Quality Distribution</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={moveQualityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {moveQualityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {moveQualityData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-[#5C4A3A]">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium text-[#2C1810]">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Game stats */}
                <div className="neu-raised rounded-3xl p-6">
                  <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Game Statistics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-[#8B6914]">{selectedGame.analysis.captures}</div>
                      <div className="text-xs text-[#5C4A3A]">Captures</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-[#8B6914]">{selectedGame.analysis.checks}</div>
                      <div className="text-xs text-[#5C4A3A]">Checks</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-[#8B6914]">{selectedGame.analysis.castles}</div>
                      <div className="text-xs text-[#5C4A3A]">Castles</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-[#8B6914]">{selectedGame.analysis.promotions}</div>
                      <div className="text-xs text-[#5C4A3A]">Promotions</div>
                    </div>
                  </div>
                </div>

                {/* Critical moments */}
                {selectedGame.analysis.criticalMoments.length > 0 && (
                  <div className="neu-raised rounded-3xl p-6">
                    <h3 className="text-lg font-semibold text-[#2C1810] mb-4">Critical Moments</h3>
                    <div className="space-y-3">
                      {selectedGame.analysis.criticalMoments.map((moment, i) => (
                        <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#2C1810]">Move {moment.move}: {moment.played}</span>
                            <span className="text-xs text-red-600">Eval: {moment.eval}</span>
                          </div>
                          <p className="text-xs text-[#5C4A3A]">{moment.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
