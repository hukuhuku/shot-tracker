import type { ZoneDef } from './types';

// APIのベースURL
export const API_BASE_URL = "https://shot-tracker-production.up.railway.app";

// コートの描画データ
export const COURT_ZONES: ZoneDef[] = [
  // --- Paint Area ---
  { id: 'Paint', label: 'Paint', category: 'Paint', group: 'Paint', path: 'M 176.5 450 L 176.5 276 L 323.5 276 L 323.5 450 Z', cx: 250, cy: 360 },
  // --- Mid Range Areas ---
  { id: 'Mid-L-Corner', label: 'Mid L-Crnr', category: 'Mid', group: 'Corner', path: 'M 52 450 L 176.5 450 L 176.5 360.5 L 52 360.5 Z', cx: 114, cy: 405 },
  { id: 'Mid-L-Wing', label: 'Mid L-Wing', category: 'Mid', group: 'Wing', path: 'M 52 360.5 L 176.5 360.5 L 176.5 214.3 A 202.5 202.5 0 0 0 52 360.5 Z', cx: 125, cy: 280 },
  { id: 'Mid-Top', label: 'Mid Top', category: 'Mid', group: 'Top', path: 'M 176.5 276 L 323.5 276 L 323.5 214.3 A 202.5 202.5 0 0 0 176.5 214.3 Z', cx: 250, cy: 235 },
  { id: 'Mid-R-Wing', label: 'Mid R-Wing', category: 'Mid', group: 'Wing', path: 'M 448 360.5 L 323.5 360.5 L 323.5 214.3 A 202.5 202.5 0 0 1 448 360.5 Z', cx: 375, cy: 280 },
  { id: 'Mid-R-Corner', label: 'Mid R-Crnr', category: 'Mid', group: 'Corner', path: 'M 448 450 L 323.5 450 L 323.5 360.5 L 448 360.5 Z', cx: 386, cy: 405 },
  // --- 3 Point Areas ---
  { id: '3PT-L-Corner', label: '3PT\nL-Crnr', category: '3PT', group: 'Corner', path: 'M 0 450 L 52 450 L 52 360.5 L 0 360.5 Z', cx: 26, cy: 405 },
  { id: '3PT-L-Wing', label: '3PT L-Wing', category: '3PT', group: 'Wing', path: 'M 52 360.5 A 202.5 202.5 0 0 1 176.5 214.3 L 176.5 0 L 0 0 L 0 360.5 Z', cx: 60, cy: 150 },
  { id: '3PT-Top', label: '3PT Top', category: '3PT', group: 'Top', path: 'M 176.5 214.3 A 202.5 202.5 0 0 1 323.5 214.3 L 323.5 0 L 176.5 0 Z', cx: 250, cy: 80 },
  { id: '3PT-R-Wing', label: '3PT R-Wing', category: '3PT', group: 'Wing', path: 'M 448 360.5 A 202.5 202.5 0 0 0 323.5 214.3 L 323.5 0 L 500 0 L 500 360.5 Z', cx: 440, cy: 150 },
  { id: '3PT-R-Corner', label: '3PT\nR-Crnr', category: '3PT', group: 'Corner', path: 'M 500 450 L 448 450 L 448 360.5 L 500 360.5 Z', cx: 474, cy: 405 },
];