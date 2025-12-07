import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css' // ★重要: ここでTailwindのスタイルを読み込みます

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)