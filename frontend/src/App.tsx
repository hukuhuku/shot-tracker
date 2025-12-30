import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
// 未使用のUser, Lockを削除
import { Activity, BarChart2, MapPin, CheckCircle, XCircle, LogOut, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

// ★追加: Firebase関連のインポート (相対パスが正しいことを確認)
import { auth, googleProvider } from './firebaseConfig';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// --- Types & Constants ---

// バックエンドURL (末尾スラッシュなし)
const API_BASE_URL = "https://shot-tracker-production.up.railway.app";

type ZoneCategory = 'Paint' | 'Mid' | '3PT';

interface ShotRecord {
  id?: number;
  userId?: string;
  date: string;
  zoneId: string;
  category: ZoneCategory;
  makes: number;
  attempts: number;
}

interface ZoneDef {
  id: string;
  label: string;
  category: ZoneCategory;
  path: string; 
  cx: number;   
  cy: number;   
  group?: string; 
}

// --- Coordinate Calculations (Scale: 1m = 30px) ---
const COURT_ZONES: ZoneDef[] = [
  // --- Paint Area ---
  { id: 'Paint', label: 'Paint', category: 'Paint', group: 'Paint', path: 'M 176.5 450 L 176.5 276 L 323.5 276 L 323.5 450 Z', cx: 250, cy: 360 },
  // --- Mid Range Areas ---
  { id: 'Mid-L-Corner', label: 'Mid L-Crnr', category: 'Mid', group: 'Corner', path: 'M 52 450 L 176.5 450 L 176.5 360.5 L 52 360.5 Z', cx: 114, cy: 405 },
  { id: 'Mid-L-Wing', label: 'Mid L-Wing', category: 'Mid', group: 'Wing', path: 'M 52 360.5 L 176.5 360.5 L 176.5 214.3 A 202.5 202.5 0 0 0 52 360.5 Z', cx: 125, cy: 280 },
  { id: 'Mid-Top', label: 'Mid Top', category: 'Mid', group: 'Top', path: 'M 176.5 276 L 323.5 276 L 323.5 214.3 A 202.5 202.5 0 0 0 176.5 214.3 Z', cx: 250, cy: 235 },
  { id: 'Mid-R-Wing', label: 'Mid R-Wing', category: 'Mid', group: 'Wing', path: 'M 448 360.5 L 323.5 360.5 L 323.5 214.3 A 202.5 202.5 0 0 1 448 360.5 Z', cx: 375, cy: 280 },
  { id: 'Mid-R-Corner', label: 'Mid R-Crnr', category: 'Mid', group: 'Corner', path: 'M 448 450 L 323.5 450 L 323.5 360.5 L 448 360.5 Z', cx: 386, cy: 405 },
  // --- 3 Point Areas ---
  // 改行したい場所に \n を入れています
  { id: '3PT-L-Corner', label: '3PT\nL-Crnr', category: '3PT', group: 'Corner', path: 'M 0 450 L 52 450 L 52 360.5 L 0 360.5 Z', cx: 26, cy: 405 },
  { id: '3PT-L-Wing', label: '3PT L-Wing', category: '3PT', group: 'Wing', path: 'M 52 360.5 A 202.5 202.5 0 0 1 176.5 214.3 L 176.5 0 L 0 0 L 0 360.5 Z', cx: 60, cy: 150 },
  { id: '3PT-Top', label: '3PT Top', category: '3PT', group: 'Top', path: 'M 176.5 214.3 A 202.5 202.5 0 0 1 323.5 214.3 L 323.5 0 L 176.5 0 Z', cx: 250, cy: 80 },
  { id: '3PT-R-Wing', label: '3PT R-Wing', category: '3PT', group: 'Wing', path: 'M 448 360.5 A 202.5 202.5 0 0 0 323.5 214.3 L 323.5 0 L 500 0 L 500 360.5 Z', cx: 440, cy: 150 },
  { id: '3PT-R-Corner', label: '3PT\nR-Crnr', category: '3PT', group: 'Corner', path: 'M 500 450 L 448 450 L 448 360.5 L 500 360.5 Z', cx: 474, cy: 405 },
];

// --- Mock Data Generator ---
const generateMockData = (): ShotRecord[] => {
  const data: ShotRecord[] = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    if (Math.random() > 0.4) {
      COURT_ZONES.forEach(zone => {
        if (Math.random() > 0.6) {
          const attempts = Math.floor(Math.random() * 15) + 5;
          let percentage = zone.category === 'Paint' ? 0.75 : zone.category === 'Mid' ? 0.55 : 0.38;
          percentage += (Math.random() * 0.3 - 0.15); 
          const makes = Math.floor(attempts * Math.max(0, Math.min(1, percentage)));
          data.push({ id: Math.random(), userId: 'demo', date: dateStr, zoneId: zone.id, category: zone.category, makes, attempts });
        }
      });
    }
  }
  return data;
};

