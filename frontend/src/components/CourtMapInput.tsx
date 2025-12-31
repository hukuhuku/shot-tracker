import { COURT_ZONES } from '../constants';
import type { ZoneDef, ShotRecord } from '../types';

const CourtMapInput = ({ onZoneClick, dailyRecords }: { onZoneClick: (zone: ZoneDef) => void, dailyRecords: ShotRecord[] }) => {
  return (
    <div className="relative w-full max-w-[500px] mx-auto bg-gray-800 rounded-lg overflow-hidden border-4 border-gray-800 shadow-xl">
      <svg viewBox="0 0 500 500" className="w-full h-auto cursor-default select-none bg-gray-800">
        <rect x="0" y="0" width="500" height="500" fill="#2d3748" />
        <rect x="0" y="0" width="500" height="450" fill="#e2d1b3" />
        <rect x="176.5" y="276" width="147" height="174" fill="none" stroke="#ffffff" strokeWidth="2" />
        <path d="M 176.5 276 A 54 54 0 0 1 323.5 276" fill="none" stroke="#ffffff" strokeWidth="2" />
        <path d="M 176.5 276 A 54 54 0 0 0 323.5 276" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="6,6" />
        <path d="M 52 450 L 52 360.5 A 202.5 202.5 0 0 1 448 360.5 L 448 450" fill="none" stroke="#ffffff" strokeWidth="3" />
        <rect x="0" y="0" width="500" height="450" fill="none" stroke="#ffffff" strokeWidth="4" />
        <line x1="250" y1="392.5" x2="250" y2="450" stroke="#ea580c" strokeWidth="4" />
        <circle cx="250" cy="403" r="13.5" fill="none" stroke="#ea580c" strokeWidth="3" />
        <rect x="210" y="392.5" width="80" height="2" fill="#ea580c" />
        <line x1="214" y1="414" x2="286" y2="414" stroke="#334155" strokeWidth="2" />

        {COURT_ZONES.map((zone) => {
          const record = dailyRecords.find(r => r.zoneId === zone.id);
          const hasRecord = !!record;
          const labelLines = zone.label.split('\n');

          return (
            <g key={zone.id} onClick={(e) => { e.stopPropagation(); onZoneClick(zone); }} className="group cursor-pointer">
              <path 
                d={zone.path} 
                className={`stroke-orange-900/10 stroke-1 transition-all duration-150 hover:fill-orange-500/40 active:fill-orange-600/60 ${hasRecord ? 'fill-red-500/20' : 'fill-transparent'}`} 
              />
              
              <text 
                x={zone.cx} 
                y={zone.cy - (hasRecord ? 8 : 0)} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-[10px] sm:text-xs fill-gray-700 font-sans font-bold pointer-events-none drop-shadow-md bg-white/50"
              >
                {labelLines.map((line, i) => (
                  <tspan 
                    key={i} 
                    x={zone.cx} 
                    dy={i === 0 ? (labelLines.length > 1 ? "-0.4em" : "0") : "1.2em"}
                  >
                    {line}
                  </tspan>
                ))}
              </text>
              
              {hasRecord && record && (
                <text 
                  x={zone.cx} 
                  y={zone.cy + 12} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className="text-[12px] sm:text-sm fill-gray-400 font-mono font-bold pointer-events-none drop-shadow-md"
                >
                  {record.makes}/{record.attempts}
                </text>
              )}
            </g>
          );
        })}
        <line x1="0" y1="450" x2="500" y2="450" stroke="#1f2937" strokeWidth="4" />
      </svg>
    </div>
  );
};
export default CourtMapInput;