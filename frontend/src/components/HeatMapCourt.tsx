// --- Sub Components ---
import React, { useMemo } from 'react';
import { COURT_ZONES } from '../constants';
import type { ShotRecord } from '../types';

interface Props {
  data: ShotRecord[];
  goalPct?: number | null;
}

const HeatMapCourt: React.FC<Props> = ({ data, goalPct }) => {
  // 親から受け取った data が変わったときだけ、エリアごとの確率を再計算します
  const zoneStats = useMemo(() => {
    return COURT_ZONES.reduce((acc, zone) => {
      const records = data.filter(d => d.zoneId === zone.id);
      const makes = records.reduce((s, r) => s + r.makes, 0);
      const attempts = records.reduce((s, r) => s + r.attempts, 0);
      const pct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0;
      
      acc[zone.id] = { makes, attempts, pct };
      return acc;
    }, {} as Record<string, { makes: number, attempts: number, pct: number }>);
  }, [data]);

  // 色決定ロジック
  const getColor = (pct: number, attempts: number, goal?: number | null) => {
    if (attempts === 0) return '#f3f4f6'; // グレー (データなし)

    if (goal != null) {
      if (pct >= goal + 10) return '#ef4444'; // 目標+10以上: 赤
      if (pct >= goal)      return '#f97316'; // 目標以上: オレンジ
      if (pct >= goal - 10) return '#eab308'; // 目標-10以上: 黄
      return '#3b82f6';                       // 目標-10未満: 青
    }

    // 目標未設定: 現行ロジック
    if (pct >= 50) return '#ef4444';
    if (pct >= 40) return '#f97316';
    if (pct >= 30) return '#eab308';
    return '#3b82f6';
  };

  return (
    <div className="relative w-full max-w-[500px] mx-auto bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <svg viewBox="0 0 500 500" className="w-full h-auto select-none">
        {/* 背景とコートのライン */}
        <rect x="0" y="0" width="500" height="500" fill="#ffffff" />
        <path d="M 52 450 L 52 360.5 A 202.5 202.5 0 0 1 448 360.5 L 448 450" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        <rect x="176.5" y="276" width="147" height="174" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        
        {/* 各ゾーンの描画 */}
        {COURT_ZONES.map((zone) => {
          const stats = zoneStats[zone.id] || { pct: 0, makes: 0, attempts: 0 };
          const color = getColor(stats.pct, stats.attempts, goalPct);
          
          return (
            <g key={zone.id} className="group">
              <path 
                d={zone.path} 
                fill={color} 
                stroke="white" 
                strokeWidth="2" 
                className="transition-colors duration-300 opacity-80 hover:opacity-100" 
              />
              {stats.attempts > 0 && (
                <>
                  <text x={zone.cx} y={zone.cy - 6} textAnchor="middle" className="text-[12px] font-bold fill-white drop-shadow-md pointer-events-none">
                    {stats.pct}%
                  </text>
                  <text x={zone.cx} y={zone.cy + 8} textAnchor="middle" className="text-[8px] font-medium fill-white drop-shadow-md pointer-events-none opacity-90">
                    ({stats.makes}/{stats.attempts})
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
export default HeatMapCourt;