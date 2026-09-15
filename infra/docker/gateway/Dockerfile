# nginx-unprivileged runs as uid 101 and already points its pid, cache and temp
# paths at locations that user can write, so nothing here needs root.
FROM nginxinc/nginx-unprivileged:1.31-alpine
# --chown=101:101 keeps both files readable regardless of the mode they carry in
# the build context (root-owned 0600 would make nginx exit on Permission denied).
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 index.html /usr/share/nginx/html/index.html
EXPOSE 8080
