FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV SMALLWORLD_BACKEND_HOST=0.0.0.0
ENV SMALLWORLD_BACKEND_PORT=8787
ENV SMALLWORLD_DATA_FILE=/data/smallworld-data.json

# 先安装依赖(含 pg;仅当配置 SMALLWORLD_DATABASE_URL 走华为云 GaussDB/RDS 时才实际使用)。
# 单独一层便于利用缓存。
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# 应用代码:server.js 依赖 src/ 下的全部业务模块与 shared/store,必须一起拷贝。
COPY server.js database-backup.js README.md ./
COPY src ./src

# 本地/单机 file 模式的数据目录;云上可用持久卷(EVS/SFS)挂载到 /data,
# 或改用 SMALLWORLD_DATABASE_URL 走华为云数据库(此时 /data 不再承载业务数据)。
RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/health',{signal:AbortSignal.timeout(4000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
