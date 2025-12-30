export type ZoneCategory = 'Paint' | 'Mid' | '3PT';

export interface ShotRecord {
  id?: number;
  userId?: string;
  date: string;
  zoneId: string;
  category: ZoneCategory;
  makes: number;
  attempts: number;
}

export interface ZoneDef {
  id: string;
  label: string;
  category: ZoneCategory;
  path: string; 
  cx: number;   
  cy: number;   
  group?: string; 
}