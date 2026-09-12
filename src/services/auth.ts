// Authentication service with localStorage persistence

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

const AUTH_KEY = 'chessbot_user';

export function getCurrentUser(): User | null {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function signIn(email: string, password: string): User {
  // In a real app, this would call the backend API
  // For now, we'll create a simple user from the email
  const username = email.split('@')[0];
  const user: User = {
    id: `user_${Date.now()}`,
    username,
    email,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function signUp(username: string, email: string, password: string): User {
  // In a real app, this would call the backend API
  const user: User = {
    id: `user_${Date.now()}`,
    username,
    email,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
}
