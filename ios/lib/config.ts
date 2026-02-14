/**
 * Centralized configuration for the iOS app.
 *
 * In development, points to local Next.js dev server.
 * In production, should be set to the deployed URL.
 */

// TODO: Move to environment variable (expo-constants / app.json extra)
export const API_BASE_URL = 'http://192.168.124.12:3000';
export const DO_BASE_URL = 'http://192.168.124.12:8787'; // Cloudflare Worker (Wrangler Dev)
