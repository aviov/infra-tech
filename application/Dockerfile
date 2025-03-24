# build stage node to upgrade
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# prod stage
FROM node:22-slim

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/build ./build

# only prod dependencies
RUN npm install --production

EXPOSE 3000

CMD ["node", "build/index.js"]
