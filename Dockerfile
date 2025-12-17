FROM node:18-alpine

WORKDIR /app

COPY orchestrator/package*.json ./

RUN npm install

COPY orchestrator/ ./

EXPOSE 8080

CMD ["node", "server.js"]