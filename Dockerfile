# ---- Build: production Angular bundle ----
# Debian (glibc) rather than Alpine: the Angular builder's native bundler bindings fail to load on musl
# ("Chunk optimization failed: Cannot find native binding"). Only the build stage uses this image.
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

# ---- Runtime: nginx serves static files and proxies /api to the backend ----
FROM nginx:1.27-alpine AS runtime

# The nginx image runs envsubst on /etc/nginx/templates/*.template at startup -> conf.d/default.conf.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_URL=http://backend:3000
COPY --from=build /app/dist/user-admin/browser /usr/share/nginx/html

EXPOSE 80
