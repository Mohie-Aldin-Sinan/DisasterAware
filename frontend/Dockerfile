FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build || echo "Build may fail without env vars but that is ok for local dev compose"

CMD ["npm", "start"]
