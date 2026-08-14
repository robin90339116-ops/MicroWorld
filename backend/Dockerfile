FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV SMALLWORLD_BACKEND_HOST=0.0.0.0
ENV SMALLWORLD_BACKEND_PORT=8787
ENV SMALLWORLD_DATA_FILE=/data/smallworld-data.json

COPY package.json ./
COPY server.js data.json README.md ./

RUN mkdir -p /data

EXPOSE 8787

CMD ["npm", "start"]
