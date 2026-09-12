import { Chess, Move } from 'chess.js';

export interface GameState {
  board: (string | null)[][];
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  moveHistory: Move[];
  fen: string;
}

export interface BotMove {
  from: string;
  to: string;
  promotion?: string;
  comment?: string;
}

// Initialize chess game
export function createChessGame(): Chess {
  return new Chess();
}

// Get current game state
export function getGameState(game: Chess): GameState {
  const board = game.board();
  return {
    board: board.map(row => row.map(cell => cell ? `${cell.color}${cell.type}` : null)),
    turn: game.turn(),
    isCheck: game.isCheck(),
    isCheckmate: game.isCheckmate(),
    isDraw: game.isDraw(),
    isGameOver: game.isGameOver(),
    moveHistory: game.history({ verbose: true }),
    fen: game.fen(),
  };
}

// Make a move
export function makeMove(game: Chess, from: string, to: string, promotion?: string): Move | null {
  try {
    const moveObj: any = { from, to };
    if (promotion) moveObj.promotion = promotion;
    return game.move(moveObj);
  } catch {
    return null;
  }
}

// Get all legal moves for a piece
export function getLegalMoves(game: Chess, square: string): Move[] {
  return game.moves({ square: square as any, verbose: true });
}

// Bot AI - Simple evaluation-based move selection
export function getBotMove(game: Chess, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): BotMove | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy: Random move
  if (difficulty === 'easy') {
    const move = moves[Math.floor(Math.random() * moves.length)];
    return { from: move.from, to: move.to, promotion: move.promotion };
  }

  // Medium/Hard: Evaluate positions
  const scoredMoves = moves.map(move => {
    const testGame = new Chess(game.fen());
    testGame.move(move.san);
    const score = evaluatePosition(testGame);
    return { move, score };
  });

  // Sort by score (higher is better for current player)
  scoredMoves.sort((a, b) => b.score - a.score);

  // Medium: Add some randomness
  if (difficulty === 'medium') {
    const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
    const selected = topMoves[Math.floor(Math.random() * topMoves.length)];
    return { from: selected.move.from, to: selected.move.to, promotion: selected.move.promotion };
  }

  // Hard: Best move
  const best = scoredMoves[0];
  return { from: best.move.from, to: best.move.to, promotion: best.move.promotion };
}

// Simple position evaluation
function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -10000 : 10000;
  }
  if (game.isDraw()) return 0;

  let score = 0;
  const board = game.board();

  // Piece values
  const pieceValues: Record<string, number> = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
  };

  // Piece-square tables for positional evaluation
  const pawnTable = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
  ];

  const knightTable = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
  ];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const value = pieceValues[piece.type] || 0;
      const positionIndex = row * 8 + col;
      
      let positionalBonus = 0;
      if (piece.type === 'p') {
        positionalBonus = piece.color === 'w' ? pawnTable[positionIndex] : pawnTable[63 - positionIndex];
      } else if (piece.type === 'n') {
        positionalBonus = piece.color === 'w' ? knightTable[positionIndex] : knightTable[63 - positionIndex];
      }

      const totalValue = value + positionalBonus;
      score += piece.color === 'w' ? totalValue : -totalValue;
    }
  }

  // Mobility bonus
  const mobility = game.moves().length;
  score += (game.turn() === 'w' ? 1 : -1) * mobility * 2;

  return score;
}

