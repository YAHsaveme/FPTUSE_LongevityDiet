#!/usr/bin/env bash
# Wait until ASP.NET finishes SQL migrations and all required dependencies
# pass /ready before the legacy Worker may open LongevityDietDb.
set -eu
exec 3<>/dev/tcp/127.0.0.1/8080
printf 'GET /ready HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3
IFS= read -r status <&3
case "$status" in
  "HTTP/1.1 200"* | "HTTP/1.0 200"*) exit 0 ;;
  *) exit 1 ;;
esac
