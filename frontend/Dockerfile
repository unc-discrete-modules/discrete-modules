# syntax=docker/dockerfile:1

FROM node:24-alpine AS development
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine AS production
USER root
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=101:0 /app/dist /usr/share/nginx/html

# OpenShift supplies an arbitrary user in group 0.
RUN chmod -R g=u /usr/share/nginx/html /var/cache/nginx /etc/nginx /tmp
USER 101

EXPOSE 8080
