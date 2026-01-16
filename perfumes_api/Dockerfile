FROM node:18

WORKDIR /data/app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "./bin/www"]