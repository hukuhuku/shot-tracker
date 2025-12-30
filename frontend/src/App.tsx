import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, BarChart2, MapPin, Filter, Calendar, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import axios from 'axios';

// --- 1. 設定・型・定数のインポート ---
import { auth } from './firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

import { API_BASE_URL } from './constants';
import type { ShotRecord, ZoneDef, ZoneCategory } from './types';

// --- 2. コンポーネントのインポート ---
import LoginForm from './components/LoginForm';
import CourtMapInput from './components/CourtMapInput';
import HeatmapCourt from './components/HeatMapCourt';
import InputModal from './components/InputModal';

// --- Main App Component ---
export default function App() {
  // ==========================================
  //  State (状態管理)
  // ==========================================
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentTab, setCurrentTab] = useState<'input' | 'analysis'>('input');
  const [data, setData] = useState<ShotRecord[]>([]); 
  const [selectedZone, setSelectedZone] = useState<ZoneDef | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<'1month' | '1year' | 'all'>('1month');
  const [filterCategory, setFilterCategory] = useState<ZoneCategory | 'Total'>('Total');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // ★削除: DemoModeのState削除

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
      axios.get(`${API_BASE_URL}/api/shots?userId=${currentUser.uid}`)
        .then(response => {
          console.log("Connected to backend!");
          setData(response.data);
          // ★削除: setIsDemoMode(false);
        })
        .catch(err => console.error(err));
    }
  }, [currentUser]);

  // ==========================================
  //  Logic / Handlers (ロジック)
  // ==========================================

  // 日付操作
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const formatDateQuery = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 選択中の日付のデータだけを抽出
  const dailyRecords = useMemo(() => {
    const queryDate = formatDateQuery(selectedDate);
    return data.filter(d => d.date === queryDate);
  }, [data, selectedDate]);

  // 記録保存処理
  const handleSaveRecord = (makes: number, attempts: number) => {
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

    // ★修正: DemoModeの条件分岐を削除し、直接バックエンドへ保存するように変更
    axios.post(`${API_BASE_URL}/api/shots`, newRecord)
      .then(response => {
        const savedData = response.data;
        setData(prev => {
          // 既存の同日・同ゾーンのデータがあれば除外して、新しいデータを追加
          const filtered = prev.filter(r => !(r.date === queryDate && r.zoneId === selectedZone.id));
          return [...filtered, savedData];
        });
        setSelectedZone(null);
      })
      .catch(error => {
        console.error("Error saving data:", error);
        alert("保存に失敗しました");
      });
  };

  // 選択中のゾーンの既存記録を取得（編集用）
  const activeRecord = useMemo(() => {
    if (!selectedZone) return null;
    return dailyRecords.find(r => r.zoneId === selectedZone.id) || null;
  }, [selectedZone, dailyRecords]);

  // --- 分析用データ計算ロジック (グラフ用) ---
  
  // 直近セッションデータ
  const recentSessionsData = useMemo(() => {
    const grouped = data.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = { date: curr.date, makes: 0, attempts: 0 };
      acc[curr.date].makes += curr.makes;
      acc[curr.date].attempts += curr.attempts;
      return acc;
    }, {} as Record<string, { date: string, makes: number, attempts: number }>);
    return Object.values(grouped)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
      .map(d => ({...d, pct: d.attempts > 0 ? Math.round((d.makes / d.attempts) * 100) : 0}));
  }, [data]);

  const recentSessionsStats = useMemo(() => {
    const totalAttempts = recentSessionsData.reduce((acc, curr) => acc + curr.attempts, 0);
    const totalMakes = recentSessionsData.reduce((acc, curr) => acc + curr.makes, 0);
    const avgPct = totalAttempts > 0 ? Math.round((totalMakes / totalAttempts) * 100) : 0;
    return { totalAttempts, totalMakes, avgPct };
  }, [recentSessionsData]);

  // トレンドグラフデータ
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

  // ヒートマップ用データフィルター
  const heatmapData = useMemo(() => {
    const today = new Date();
    let start = new Date(0);
    if (filterPeriod === '1month') start = new Date(today.setDate(today.getDate() - 30));
    if (filterPeriod === '1year') start = new Date(today.setDate(today.getDate() - 365));
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
          {/* ★削除: Demoバッジの表示削除 */}
        </div>
        <button onClick={() => signOut(auth)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-white rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentTab('input')} className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'input' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <MapPin className={`w-4 h-4 ${currentTab === 'input' ? 'text-orange-500' : ''}`} /><span>記録</span>
          </button>
          <button onClick={() => setCurrentTab('analysis')} className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold transition-all ${currentTab === 'analysis' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <BarChart2 className={`w-4 h-4 ${currentTab === 'analysis' ? 'text-orange-500' : ''}`} /><span>分析</span>
          </button>
        </div>

        {/* --- INPUT TAB --- */}
        {currentTab === 'input' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Date Navigator */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 flex items-center justify-between">
              <button onClick={() => changeDate(-1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
              <div className="flex items-center gap-2 font-bold text-gray-800 text-lg"><Calendar className="w-5 h-5 text-orange-500" />{selectedDate.toLocaleDateString('ja-JP')}</div>
              <button onClick={() => changeDate(1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"><ChevronRight className="w-6 h-6" /></button>
            </div>

            {/* コートマップ入力コンポーネント */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-2 sm:p-6 overflow-hidden">
              <div className="mb-4 text-center">
                 <h2 className="text-lg font-extrabold text-gray-800">シュートエリアを選択</h2>
                 <p className="text-xs text-gray-500">コート上の記録したい場所をタップしてください</p>
              </div>
              <CourtMapInput onZoneClick={setSelectedZone} dailyRecords={dailyRecords} />
            </div>

            {/* 直近の推移グラフ */}
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

        {/* --- ANALYSIS TAB --- */}
        {currentTab === 'analysis' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* フィルターUI */}
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

            {/* 分析グラフ */}
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
            
            {/* ヒートマップコンポーネント */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden p-6">
              <h3 className="text-lg font-extrabold text-gray-800 mb-6">エリア別ヒートマップ</h3>
              <HeatmapCourt data={heatmapData} />
            </div>
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