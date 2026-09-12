// Game history service - stores completed games for analysis
import { Move } from 'chess.js';
import { analyzeGame } from './chessEngine';

export interface CompletedGame {
  id: string;
  whitePlayer: string;
  blackPlayer: string;
  result: 'white' | 'black' | 'draw';
  moves: string[]; // SAN notation
  moveCount: number;
  duration: number; // seconds
  completedAt: string;
  analysis: ReturnType<typeof analyzeGame>;
}

const GAMES_KEY = 'chessbot_games';

export function getGameHistory(): CompletedGame[] {
  const stored = localStorage.getItem(GAMES_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveCompletedGame(
  whitePlayer: string,
  blackPlayer: string,
  result: 'white' | 'black' | 'draw',
  moves: Move[],
  duration: number
): CompletedGame {
  const game: CompletedGame = {
    id: `game_${Date.now()}`,
    whitePlayer,
    blackPlayer,
    result,
    moves: moves.map(m => m.san),
    moveCount: moves.length,
    duration,
    completedAt: new Date().toISOString(),
    analysis: analyzeGame(moves),
  };

  const history = getGameHistory();
  history.unshift(game); // Add to beginning
  localStorage.setItem(GAMES_KEY, JSON.stringify(history));
  return game;
}

export function clearGameHistory(): void {
  localStorage.removeItem(GAMES_KEY);
}

export function getGameStats(): {
  totalGames: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  avgMoves: number;
  avgDuration: number;
} {
  const games = getGameHistory();
  if (games.length === 0) {
    return { totalGames: 0, whiteWins: 0, blackWins: 0, draws: 0, avgMoves: 0, avgDuration: 0 };
  }

  const whiteWins = games.filter(g => g.result === 'white').length;
  const blackWins = games.filter(g => g.result === 'black').length;
  const draws = games.filter(g => g.result === 'draw').length;
  const avgMoves = games.reduce((sum, g) => sum + g.moveCount, 0) / games.length;
  const avgDuration = games.reduce((sum, g) => sum + g.duration, 0) / games.length;

  return { totalGames: games.length, whiteWins, blackWins, draws, avgMoves, avgDuration };
}
