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
  bot1_id: number;
  bot2_id: number;
  bot1_name: string;
  bot2_name: string;
  status: string;
  result: string | null;
  moves: string[];
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  status: string;
  bots: Bot[];
  created_at: string;
}

// Bot endpoints
export async function getBots(): Promise<Bot[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/bots`);
    if (!res.ok) throw new Error('Failed to fetch bots');
    return res.json();
  } catch {
    return [];
  }
}

export async function uploadBot(name: string, description: string, file: File): Promise<Bot | null> {
  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE_URL}/bots/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload bot');
    return res.json();
  } catch {
    return null;
  }
}

// Match endpoints
export async function getMatches(): Promise<Match[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/matches`);
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  } catch {
    return [];
  }
}

export async function startMatch(bot1Id: number, bot2Id: number): Promise<Match | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/matches/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot1_id: bot1Id, bot2_id: bot2Id }),
    });
    if (!res.ok) throw new Error('Failed to start match');
    return res.json();
  } catch {
    return null;
  }
}

// Tournament endpoints
export async function getTournamentsAPI(): Promise<Tournament[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tournaments`);
    if (!res.ok) throw new Error('Failed to fetch tournaments');
    return res.json();
  } catch {
    return [];
  }
}
