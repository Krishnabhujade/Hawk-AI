// Low-level HTTP client for the Hawk AI backend (FastAPI).
//
// Set VITE_API_URL in a .env file to switch from sample data to your server:
//   VITE_API_URL=http://localhost:8000
// With no URL the app runs on the built-in sample data in ./mock.

import { readJSON } from '../lib/storage';

const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const USE_MOCK = BASE_URL === '';
export const API_BASE_URL = BASE_URL;

export const AUTH_KEY = 'hawk.auth';

/**
 * Fired when the server rejects a token we sent (401). AuthContext listens for
 * this and signs the user out. It is a browser event rather than a direct call
 * so that this file stays free of React imports.
 */
export const UNAUTHORIZED_EVENT = 'hawk:unauthorized';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Call the backend and return parsed JSON.
 * FastAPI error bodies look like {"detail": "..."} — that text becomes the error message.
 */
export async function request(path, { method = 'GET', query, body, timeoutMs = 10000 } = {}) {
  const url = new URL(BASE_URL + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }

  const token = readJSON(AUTH_KEY, null)?.token;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = typeof data.detail === 'string' ? data.detail : '';
      } catch {
        /* body was not JSON */
      }
      // Our token was rejected (expired, or the server restarted with a new
      // JWT secret). Tell the app to sign out. Only when we actually sent a
      // token: a 401 from the login form means "wrong password", not
      // "your session ended".
      if (res.status === 401 && token) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
      throw new ApiError(detail || `Request failed (${res.status})`, res.status);
    }
    return res.status === 204 ? null : await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('The server took too long to respond.');
    throw new ApiError('Could not reach the Hawk AI server. Is the backend running?');
  } finally {
    clearTimeout(timer);
  }
}
