#!/bin/bash
# Mi-Hawk Singapore watchdog.
#
# Runs on the India (or Indonesia) VPS via cron, independently of the
# Singapore main server. Detects when Singapore becomes unreachable and
# logs state transitions to watchdog.log, so an outage has a precise
# timestamp even if nothing else noticed.
#
# Server IP, main domain, SMTP creds, sender/recipient addresses are kept in
# /opt/watchdog/smtp.env (not committed to the repo) so this script
# stays safe to keep in a public repo.

LOG_DIR="/opt/watchdog"
LOG_FILE="$LOG_DIR/watchdog.log"
STATE_FILE="$LOG_DIR/state"
FAIL_THRESHOLD=2 # consecutive failed cycles before alerting

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"

mkdir -p "$LOG_DIR"
source "$LOG_DIR/smtp.env"

: "${SINGAPORE_IP:?Set SINGAPORE_IP in $LOG_DIR/smtp.env}"
: "${DOMAIN:?Set DOMAIN in $LOG_DIR/smtp.env}"
: "${SMTP_USER:?Set SMTP_USER in $LOG_DIR/smtp.env}"
: "${SMTP_PASSWORD:?Set SMTP_PASSWORD in $LOG_DIR/smtp.env}"
: "${SMTP_FROM:?Set SMTP_FROM in $LOG_DIR/smtp.env}"
: "${ALERT_TO:?Set ALERT_TO in $LOG_DIR/smtp.env}"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

send_alert() {
  local subject="$1" body="$2"
  local tmpfile
  tmpfile=$(mktemp)
  {
    echo "From: $SMTP_FROM"
    echo "To: $ALERT_TO"
    echo "Subject: $subject"
    echo "Date: $(date -u +"%a, %d %b %Y %H:%M:%S +0000")"
    echo ""
    echo "$body"
  } > "$tmpfile"

  curl -sS --url "smtp://$SMTP_HOST:$SMTP_PORT" --ssl-reqd \
    --mail-from "$SMTP_FROM" --mail-rcpt "$ALERT_TO" \
    --user "$SMTP_USER:$SMTP_PASSWORD" \
    --upload-file "$tmpfile" >> "$LOG_FILE" 2>&1

  rm -f "$tmpfile"
}

ping_ok=0
ping -c 1 -W 3 "$SINGAPORE_IP" >/dev/null 2>&1 && ping_ok=1

origin_code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "http://$SINGAPORE_IP" 2>/dev/null)
domain_code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$DOMAIN" 2>/dev/null)

# "Up" means either the bare-IP origin or the Cloudflare-proxied domain
# returned a real HTTP response (1xx-4xx). A 5xx from Cloudflare (e.g. 522)
# or no response at all (000) on both means trouble.
is_up=0
if [[ "$origin_code" =~ ^[1-4] ]] || [[ "$domain_code" =~ ^[1-4] ]]; then
  is_up=1
fi

echo "$(ts) ping=$ping_ok origin_http=$origin_code domain_http=$domain_code up=$is_up" >> "$LOG_FILE"

prev_status="UP"
fail_count=0
if [[ -f "$STATE_FILE" ]]; then
  read -r prev_status fail_count < "$STATE_FILE"
fi

if [[ "$is_up" -eq 1 ]]; then
  if [[ "$prev_status" == "DOWN" ]]; then
    echo "$(ts) RECOVERED: Singapore main server is reachable again." >> "$LOG_FILE"
    send_alert "Mi-Hawk RECOVERED" "Singapore main server is reachable again as of $(ts)."
  fi
  echo "UP 0" > "$STATE_FILE"
else
  fail_count=$((fail_count + 1))
  if [[ "$fail_count" -ge "$FAIL_THRESHOLD" && "$prev_status" != "DOWN" ]]; then
    echo "$(ts) ALERT: Singapore main server unreachable for $fail_count consecutive checks." >> "$LOG_FILE"
    send_alert "Mi-Hawk DOWN" "Singapore main server ($SINGAPORE_IP / $DOMAIN) has been unreachable since approx $(ts)."
    echo "DOWN $fail_count" > "$STATE_FILE"
  else
    echo "$prev_status $fail_count" > "$STATE_FILE"
  fi
fi
