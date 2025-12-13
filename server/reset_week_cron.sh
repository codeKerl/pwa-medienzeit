#!/bin/sh
# Cron-Script: setzt alle Kinderzeiten wöchentlich zurück.
# Erwartet eine HTTP-API, die einen Reset auslöst. Passe URL und Auth an.
# Beispiel Crontab (So, 23:59):
# 59 23 * * 0 API_URL=https://example.com/api/reset-week API_TOKEN=xyz /path/to/reset_week_cron.sh

API_URL="${API_URL:-https://example.com/api/reset-week}"
API_TOKEN="${API_TOKEN:-changeme}"

curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  || echo "Reset-Call fehlgeschlagen"
