// Tournament management service
import { Chess } from 'chess.js';
import { getBotMove } from './chessEngine';
import { saveCompletedGame } from './gameHistory';

export interface TournamentBot {
  id: number;
  name: string;
  filename: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  bot1: TournamentBot | null;
  bot2: TournamentBot | null;
  winner: TournamentBot | null;
  status: 'pending' | 'playing' | 'completed';
  moves: string[];
  result: 'white' | 'black' | 'draw' | null;
}

export interface Tournament {
  id: string;
  name: string;
  bots: TournamentBot[];
  rounds: TournamentMatch[][];
  currentRound: number;
  status: 'registration' | 'in_progress' | 'completed';
  winner: TournamentBot | null;
  createdAt: string;
  completedAt?: string;
}

const TOURNAMENTS_KEY = 'chessbot_tournaments';

export function getTournaments(): Tournament[] {
  const stored = localStorage.getItem(TOURNAMENTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveTournament(tournament: Tournament): void {
  const tournaments = getTournaments();
  const existingIndex = tournaments.findIndex(t => t.id === tournament.id);
  if (existingIndex >= 0) {
    tournaments[existingIndex] = tournament;
  } else {
    tournaments.unshift(tournament);
  }
  localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
}

export function deleteTournament(id: string): void {
  const tournaments = getTournaments().filter(t => t.id !== id);
  localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
}

export function createTournament(name: string, bots: TournamentBot[]): Tournament {
  // Generate first round pairings
  const shuffled = [...bots].sort(() => Math.random() - 0.5);
  const firstRound: TournamentMatch[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      firstRound.push({
        id: `match_r1_${i / 2}`,
        round: 1,
        matchNumber: i / 2 + 1,
        bot1: shuffled[i],
        bot2: shuffled[i + 1],
        winner: null,
        status: 'pending',
        moves: [],
        result: null,
      });
    } else {
      // Odd number of bots - last one gets a bye
      firstRound.push({
        id: `match_r1_${i / 2}`,
        round: 1,
        matchNumber: i / 2 + 1,
        bot1: shuffled[i],
        bot2: null,
        winner: shuffled[i],
        status: 'completed',
        moves: [],
        result: null,
      });
    }
  }

  return {
    id: `tournament_${Date.now()}`,
    name,
    bots,
    rounds: [firstRound],
    currentRound: 1,
    status: 'registration',
    winner: null,
    createdAt: new Date().toISOString(),
  };
}

export function playTournamentMatch(match: TournamentMatch): TournamentMatch {
  if (!match.bot1 || !match.bot2) return match;

  const game = new Chess();
  let moveCount = 0;
  const maxMoves = 100;

  while (!game.isGameOver() && moveCount < maxMoves) {
    const currentBot = game.turn() === 'w' ? match.bot1! : match.bot2!;
    const botMove = getBotMove(game, currentBot.difficulty);
    if (botMove) {
      const move = game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
      if (move) moveCount++;
    } else {
      break;
    }
  }

  let winner: TournamentBot | null = null;
  let result: 'white' | 'black' | 'draw' | null = null;

  if (game.isCheckmate()) {
    winner = game.turn() === 'w' ? match.bot2 : match.bot1;
    result = game.turn() === 'w' ? 'black' : 'white';
  } else {
    // Draw or max moves reached - random winner
    winner = Math.random() > 0.5 ? match.bot1 : match.bot2;
    result = 'draw';
  }

  // Save to game history
  const moves = game.history({ verbose: true });
  saveCompletedGame(match.bot1.name, match.bot2.name, result || 'draw', moves, moveCount * 3);

  return {
    ...match,
    winner,
    status: 'completed',
    moves: game.history(),
    result,
  };
}

export function playMatchLive(match: TournamentMatch, onMove: (move: string) => void, onComplete: (result: TournamentMatch) => void): () => void {
  if (!match.bot1 || !match.bot2) {
    onComplete(match);
    return () => {};
  }

  const game = new Chess();
  let moveCount = 0;
  const maxMoves = 100;
  let cancelled = false;

  const makeNextMove = () => {
    if (cancelled) return;
    if (game.isGameOver() || moveCount >= maxMoves) {
      let winner: TournamentBot | null = null;
      let result: 'white' | 'black' | 'draw' | null = null;

      if (game.isCheckmate()) {
        winner = game.turn() === 'w' ? match.bot2 : match.bot1;
        result = game.turn() === 'w' ? 'black' : 'white';
      } else {
        winner = Math.random() > 0.5 ? match.bot1 : match.bot2;
        result = 'draw';
      }

      const completedMatch: TournamentMatch = {
        ...match,
        winner,
        status: 'completed',
        moves: game.history(),
        result,
      };

      const moves = game.history({ verbose: true });
      saveCompletedGame(match.bot1!.name, match.bot2!.name, result || 'draw', moves, moveCount * 3);
      onComplete(completedMatch);
      return;
    }

    const currentBot = game.turn() === 'w' ? match.bot1! : match.bot2!;
    const botMove = getBotMove(game, currentBot.difficulty);
    if (botMove) {
      const move = game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
      if (move) {
        moveCount++;
        onMove(move.san);
      }
    }

    setTimeout(makeNextMove, 1200);
  };

  setTimeout(makeNextMove, 500);

  return () => { cancelled = true; };
}

export function advanceTournament(tournament: Tournament): Tournament {
  const currentRoundMatches = tournament.rounds[tournament.currentRound - 1];
  
  // Check if all matches in current round are completed
  const allCompleted = currentRoundMatches.every(m => m.status === 'completed');
  if (!allCompleted) return tournament;

  // Get winners for next round
  const winners = currentRoundMatches
    .filter(m => m.winner !== null)
    .map(m => m.winner!);

  if (winners.length <= 1) {
    // Tournament is over
    return {
      ...tournament,
      status: 'completed',
      winner: winners[0] || null,
      completedAt: new Date().toISOString(),
    };
  }

  // Generate next round pairings
  const shuffled = [...winners].sort(() => Math.random() - 0.5);
  const nextRound: TournamentMatch[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      nextRound.push({
        id: `match_r${tournament.currentRound + 1}_${i / 2}`,
        round: tournament.currentRound + 1,
        matchNumber: i / 2 + 1,
        bot1: shuffled[i],
        bot2: shuffled[i + 1],
        winner: null,
        status: 'pending',
        moves: [],
        result: null,
      });
    } else {
      nextRound.push({
        id: `match_r${tournament.currentRound + 1}_${i / 2}`,
        round: tournament.currentRound + 1,
        matchNumber: i / 2 + 1,
        bot1: shuffled[i],
        bot2: null,
        winner: shuffled[i],
        status: 'completed',
        moves: [],
        result: null,
      });
    }
  }

  return {
    ...tournament,
    rounds: [...tournament.rounds, nextRound],
    currentRound: tournament.currentRound + 1,
    status: 'in_progress',
  };
}

export function getTournamentStats(): {
  totalTournaments: number;
  completedTournaments: number;
  totalMatches: number;
} {
  const tournaments = getTournaments();
  const completed = tournaments.filter(t => t.status === 'completed');
  const totalMatches = tournaments.reduce((sum, t) => 
    sum + t.rounds.reduce((rSum, r) => rSum + r.length, 0), 0
  );

  return {
    totalTournaments: tournaments.length,
    completedTournaments: completed.length,
    totalMatches,
  };
}
