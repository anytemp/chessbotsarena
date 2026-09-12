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
  const index = tournaments.findIndex(t => t.id === tournament.id);
  if (index >= 0) {
    tournaments[index] = tournament;
  } else {
    tournaments.unshift(tournament);
  }
  localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(tournaments));
}

export function createTournament(name: string, bots: TournamentBot[]): Tournament {
  // Create knockout bracket
  const rounds: TournamentMatch[][] = [];
  const numRounds = Math.ceil(Math.log2(bots.length));
  
  // First round - pair up bots
  const firstRound: TournamentMatch[] = [];
  const shuffledBots = [...bots].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < shuffledBots.length; i += 2) {
    const match: TournamentMatch = {
      id: `match_${Date.now()}_${i}`,
      round: 1,
      matchNumber: i / 2 + 1,
      bot1: shuffledBots[i],
      bot2: shuffledBots[i + 1] || null, // Bye if odd number
      winner: null,
      status: shuffledBots[i + 1] ? 'pending' : 'completed',
      moves: [],
      result: null,
    };
    
    // If only one bot in match, they win by default
    if (!shuffledBots[i + 1]) {
      match.winner = shuffledBots[i];
    }
    
    firstRound.push(match);
  }
  
  rounds.push(firstRound);
  
  // Create empty rounds for future matches
  for (let r = 1; r < numRounds; r++) {
    const round: TournamentMatch[] = [];
    const numMatches = Math.ceil(firstRound.length / Math.pow(2, r));
    for (let m = 0; m < numMatches; m++) {
      round.push({
        id: `match_${Date.now()}_r${r + 1}_${m}`,
        round: r + 1,
        matchNumber: m + 1,
        bot1: null,
        bot2: null,
        winner: null,
        status: 'pending',
        moves: [],
        result: null,
      });
    }
    rounds.push(round);
  }
  
  return {
    id: `tournament_${Date.now()}`,
    name,
    bots,
    rounds,
    currentRound: 1,
    status: 'in_progress',
    winner: null,
    createdAt: new Date().toISOString(),
  };
}

export async function playTournamentMatch(match: TournamentMatch): Promise<TournamentMatch> {
  if (!match.bot1 || !match.bot2) return match;
  
  const game = new Chess();
  const maxMoves = 100;
  let moveCount = 0;
  
  // Simulate the game
  while (!game.isGameOver() && moveCount < maxMoves) {
    const botMove = getBotMove(game, 'medium');
    if (botMove) {
      const move = game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
      if (move) {
        match.moves.push(move.san);
      }
    }
    moveCount++;
    
    // Small delay to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Determine winner
  if (game.isCheckmate()) {
    // The player who just moved won (the other player is in checkmate)
    match.winner = game.turn() === 'w' ? match.bot2 : match.bot1;
    match.result = game.turn() === 'w' ? 'black' : 'white';
  } else {
    // Draw or move limit reached
    match.winner = null;
    match.result = 'draw';
  }
  
  match.status = 'completed';
  
  // Save to game history
  const duration = match.moves.length * 2; // Approximate
  saveCompletedGame(match.bot1.name, match.bot2.name, match.result || 'draw', 
    match.moves.map(san => ({ san } as any)), duration);
  
  return match;
}

// Play match with live updates (for LiveMatchViewer)
export function playMatchLive(
  match: TournamentMatch,
  onMove: (game: Chess) => void,
  onComplete: (result: 'white' | 'black' | 'draw', winner: TournamentBot | null) => void
): () => void {
  if (!match.bot1 || !match.bot2) {
    onComplete('draw', null);
    return () => {};
  }
  
  const bot1 = match.bot1;
  const bot2 = match.bot2;
  
  const game = new Chess();
  const maxMoves = 100;
  let moveCount = 0;
  let stopped = false;
  
  const playNextMove = () => {
    if (stopped || game.isGameOver() || moveCount >= maxMoves) {
      // Determine winner
      let result: 'white' | 'black' | 'draw' = 'draw';
      let winner: TournamentBot | null = null;
      
      if (game.isCheckmate()) {
        result = game.turn() === 'w' ? 'black' : 'white';
        winner = game.turn() === 'w' ? bot2 : bot1;
      }
      
      match.result = result;
      match.winner = winner;
      match.status = 'completed';
      
      // Save to game history
      const duration = match.moves.length * 2;
      saveCompletedGame(bot1.name, bot2.name, result, 
        match.moves.map(san => ({ san } as any)), duration);
      
      onComplete(result, winner);
      return;
    }
    
    const botMove = getBotMove(game, 'medium');
    if (botMove) {
      const move = game.move({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
      if (move) {
        match.moves.push(move.san);
      }
    }
    moveCount++;
    
    onMove(game);
    
    setTimeout(playNextMove, 2000);
  };
  
  // Start playing
  setTimeout(playNextMove, 1000);
  
  // Return stop function
  return () => {
    stopped = true;
  };
}

export async function advanceTournament(tournament: Tournament): Promise<Tournament> {
  const currentRoundMatches = tournament.rounds[tournament.currentRound - 1];
  
  // Check if all matches in current round are completed
  const allCompleted = currentRoundMatches.every(m => m.status === 'completed');
  
  if (allCompleted) {
    // Get winners from current round
    const winners = currentRoundMatches
      .filter(m => m.winner)
      .map(m => m.winner!);
    
    // If only one winner, tournament is complete
    if (winners.length === 1) {
      tournament.winner = winners[0];
      tournament.status = 'completed';
      tournament.completedAt = new Date().toISOString();
      return tournament;
    }
    
    // Move to next round
    tournament.currentRound++;
    
    if (tournament.currentRound <= tournament.rounds.length) {
      const nextRoundMatches = tournament.rounds[tournament.currentRound - 1];
      
      // Pair up winners
      for (let i = 0; i < winners.length; i += 2) {
        if (nextRoundMatches[i / 2]) {
          nextRoundMatches[i / 2].bot1 = winners[i];
          nextRoundMatches[i / 2].bot2 = winners[i + 1] || null;
          nextRoundMatches[i / 2].status = winners[i + 1] ? 'pending' : 'completed';
          
          if (!winners[i + 1]) {
            nextRoundMatches[i / 2].winner = winners[i];
          }
        }
      }
    }
  }
  
  return tournament;
}

export function getTournamentStats(tournament: Tournament): {
  totalMatches: number;
  completedMatches: number;
  totalMoves: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
} {
  let totalMatches = 0;
  let completedMatches = 0;
  let totalMoves = 0;
  let whiteWins = 0;
  let blackWins = 0;
  let draws = 0;
  
  tournament.rounds.forEach(round => {
    round.forEach(match => {
      totalMatches++;
      if (match.status === 'completed') {
        completedMatches++;
        totalMoves += match.moves.length;
        if (match.result === 'white') whiteWins++;
        else if (match.result === 'black') blackWins++;
        else if (match.result === 'draw') draws++;
      }
    });
  });
  
  return { totalMatches, completedMatches, totalMoves, whiteWins, blackWins, draws };
}
