# --- Stage 1: Build the application ---
# ビルド用のイメージ (Maven + Java 17)
# ※ローカル環境がJava 21の場合は 'maven:3.9-eclipse-temurin-21' に変更してください
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# 依存関係のキャッシュを効かせるためにpom.xmlだけ先にコピー
COPY pom.xml .
# 依存関係をダウンロード（オフラインモードの準備）
RUN mvn dependency:go-offline -B

# ソースコードをコピーしてビルド（テストはスキップして高速化）
COPY src ./src
RUN mvn clean package -DskipTests

# --- Stage 2: Run the application ---
# 実行用には軽量なJDKイメージを使用します
# ※Java 21の場合は 'eclipse-temurin:21-jdk-alpine' に変更してください
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# ビルドステージで作られたJARファイルをコピー
COPY --from=build /app/target/*.jar app.jar

# ポート8080を公開
EXPOSE 8080

# アプリケーションの起動
ENTRYPOINT ["java", "-jar", "app.jar"]