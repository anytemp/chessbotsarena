// API Service Layer - Connects frontend to FastAPI backend
// Falls back to demo mode when backend is unavailable

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Connection state
let _backendAvailable: boolean | null = null;
let _backendCheckPromise: Promise<boolean> | null = null;

export async function checkBackendConnection(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;
  if (_backendCheckPromise) return _backendCheckPromise;
  
  _backendCheckPromise = fetch(`${API_BASE_URL}/`, { 
    method: 'GET',
    signal: AbortSignal.timeout(3000)
  })
    .then(res => {
      _backendAvailable = res.ok;
      return _backendAvailable;
    })
    .catch(() => {
      _backendAvailable = false;
      return false;
    })
    .finally(() => {
      _backendCheckPromise = null;
    });
  
  return _backendCheckPromise;
}

export function isBackendAvailable(): boolean {
  return _backendAvailable === true;
}

export function resetBackendCheck(): void {
  _backendAvailable = null;
}

// Types
export interface Bot {
  id: number;
  name: string;
  filename: string;
  description: string;
  created_at: string;
}

export interface Match {
  id: number;
  bot1_id: number | null;
  bot2_id: number | null;
  winner_id: number | null;
  result: string | null;
  reason: string | null;
  moves: string[];
  final_fen: string | null;
  tournament_id: number | null;
  analysis_summary: Record<string, unknown> | null;
  insights: Record<string, unknown>[];
  round_name: string | null;
  match_sequence: number | null;
  next_match_id: number | null;
  status: string;
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  description: string | null;
  format: string;
  participant_limit: number;
  registration_start: string | null;
  registration_end: string | null;
  tournament_start: string | null;
  tournament_end: string | null;
  status: string;
  created_at: string;
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  bot_id: number;
  seed: number | null;
  status: string;
  created_at: string;
}

export interface BotPerformance {
  bot_id: number;
  bot_name: string;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  avg_eval_loss: number;
  total_blunders: number;
  total_mistakes: number;
}

export interface AnalyticsSummary {
  total_bots: number;
  total_games: number;
  total_tournaments: number;
  active_tournaments: number;
}

export interface DashboardResponse {
  summary: AnalyticsSummary;
  bot_performance: BotPerformance[];
  recent_games: Match[];
  live_games: Match[];
  ai_insights: Record<string, unknown>[];
  grandmaster_summary: string;
}

// API Methods
export const api = {
  // Bots
  async getBots(): Promise<Bot[]> {
    const res = await fetch(`${API_BASE_URL}/api/bots/`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch bots');
    return res.json();
  },

  async createBot(bot: { name: string; filename: string; description?: string }): Promise<Bot> {
    const res = await fetch(`${API_BASE_URL}/api/bots/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bot),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to create bot');
    return res.json();
  },

  // Matches
  async getMatch(matchId: number): Promise<Match> {
    const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch match');
    return res.json();
  },

  async createMatch(bot1Id: number, bot2Id: number, tournamentId?: number): Promise<Match> {
    const res = await fetch(`${API_BASE_URL}/api/matches/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bot1_id: bot1Id,
        bot2_id: bot2Id,
        tournament_id: tournamentId,
      }),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to create match');
    return res.json();
  },

  // Tournaments
  async getTournaments(): Promise<Tournament[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch tournaments');
    return res.json();
  },

  async getTournament(tournamentId: number): Promise<Tournament> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch tournament');
    return res.json();
  },

  async createTournament(tournament: {
    name: string;
    description?: string;
    format?: string;
    participant_limit?: number;
  }): Promise<Tournament> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tournament),
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to create tournament');
    return res.json();
  },

  async registerForTournament(tournamentId: number, botId: number): Promise<TournamentParticipant> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/register?bot_id=${botId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to register for tournament');
    return res.json();
  },

  async startTournament(tournamentId: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/start`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to start tournament');
    return res.json();
  },

  async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/participants`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch participants');
    return res.json();
  },

  async getTournamentMatches(tournamentId: number): Promise<Match[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/matches`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch tournament matches');
    return res.json();
  },

  // Analytics
  async getDashboard(): Promise<DashboardResponse> {
    const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  },

  // WebSocket
  connectToMatch(matchId: number, onMessage: (data: unknown) => void, onClose?: () => void): WebSocket {
    const wsUrl = API_BASE_URL.replace('http', 'ws');
    const ws = new WebSocket(`${wsUrl}/api/ws/match/${matchId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  },
};