// --- Sub Components ---

const HeatmapCourt = ({ data }: { data: ShotRecord[] }) => {
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

  const getColor = (pct: number, attempts: number) => {
    if (attempts === 0) return '#f3f4f6';
    if (pct >= 50) return '#ef4444'; 
    if (pct >= 40) return '#f97316'; 
    if (pct >= 30) return '#eab308'; 
    return '#3b82f6'; 
  };

  return (
    <div className="relative w-full max-w-[500px] mx-auto bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <svg viewBox="0 0 500 500" className="w-full h-auto select-none">
        <rect x="0" y="0" width="500" height="500" fill="#ffffff" />
        <path d="M 52 450 L 52 360.5 A 202.5 202.5 0 0 1 448 360.5 L 448 450" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        <rect x="176.5" y="276" width="147" height="174" fill="none" stroke="#e5e7eb" strokeWidth="2" />
        {COURT_ZONES.map((zone) => {
          const stats = zoneStats[zone.id] || { pct: 0, makes: 0, attempts: 0 };
          const color = getColor(stats.pct, stats.attempts);
          
          return (
            <g key={zone.id} className="group">
              <path d={zone.path} fill={color} stroke="white" strokeWidth="2" className="transition-colors duration-300 opacity-80 hover:opacity-100" />
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

// ログインフォーム (Googleログイン)
const LoginForm = ({ onLogin }: { onLogin: () => void }) => {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin(); // 親コンポーネントへ通知（実際のUserセットはonAuthStateChangedで行う）
    } catch (error) {
      console.error("Login failed:", error);
      alert("ログインに失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="bg-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Activity className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Shot Tracker Pro</h1>
        <p className="text-gray-500 text-sm mb-8">日々のシュート練習を記録・分析</p>
        
        <button 
          onClick={handleGoogleLogin}
          className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-3"
        >
          {/* Google Icon (簡易版) */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Googleでログイン
        </button>
      </div>
    </div>
  );
};

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
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-500/80 pointer-events-none">TAP TO RECORD</div>
    </div>
  );
};

const InputModal = ({ zone, initialMakes = 0, initialAttempts = 0, onClose, onSave }: { zone: ZoneDef, initialMakes?: number, initialAttempts?: number, onClose: () => void, onSave: (m: number, a: number) => void }) => {
  const [attempts, setAttempts] = useState(initialAttempts > 0 ? initialAttempts : 10);
  const [makes, setMakes] = useState(initialMakes > 0 ? initialMakes : 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(makes, attempts);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">{zone.category} Area</span>
            <h3 className="text-xl font-extrabold text-gray-900">{zone.label.replace('\n', ' ')}</h3>
            {initialAttempts > 0 && <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">編集中</span>}
          </div>
          <button onClick={onClose} className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"><XCircle className="w-6 h-6 text-gray-500" /></button>
        </div>
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-5 rounded-xl border border-gray-100">
            <div className="text-center flex-1">
              <label className="block text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">試投数</label>
              <div className="flex items-center justify-center space-x-4">
                <button onClick={() => setAttempts(Math.max(1, attempts - 1))} className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold">-</button>
                <span className="text-3xl font-extrabold w-12 text-center text-gray-800">{attempts}</span>
                <button onClick={() => setAttempts(attempts + 1)} className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold">+</button>
              </div>
            </div>
            <div className="text-center flex-1 border-l border-gray-200 pl-6">
              <label className="block text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">成功数</label>
               <div className="flex items-center justify-center space-x-4">
                <button onClick={() => setMakes(Math.max(0, makes - 1))} className="w-10 h-10 rounded-full bg-white border border-green-200 shadow-sm flex items-center justify-center text-green-600 font-bold">-</button>
                <span className="text-3xl font-extrabold w-12 text-center text-green-600">{makes}</span>
                <button onClick={() => setMakes(Math.min(attempts, makes + 1))} className="w-10 h-10 rounded-full bg-white border border-green-200 shadow-sm flex items-center justify-center text-green-600 font-bold">+</button>
              </div>
            </div>
          </div>
          <button onClick={handleSubmit} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-md">
            <CheckCircle className="w-6 h-6" /><span className="text-lg">保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null); // ★修正: FirebaseのUserオブジェクトを使用
  const [currentTab, setCurrentTab] = useState<'input' | 'analysis'>('input');
  const [data, setData] = useState<ShotRecord[]>([]); 
  const [selectedZone, setSelectedZone] = useState<ZoneDef | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'1month' | '1year' | 'all'>('1month');
  const [filterCategory, setFilterCategory] = useState<ZoneCategory | 'Total'>('Total');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleZoneClick = (zone: ZoneDef) => setSelectedZone(zone);

  // ★追加: 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDateQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const dailyRecords = useMemo(() => {
    const queryDate = formatDateQuery(selectedDate);
    return data.filter(d => d.date === queryDate);
  }, [data, selectedDate]);

  useEffect(() => {
    if (currentUser) {
      // ★修正: currentUser.uid を使ってデータを取得
      axios.get(`${API_BASE_URL}/api/shots?userId=${currentUser.uid}`)
        .then(response => {
          console.log("Connected to backend!");
          setData(response.data);
          setIsDemoMode(false);
        })
        .catch(error => {
          console.log("Backend not reachable. Using Mock Data.", error);
          setData(generateMockData());
          setIsDemoMode(true);
        });
    }
  }, [currentUser]);

  const handleSaveRecord = (makes: number, attempts: number) => {
    if (!selectedZone || !currentUser) return;
    
    const queryDate = formatDateQuery(selectedDate);
    const newRecord = {
      userId: currentUser.uid, // ★修正: FirebaseのUIDを使用
      date: queryDate,
      zoneId: selectedZone.id,
      category: selectedZone.category,
      makes,
      attempts
    };

    if (isDemoMode) {
      setData(prev => {
        const filtered = prev.filter(r => !(r.date === queryDate && r.zoneId === selectedZone.id));
        return [...filtered, { ...newRecord, id: Math.random() }];
      });
      setSelectedZone(null);
    } else {
      axios.post(`${API_BASE_URL}/api/shots`, newRecord)
        .then(response => {
          const savedData = response.data;
          setData(prev => {
            const filtered = prev.filter(r => !(r.date === queryDate && r.zoneId === selectedZone.id));
            return [...filtered, savedData];
          });
          setSelectedZone(null);
        })
        .catch(error => {
          console.error("Error saving data:", error);
          alert("保存に失敗しました");
        });
    }
  };

  const recentSessionsData = useMemo(() => {
    const grouped = data.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = { date: curr.date, makes: 0, attempts: 0 };
      acc[curr.date].makes += curr.makes;
      acc[curr.date].attempts += curr.attempts;
      return acc;
    }, {} as Record<string, { date: string, makes: number, attempts: number }>);
    return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7).map(d => ({...d, pct: d.attempts > 0 ? Math.round((d.makes / d.attempts) * 100) : 0}));
  }, [data]);

  const recentSessionsStats = useMemo(() => {
    const totalAttempts = recentSessionsData.reduce((acc, curr) => acc + curr.attempts, 0);
    const totalMakes = recentSessionsData.reduce((acc, curr) => acc + curr.makes, 0);
    const avgPct = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 100) : 0;
    return { totalAttempts, totalMakes, avgPct };
  }, [recentSessionsData]);

  const analysisTrendData = useMemo(() => {
    let filtered = data;
    const today = new Date();
    if (filterPeriod === '1month') { const d = new Date(); d.setDate(today.getDate() - 30); filtered = filtered.filter(x => new Date(x.date) >= d); }
    else if (filterPeriod === '1year') { const d = new Date(); d.setDate(today.getDate() - 365); filtered = filtered.filter(x => new Date(x.date) >= d); }
    const grouped = filtered.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) acc[date] = { date, totalM: 0, totalA: 0, paintM: 0, paintA: 0, midM: 0, midA: 0, p3M: 0, p3A: 0 };
      const rec = acc[date];
      rec.totalM += curr.makes; rec.totalA += curr.attempts;
      if (curr.category === 'Paint') { rec.paintM += curr.makes; rec.paintA += curr.attempts; }
      if (curr.category === 'Mid') { rec.midM += curr.makes; rec.midA += curr.attempts; }
      if (curr.category === '3PT') { rec.p3M += curr.makes; rec.p3A += curr.attempts; }
      return acc;
    }, {} as any);
    return Object.values(grouped).sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((d: any) => ({
      date: d.date,
      Total: d.totalA > 0 ? Math.round((d.totalM/d.totalA)*100) : null,
      Paint: d.paintA > 0 ? Math.round((d.paintM/d.paintA)*100) : null,
      Mid: d.midA > 0 ? Math.round((d.midM/d.midA)*100) : null,
      '3PT': d.p3A > 0 ? Math.round((d.p3M/d.p3A)*100) : null,
    }));
  }, [data, filterPeriod]);

  const heatmapData = useMemo(() => {
    const today = new Date();
    let start = new Date(0);
    if (filterPeriod === '1month') start = new Date(today.setDate(today.getDate() - 30));
    if (filterPeriod === '1year') start = new Date(today.setDate(today.getDate() - 365));
    return data.filter(d => new Date(d.date) >= start);
  }, [data, filterPeriod]);

  const activeRecord = useMemo(() => {
    if (!selectedZone) return null;
    return dailyRecords.find(r => r.zoneId === selectedZone.id) || null;
  }, [selectedZone, dailyRecords]);

  if (!currentUser) return <LoginForm onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0 font-sans text-gray-900">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-orange-500 p-1.5 rounded-lg shadow-sm"><Activity className="text-white w-5 h-5" /></div>
          <span className="font-extrabold text-xl tracking-tight text-gray-800">ShotTracker <span className="text-orange-500">Pro</span></span>
          {isDemoMode && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">DEMO</span>}
        </div>
        <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex p-1.5 bg-white rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentTab('input')} className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'input' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <MapPin className={`w-4 h-4 ${currentTab === 'input' ? 'text-orange-500' : ''}`} /><span>記録</span>
          </button>
          <button onClick={() => setCurrentTab('analysis')} className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'analysis' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <BarChart2 className={`w-4 h-4 ${currentTab === 'analysis' ? 'text-orange-500' : ''}`} /><span>分析</span>
          </button>
        </div>

        {currentTab === 'input' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 flex items-center justify-between">
              <button onClick={() => changeDate(-1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-2 font-bold text-gray-800 text-lg"><Calendar className="w-5 h-5 text-orange-500" />{selectedDate.toLocaleDateString('ja-JP')}</div>
              <button onClick={() => changeDate(1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6" /></button>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-2 sm:p-6 overflow-hidden">
              <div className="mb-4 text-center">
                 <h2 className="text-lg font-extrabold text-gray-800">シュートエリアを選択</h2>
                 <p className="text-xs text-gray-500">コート上の記録したい場所をタップしてください</p>
              </div>
              <CourtMapInput onZoneClick={handleZoneClick} dailyRecords={dailyRecords} />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-5 sm:p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">直近7回の全体確率</h3>
                   <div className="flex items-baseline space-x-3 mt-1">
                     <span className="text-4xl font-extrabold text-gray-900">{recentSessionsStats.avgPct}<span className="text-2xl">%</span></span>
                   </div>
                 </div>
                 <div className="text-right bg-orange-50 p-3 rounded-xl border border-orange-100">
                   <div className="text-xs text-orange-800 font-bold mb-1">成功数 / 総試投数</div>
                   <div className="text-xl font-extrabold text-gray-800"><span className="text-orange-600">{recentSessionsStats.totalMakes}</span><span className="text-sm text-gray-400 mx-1">/</span>{recentSessionsStats.totalAttempts}</div>
                 </div>
               </div>
               <div className="h-64 w-full min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recentSessionsData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5).replace('-', '/')} axisLine={false} tickLine={false} dy={10} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} dx={-5} />
                      <Tooltip />
                      <Line type="monotone" dataKey="pct" stroke="#ea580c" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {currentTab === 'analysis' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/50">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Filter className="w-3 h-3"/>カテゴリー</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Total', 'Paint', 'Mid', '3PT'] as const).map(cat => (
                      <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-4 py-2 text-xs font-bold rounded-full transition-all shadow-sm ${filterCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>{cat === 'Total' ? 'Total (全体)' : cat}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">期間</label>
                  <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as any)} className="bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl block w-full pl-4 pr-10 py-2.5">
                    <option value="1month">直近 1ヶ月</option>
                    <option value="1year">直近 1年</option>
                    <option value="all">全期間</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50">
               <h3 className="text-lg font-extrabold text-gray-800 mb-6">シュート確率推移</h3>
               <div className="h-80 w-full min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val.slice(5).replace('-', '/')} axisLine={false} tickLine={false} dy={10} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip />
                      <Line type="monotone" dataKey={filterCategory} stroke="#374151" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden p-6">
              <h3 className="text-lg font-extrabold text-gray-800 mb-6">エリア別ヒートマップ</h3>
              <HeatmapCourt data={heatmapData} />
            </div>
          </div>
        )}
      </main>

      {selectedZone && (
        <InputModal 
          zone={selectedZone} 
          initialMakes={activeRecord ? activeRecord.makes : 0} 
          initialAttempts={activeRecord ? activeRecord.attempts : 0} 
          onClose={() => setSelectedZone(null)} 
          onSave={handleSaveRecord} 
        />
      )}
    </div>
  );
}