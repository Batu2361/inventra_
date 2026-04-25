#!/bin/sh
set -e

# Substitute ${BACKEND_URL} in the nginx config template.
# Only BACKEND_URL is replaced — nginx variables ($host, $remote_addr, etc.) are left intact.
envsubst '${BACKEND_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
