import { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, BarChart2, MapPin, Calendar, ChevronLeft, ChevronRight, LogOut, Target } from 'lucide-react';
import axios from 'axios';

// --- 1. 設定・型・定数のインポート ---
import { auth } from './firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

import { API_BASE_URL } from './constants';
import type { ShotRecord, ZoneDef } from './types';

// --- 2. コンポーネントのインポート ---
import LoginForm from './components/LoginForm';
import CourtMapInput from './components/CourtMapInput';
import InputModal from './components/InputModal';
import HeatMapCourt from './components/HeatMapCourt';

// --- Main App Component ---
export default function App() {
  // ==========================================
  //  State (状態管理)
  // ==========================================
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentTab, setCurrentTab] = useState<'input' | 'analysis' | 'goal'>('input');
  const [data, setData] = useState<ShotRecord[]>([]);
  const [goalPct, setGoalPct] = useState<number | null>(null);
  const [goalPctInput, setGoalPctInput] = useState<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneDef | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'1month' | '1year'>('1month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // ==========================================
  //  Effects (副作用: 通信や監視)
  // ==========================================
  
  // 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // データ取得
  useEffect(() => {
    if (currentUser) {
      const fetchAll = async () => {
        try {
          const token = await currentUser.getIdToken();
          const headers = { Authorization: `Bearer ${token}` };

          const [shotsRes, settingsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/shots`, { headers }),
            axios.get(`${API_BASE_URL}/api/settings`, { headers }),
          ]);

          console.log("Connected to backend");
          setData(shotsRes.data);

          const fetchedGoal = settingsRes.data.goalPct ?? null;
          setGoalPct(fetchedGoal);
          setGoalPctInput(fetchedGoal);
        } catch (error) {
          console.log("Backend not reachable or Auth failed.", error);
        }
      };
      fetchAll();
    }
  }, [currentUser]);

  // ==========================================
  //  Logic / Handlers (ロジック)
  // ==========================================

  // 日付操作
  function changeDate(days: number) {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  }

  const formatDateQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 選択中の日付のデータだけを抽出
  const dailyRecords = useMemo(() => {
    const queryDate = formatDateQuery(selectedDate);
    return data.filter(d => d.date === queryDate);
  }, [data, selectedDate]);

  // 記録保存処理
  const handleSaveRecord = async (makes: number, attempts: number) => {
    if (!selectedZone || !currentUser) return;
    
    const queryDate = formatDateQuery(selectedDate);
    const newRecord = {
      userId: currentUser.uid,
      date: queryDate,
      zoneId: selectedZone.id,
      category: selectedZone.category,
      makes,
      attempts
    };

    try{
      // 1.トークンの取得
      const token = await currentUser.getIdToken();

      // 2. ヘッダーに付与してリクエスト
      const response = await axios.post(`${API_BASE_URL}/api/shots`, newRecord,{
        headers:{
          Authorization: `Bearer ${token}`
        }
      });

      // 認証成功時のリクエスト
      const savedData = response.data;
      setData(prev => {
        const filtered = prev.filter(r => !(r.date === queryDate && r.zoneId === selectedZone.id));
        return [...filtered, savedData];
      });
      setSelectedZone(null);
      
    } catch (error) {
      console.error("Error saving data:", error);
      alert("保存に失敗しました");
    }
  };
  

  // 目標保存処理
  const handleSaveGoal = async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      await axios.post(`${API_BASE_URL}/api/settings`, { goalPct: goalPctInput }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGoalPct(goalPctInput);
      alert('目標を保存しました');
    } catch (error) {
      console.error("Error saving goal:", error);
      alert('保存に失敗しました');
    }
  };

  // 選択中のゾーンの既存記録を取得（編集用）
  const activeRecord = useMemo(() => {
    if (!selectedZone) return null;
    return dailyRecords.find(r => r.zoneId === selectedZone.id) || null;
  }, [selectedZone, dailyRecords]);

  // --- 分析用データ計算ロジック (グラフ用) ---
  
  // 直近1ヶ月データ（全30日分のスロットを生成し、練習がない日はnull）
  const recentSessionsData = useMemo(() => {
    const today = new Date();
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - 29);

    const grouped = data.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = { makes: 0, attempts: 0 };
      acc[curr.date].makes += curr.makes;
      acc[curr.date].attempts += curr.attempts;
      return acc;
    }, {} as Record<string, { makes: number, attempts: number }>);

    const result = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const session = grouped[dateStr];
      result.push({
        date: dateStr,
        makes: session?.makes ?? 0,
        attempts: session?.attempts ?? 0,
        pct: session && session.attempts > 0 ? Math.round((session.makes / session.attempts) * 100) : null,
      });
    }
    return result;
  }, [data]);

  const recentSessionsStats = useMemo(() => {
    const sessionDays = recentSessionsData.filter(d => d.attempts > 0);
    const totalAttempts = sessionDays.reduce((acc, curr) => acc + curr.attempts, 0);
    const totalMakes = sessionDays.reduce((acc, curr) => acc + curr.makes, 0);
    const avgPct = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 100) : 0;
    return { totalAttempts, totalMakes, avgPct, sessionCount: sessionDays.length };
  }, [recentSessionsData]);

  // トレンドグラフデータ（全日程スロット生成で時系列表示）
  const analysisTrendData = useMemo(() => {
    const today = new Date();
    const days = filterPeriod === '1month' ? 30 : 365;
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - (days - 1));

    const grouped = data.reduce((acc, curr) => {
      if (new Date(curr.date) < startDay) return acc;
      if (!acc[curr.date]) acc[curr.date] = { paintM: 0, paintA: 0, midM: 0, midA: 0, p3M: 0, p3A: 0 };
      const rec = acc[curr.date];
      if (curr.category === 'Paint') { rec.paintM += curr.makes; rec.paintA += curr.attempts; }
      if (curr.category === 'Mid') { rec.midM += curr.makes; rec.midA += curr.attempts; }
      if (curr.category === '3PT') { rec.p3M += curr.makes; rec.p3A += curr.attempts; }
      return acc;
    }, {} as Record<string, { paintM: number, paintA: number, midM: number, midA: number, p3M: number, p3A: number }>);

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDay);
      d.setDate(startDay.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const s = grouped[dateStr];
      result.push({
        date: dateStr,
        Paint: s && s.paintA > 0 ? Math.round((s.paintM / s.paintA) * 100) : null,
        Mid: s && s.midA > 0 ? Math.round((s.midM / s.midA) * 100) : null,
        '3PT': s && s.p3A > 0 ? Math.round((s.p3M / s.p3A) * 100) : null,
      });
    }
    return result;
  }, [data, filterPeriod]);

  // ヒートマップ用データフィルター
  const HeatMapData = useMemo(() => {
    const today = new Date();
    const days = filterPeriod === '1month' ? 30 : 365;
    const start = new Date(today);
    start.setDate(today.getDate() - days);
    return data.filter(d => new Date(d.date) >= start);
  }, [data, filterPeriod]);

  // ==========================================
  //  Render (見た目)
  // ==========================================

  if (!currentUser) return <LoginForm onLogin={() => {}} />;

  return (
    <div className="min-h-screen bg-gray-100 pb-20 sm:pb-0 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="bg-orange-500 p-1.5 rounded-lg shadow-sm"><Activity className="text-white w-5 h-5" /></div>
          <span className="font-extrabold text-xl tracking-tight text-gray-800">ShotTracker <span className="text-orange-500">Pro</span></span>
        </div>
        <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-2 space-y-2">
        {/* Tab Switcher */}
        <div className="flex p-1 bg-white rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentTab('input')} className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'input' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <MapPin className={`w-4 h-4 ${currentTab === 'input' ? 'text-orange-500' : ''}`} /><span>記録</span>
          </button>
          <button onClick={() => setCurrentTab('analysis')} className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'analysis' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <BarChart2 className={`w-4 h-4 ${currentTab === 'analysis' ? 'text-orange-500' : ''}`} /><span>分析</span>
          </button>
          <button onClick={() => setCurrentTab('goal')} className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'goal' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Target className={`w-4 h-4 ${currentTab === 'goal' ? 'text-orange-500' : ''}`} /><span>目標</span>
          </button>
        </div>

        {/* --- INPUT TAB --- */}
        {currentTab === 'input' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Date Navigator */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-2 flex items-center justify-between">
              <button onClick={() => changeDate(-1)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-2 font-bold text-gray-800 text-sm"><Calendar className="w-5 h-5 text-orange-500" />{selectedDate.toLocaleDateString('ja-JP')}</div>
              <button onClick={() => changeDate(1)} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6" /></button>
            </div>

            {/* コートマップ入力コンポーネント */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-2 sm:p-6 overflow-hidden">
              <div className="mb-4 text-center">
                 <h3 className="text-sm font-extrabold text-gray-800">シュートエリアを選択</h3>
                 <p className="text-xs text-gray-500">コート上の記録したい場所をタップしてください</p>
              </div>
              <CourtMapInput onZoneClick={setSelectedZone} dailyRecords={dailyRecords} />
            </div>

            {/* 直近1ヶ月の推移グラフ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-5 sm:p-6">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide">直近1ヶ月の推移</h3>
                   <div className="flex items-baseline space-x-3 mt-1">
                     <span className="text-4xl font-extrabold text-gray-900">{recentSessionsStats.avgPct}<span className="text-2xl">%</span></span>
                     <span className="text-sm text-gray-400">{recentSessionsStats.sessionCount}回練習</span>
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
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5).replace('-', '/')} axisLine={false} tickLine={false} dy={10} interval={6} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} dx={-5} />
                      <Tooltip formatter={(val) => val !== null ? `${val}%` : '—'} labelFormatter={(label) => label.replace('-', '/').slice(2)} />
                      <Line type="monotone" dataKey="pct" stroke="#ea580c" strokeWidth={3} dot={(props) => props.payload.pct !== null ? <circle key={props.key} cx={props.cx} cy={props.cy} r={4} fill="#ea580c" stroke="#fff" strokeWidth={2} /> : <g key={props.key} />} activeDot={{ r: 6 }} connectNulls={true} />
                      {goalPct !== null && (
                        <ReferenceLine y={goalPct} stroke="#374151" strokeDasharray="5 5"
                          label={{ value: `目標 ${goalPct}%`, position: 'insideTopRight', fontSize: 10, fill: '#374151' }} />
                      )}
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {/* --- ANALYSIS TAB --- */}
        {currentTab === 'analysis' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* フィルターUI */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/50">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">期間</label>
              <div className="flex gap-2">
                {(['1month', '1year'] as const).map(p => (
                  <button key={p} onClick={() => setFilterPeriod(p)} className={`px-4 py-2 text-xs font-bold rounded-full transition-all shadow-sm ${filterPeriod === p ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
                    {p === '1month' ? '直近 1ヶ月' : '直近 1年'}
                  </button>
                ))}
              </div>
            </div>

            {/* 分析グラフ */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/50">
               <h3 className="text-lg font-extrabold text-gray-800 mb-6">シュート確率推移</h3>
               <div className="h-80 w-full min-h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -15 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e5e7eb" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val.slice(5).replace('-', '/')} axisLine={false} tickLine={false} dy={10} interval={filterPeriod === '1month' ? 4 : 30} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} dx={-10} />
                      <Tooltip formatter={(val) => val !== null ? `${val}%` : '—'} labelFormatter={(label) => label.replace('-', '/').slice(2)} />
                      <Legend verticalAlign="top" height={36} />
                      <Line type="monotone" dataKey="Paint" stroke="#f97316" strokeWidth={2} dot={(props) => props.payload.Paint !== null ? <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#f97316" stroke="#fff" strokeWidth={2} /> : <g key={props.key} />} activeDot={{ r: 5 }} connectNulls={true} />
                      <Line type="monotone" dataKey="Mid" stroke="#3b82f6" strokeWidth={2} dot={(props) => props.payload.Mid !== null ? <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={2} /> : <g key={props.key} />} activeDot={{ r: 5 }} connectNulls={true} />
                      <Line type="monotone" dataKey="3PT" stroke="#22c55e" strokeWidth={2} dot={(props) => props.payload['3PT'] !== null ? <circle key={props.key} cx={props.cx} cy={props.cy} r={3} fill="#22c55e" stroke="#fff" strokeWidth={2} /> : <g key={props.key} />} activeDot={{ r: 5 }} connectNulls={true} />
                      {goalPct !== null && (
                        <ReferenceLine y={goalPct} stroke="#374151" strokeDasharray="5 5"
                          label={{ value: `目標 ${goalPct}%`, position: 'insideTopRight', fontSize: 10, fill: '#374151' }} />
                      )}
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
            
            {/* ヒートマップコンポーネント */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden p-6">
              <h3 className="text-lg font-extrabold text-gray-800 mb-6">エリア別ヒートマップ</h3>
              <HeatMapCourt data={HeatMapData} goalPct={goalPct} />
            </div>
          </div>
        )}

        {/* --- GOAL TAB --- */}
        {currentTab === 'goal' && (
          <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-6">目標確率の設定</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="text-center">
                  <div className="text-6xl font-extrabold text-gray-900">
                    {goalPctInput !== null ? `${goalPctInput}%` : '未設定'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">目標シュート成功率</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setGoalPctInput(prev => prev === null ? 0 : Math.max(0, prev - 5))}
                    className="w-14 h-14 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    −5%
                  </button>
                  <button
                    onClick={() => setGoalPctInput(prev => prev === null ? 50 : Math.min(100, prev + 5))}
                    className="w-14 h-14 rounded-full bg-gray-100 text-gray-700 text-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center"
                  >
                    +5%
                  </button>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setGoalPctInput(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    未設定にする
                  </button>
                  <button
                    onClick={handleSaveGoal}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    保存する
                  </button>
                </div>
              </div>
            </div>
            {goalPct !== null && (
              <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 text-sm text-orange-800">
                <span className="font-bold">現在の目標:</span> {goalPct}%
              </div>
            )}
          </div>
        )}
      </main>

      {/* 入力モーダル */}
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