// Base URL for the transcription backend.
//
// - Empty string  => same-origin. Use this for local dev and for single-host
//   deploys where the Express server also serves this frontend.
// - A full URL    => the frontend is hosted separately (e.g. on Netlify) and
//   talks to a backend elsewhere (e.g. Render). Set VITE_API_BASE_URL at BUILD
//   time, e.g. VITE_API_BASE_URL="https://scribre-api.onrender.com".
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// Build a full API URL, e.g. apiUrl("/api/transcribe/start").
export const apiUrl = (path: string): string => `${API_BASE}${path}`;
