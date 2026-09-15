# Tiny relay: one dependency, no build step.
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs ./
EXPOSE 8791
CMD ["node", "server.mjs"]
