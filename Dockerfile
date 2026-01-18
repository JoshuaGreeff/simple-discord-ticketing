FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src ./src
COPY tsconfig.json ./
COPY .env.example ./

ENV NODE_ENV=production
ENV DATA_DIR=/app/data
ENV DB_PATH=/app/data/store.db

RUN npm run build

CMD ["node", "dist/index.js"]