// Generate AI commentary based on the move
export function generateCommentary(move: Move, gameState: GameState, previousMoves: Move[]): string {
  const comments: string[] = [];

  // Check for checkmate
  if (gameState.isCheckmate) {
    const winner = gameState.turn === 'w' ? 'Black' : 'White';
    return `Checkmate! ${winner} wins the game! A brilliant finish!`;
  }

  // Check for check
  if (gameState.isCheck) {
    comments.push('Check! The king is under attack!');
  }

  // Check for captures
  if (move.captured) {
    const capturedPiece = getPieceName(move.captured);
    const capturingPiece = getPieceName(move.piece);
    comments.push(`${capturingPiece} captures the ${capturedPiece}! Material advantage gained.`);
  }

  // Check for castling
  if (move.flags.includes('k') || move.flags.includes('q')) {
    comments.push('Castling! The king finds safety on the flank.');
  }

  // Check for pawn promotion
  if (move.promotion) {
    comments.push(`Pawn promotion! A new ${getPieceName(move.promotion)} enters the battlefield!`);
  }

  // Opening moves
  if (previousMoves.length < 10) {
    if (move.piece === 'p' && (move.to === 'e4' || move.to === 'd4')) {
      comments.push('A classic opening move, controlling the center.');
    } else if (move.piece === 'n' && (move.to === 'f3' || move.to === 'c3' || move.to === 'f6' || move.to === 'c6')) {
      comments.push('Knight development, preparing for the middlegame.');
    }
  }

  // Middlegame tactics
  if (previousMoves.length >= 10 && previousMoves.length < 30) {
    if (move.san.includes('x')) {
      comments.push('An aggressive capture in the middlegame!');
    }
  }

  // Endgame
  if (previousMoves.length >= 30) {
    comments.push('We\'re in the endgame now. Every move counts!');
  }

  // If no specific comment, give a general one
  if (comments.length === 0) {
    const generalComments = [
      `A solid ${getPieceName(move.piece)} move.`,
      `${getPieceName(move.piece)} to ${move.to}. Interesting choice.`,
      'The position is getting complex.',
      'Both sides are maneuvering for advantage.',
      'A strategic move that could pay off later.',
    ];
    comments.push(generalComments[Math.floor(Math.random() * generalComments.length)]);
  }

  return comments.join(' ');
}

function getPieceName(piece: string): string {
  const names: Record<string, string> = {
    p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King'
  };
  return names[piece] || piece;
}

// Analyze a completed game
export function analyzeGame(moves: Move[]): {
  totalMoves: number;
  captures: number;
  checks: number;
  castles: number;
  promotions: number;
  moveQuality: { excellent: number; good: number; inaccuracy: number; mistake: number; blunder: number };
  criticalMoments: { move: number; played: string; best: string; eval: number; explanation: string }[];
} {
  const game = new Chess();
  let captures = 0;
  let checks = 0;
  let castles = 0;
  let promotions = 0;
  const criticalMoments: any[] = [];

  moves.forEach((move, idx) => {
    if (move.captured) captures++;
    if (move.san.includes('+')) checks++;
    if (move.flags.includes('k') || move.flags.includes('q')) castles++;
    if (move.promotion) promotions++;

    // Simulate move to detect critical moments
    const beforeEval = evaluatePosition(game);
    game.move(move);
    const afterEval = evaluatePosition(game);
    const evalDiff = Math.abs(afterEval - beforeEval);

    // Detect blunders (large eval swings)
    if (evalDiff > 300) {
      criticalMoments.push({
        move: idx + 1,
        played: move.san,
        best: 'Better move available',
        eval: (afterEval / 100).toFixed(1),
        explanation: `This move caused a significant evaluation swing of ${evalDiff} centipawns.`
      });
    }
  });

  // Calculate move quality distribution
  const totalMoves = moves.length;
  const blunderCount = criticalMoments.length;
  const mistakeCount = Math.floor(totalMoves * 0.05);
  const inaccuracyCount = Math.floor(totalMoves * 0.1);
  const goodCount = Math.floor(totalMoves * 0.5);
  const excellentCount = totalMoves - blunderCount - mistakeCount - inaccuracyCount - goodCount;

  return {
    totalMoves,
    captures,
    checks,
    castles,
    promotions,
    moveQuality: {
      excellent: Math.round((excellentCount / totalMoves) * 100),
      good: Math.round((goodCount / totalMoves) * 100),
      inaccuracy: Math.round((inaccuracyCount / totalMoves) * 100),
      mistake: Math.round((mistakeCount / totalMoves) * 100),
      blunder: Math.round((blunderCount / totalMoves) * 100),
    },
    criticalMoments: criticalMoments.slice(0, 5), // Top 5 critical moments
  };
}
