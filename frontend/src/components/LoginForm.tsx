import React from 'react';
import { Activity } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig'; // 階層が1つ上がるので ../ になります

interface Props {
  onLogin?: () => void; // ログイン成功後に何かしたい場合のコールバック（任意）
}

const LoginForm: React.FC<Props> = ({ onLogin }) => {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // App.tsxのonAuthStateChangedが検知するので、ここは通知だけでOK
      if (onLogin) onLogin(); 
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
          {/* Google Icon (SVG) */}
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

export default LoginForm;