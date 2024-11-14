# 使用 Node.js 18 作為基礎映像
FROM node:20.18-slim

# 設定工作目錄
WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm

# 複製 package.json 和 pnpm-lock.yaml (如果有的話)
COPY package*.json pnpm*.yaml ./

# 使用 pnpm 安裝相依套件
RUN pnpm install

# 確保 app 目錄的權限正確
RUN chown -R node:node /app

# 切換到非 root 使用者
USER node

# 複製專案檔案
COPY . .

# 設定環境變數
ENV NODE_ENV=production
ENV TZ=Asia/Taipei

# 開放 PORT
EXPOSE 5000

# 使用 pnpm 啟動應用程式
CMD ["pnpm", "start"]
