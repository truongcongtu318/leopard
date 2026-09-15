# nginx-unprivileged runs as uid 101 and already points its pid, cache and temp
# paths at locations that user can write, so nothing here needs root.
FROM nginxinc/nginx-unprivileged:1.31-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 8080
