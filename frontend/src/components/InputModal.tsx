import React, { useState } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import type { ZoneDef } from '../types'; // 型定義をインポート

interface Props {
  zone: ZoneDef;                // どこのエリアのシュートか
  initialMakes?: number;        // 元々の成功数（編集時用）
  initialAttempts?: number;     // 元々の試投数
  onClose: () => void;          // 閉じるボタンが押されたとき
  onSave: (makes: number, attempts: number) => void; // 保存ボタンが押されたとき
}

const InputModal: React.FC<Props> = ({ 
  zone, 
  initialMakes = 0, 
  initialAttempts = 0, 
  onClose, 
  onSave 
}) => {
  // このモーダルの中だけで使う「一時的な数字」の状態
  // 初期値がなければ、とりあえず 10本中5本 からスタートするようにしています
  const [attempts, setAttempts] = useState(initialAttempts > 0 ? initialAttempts : 10);
  const [makes, setMakes] = useState(initialMakes > 0 ? initialMakes : 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(makes, attempts); // 親（App.tsx）に数字を渡す
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        
        {/* ヘッダー部分: エリア名と閉じるボタン */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="block text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">{zone.category} Area</span>
            <h3 className="text-xl font-extrabold text-gray-900">{zone.label.replace('\n', ' ')}</h3>
            {initialAttempts > 0 && <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">編集中</span>}
          </div>
          <button onClick={onClose} className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* 入力フォーム部分 */}
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-gray-50 p-5 rounded-xl border border-gray-100">
            
            {/* 試投数 (Attempts) の入力 */}
            <div className="text-center flex-1">
              <label className="block text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">試投数</label>
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={() => setAttempts(Math.max(1, attempts - 1))} 
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="text-3xl font-extrabold w-12 text-center text-gray-800">{attempts}</span>
                <button 
                  onClick={() => setAttempts(attempts + 1)} 
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* 成功数 (Makes) の入力 */}
            <div className="text-center flex-1 border-l border-gray-200 pl-6">
              <label className="block text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">成功数</label>
               <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={() => setMakes(Math.max(0, makes - 1))} 
                  className="w-10 h-10 rounded-full bg-white border border-green-200 shadow-sm flex items-center justify-center text-green-600 font-bold"
                >
                  -
                </button>
                <span className="text-3xl font-extrabold w-12 text-center text-green-600">{makes}</span>
                <button 
                  // 成功数が試投数を超えないように制御 (Math.min)
                  onClick={() => setMakes(Math.min(attempts, makes + 1))} 
                  className="w-10 h-10 rounded-full bg-white border border-green-200 shadow-sm flex items-center justify-center text-green-600 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <button 
            onClick={handleSubmit} 
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl flex items-center justify-center space-x-2 shadow-md transition-colors"
          >
            <CheckCircle className="w-6 h-6" />
            <span className="text-lg">保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputModal;