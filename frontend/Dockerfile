FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install --omit=dev serve
EXPOSE 80
CMD ["npm", "start"]
