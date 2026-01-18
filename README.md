# Shot Tracker Pro 🏀
- Shot Tracker Pro は、バスケットボールのシュート練習を効率的に記録・分析するためのWebアプリケーションです。
- 直感的なコートマップUIを使って、日々のシュート成功率やエリアごとの得意・不得意を可視化し、選手の成長をサポートします。
- ゲームタイムのシュート記録ではなく普段のフリーシューティングの記録管理用です。そのため平均70%〜80%の確率を目指すようなUI/UXとなります。

# 主な機能
## 1. 記録 (Record)
- インタラクティブなコートマップ: バスケットボールのハーフコートを模したUIをタップするだけで、直感的に記録エリアを選択できます。
- 11のシュートゾーン: Paintエリア、Midレンジ(5箇所)、3ポイント(5箇所)の計11エリアに対応。
- 簡単入力: 「成功数」と「試投数」を + / - ボタンで素早く入力可能。
- 日付変更: 過去の日付に遡って記録を追加・修正することができます。
- 既存データの可視化: 入力済みのエリアには、その日の成績（例: 5/10）がマップ上に表示され、タップすることで上書き修正も可能です。
- 直近スタッツ: 過去7回の練習セッションの推移をミニグラフで確認し、モチベーションを維持できます。
  
## 2. 分析 (Analysis)
- シュート確率推移グラフ: 日々の成功率の変化を折れ線グラフで表示。
- ヒートマップ: 成功率に応じてコート上の各エリアを色分け表示（赤: Hot, 青: Cold）。得意エリアと課題が一目で分かります。
- フィルタリング:
  - 期間: 直近1ヶ月、直近1年、全期間
  - カテゴリー: 全体、Paint、Mid、3PT

## 3. ユーザー認証
- Googleログイン: Firebase Authenticationを使用しており、Googleアカウントによるログインが可能です。
  - パスワード認証はGoogle側で行い、Shot-Trackerでは認証されたユーザーIDをもとにサービスを提供します。Shot-Tracker側では一切パスワードを管理しないため、本サービス利用によるGoogleアカウントのパスワード漏洩のリスクはありません。
  
# 技術スタック
- フロントエンド (Frontend)
  - Framework: React (Vite)
  - Auth: Firebase Authentication SDK
  - Deploy: Vercel

- バックエンド (Backend)
 - Framework: Spring Boot (Java 17)
 - Database: MySQL 8.0
 - Auth: Firebase Admin SDK (トークン検証)
 - Build Tool: Maven
 - Deploy: Railway

# セットアップ手順 (ローカル開発)
## 前提条件
- Node.js (v18以上)
- Java JDK 17
- MySQL (ローカルまたはDocker)
- Firebaseプロジェクト

### 1. リポジトリのクローン
```
git clone [https://github.com/your-username/shot-tracker.git](https://github.com/your-username/shot-tracker.git)
cd shot-tracker
```

### 2. バックエンドの起動 (Spring Boot)
```
backend/src/main/resources/application.properties を環境に合わせて設定するか、環境変数を設定します。
Firebaseのサービスアカウントキー(JSON)を取得し、環境変数 FIREBASE_SERVICE_ACCOUNT に設定します。
cd backend
./mvnw spring-boot:run
```
サーバーが http://localhost:8080 で起動します。

### 3. フロントエンドの起動 (React)
frontend ディレクトリに移動します。
.env.local ファイルを作成し、Firebaseとバックエンドの設定を記述します。
# frontend/.env.local
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

ローカル開発時はローカルのバックエンドを指定
```
VITE_API_BASE_URL=http://localhost:8080
```


依存関係をインストールして起動します。
```
cd frontend
npm install
npm run dev
```

ブラウザで http://localhost:5173 にアクセスします。

# デプロイ構成
本番環境は以下の構成で運用されています。

## Frontend: Vercel
GitHubへのPushを検知して自動デプロイ。
vercel.json または環境変数でバックエンドURLを指定。

## Backend & Database: Railway
GitHub連携により、backend/Dockerfile を基に自動ビルド・デプロイ。
MySQLデータベースもRailway上でホスティング。

## デプロイ時の注意点
CORS: バックエンドの ShotController に @CrossOrigin(origins = "特定のドメイン") を設定する必要があります。

### 環境変数:
- Railway: SPRING_DATASOURCE_URL, FIREBASE_SERVICE_ACCOUNT 等を設定。
- Vercel: VITE_FIREBASE_... 系の設定と VITE_API_BASE_URL (RailwayのURL) を設定。

# ディレクトリ構成（修正中）
```
shot-tracker/
├── backend/            # Spring Boot プロジェクト
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile      # Railwayデプロイ用
└── frontend/           # React (Vite) プロジェクト
    ├── src/
    │   ├── App.tsx     # メインロジック
    │   └── firebaseConfig.ts
    ├── package.json
    └── vercel.json     # (Optional) プロキシ設定など
``` 


