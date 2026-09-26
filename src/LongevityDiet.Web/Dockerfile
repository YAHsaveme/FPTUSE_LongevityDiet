FROM node:24-alpine AS build
WORKDIR /app
COPY src/LongevityDiet.Web/package*.json ./
RUN npm ci
COPY src/LongevityDiet.Web/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY src/LongevityDiet.Web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
