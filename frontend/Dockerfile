# syntax=docker/dockerfile:1

FROM node:24-alpine AS development
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:24-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine AS production
USER root
COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=101:0 /app/dist /usr/share/nginx/html

# OpenShift supplies an arbitrary user in group 0.
RUN chmod -R g=u /usr/share/nginx/html /var/cache/nginx /etc/nginx /tmp
USER 101

EXPOSE 8080
