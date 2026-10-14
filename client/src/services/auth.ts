export type AuthRole = 'SELLER' | 'COLLECTOR' | 'BUYER' | 'RECYCLER' | 'ADMIN';

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: AuthRole;
  account_status: string;
  verification_status: string;
  seller_type?: string | null;
  business_name?: string | null;
  city: string;
  locality?: string | null;
  preferred_language: string;
  green_score_kg: string;
  completed_transactions: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: AuthRole;
  full_name: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role: Exclude<AuthRole, 'ADMIN'>;
  seller_type?: string;
  business_name?: string;
  city: string;
  locality?: string;
  preferred_language: string;
}

export const toDashboardRole = (role: AuthRole): 'seller' | 'kabadiwala' | 'bulk_buyer' | 'admin' => {
  switch (role) {
    case 'SELLER':
      return 'seller';
    case 'COLLECTOR':
      return 'kabadiwala';
    case 'BUYER':
    case 'RECYCLER':
      return 'bulk_buyer';
    case 'ADMIN':
      return 'admin';
  }
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const AUTH_API_URL = `${API_BASE_URL}/auth`;

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${AUTH_API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    let message = `Authentication request failed (${response.status}).`;
    try {
      const body = await response.json() as { detail?: string | { msg?: string }[] };
      if (typeof body.detail === 'string') {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((issue) => issue.msg).filter(Boolean).join(' ');
      }
    } catch {
      // Keep the HTTP status message if the server did not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    request<AuthUser>('/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (email: string, password: string) =>
    request<AuthTokenResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: () =>
    request<AuthTokenResponse>('/refresh', { method: 'POST' }),

  me: (accessToken: string) =>
    request<AuthUser>('/me', { method: 'GET' }, accessToken),

  logout: (accessToken?: string) =>
    request<void>('/logout', { method: 'POST' }, accessToken),
};
