FROM node:22

WORKDIR /data/app

COPY package*.json .

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "./bin/www"]