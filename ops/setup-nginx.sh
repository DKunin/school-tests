#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="school.kunini.ru"
SITE_NAME="${DOMAIN}.conf"
STAGING_DIR="/home/dekunin/nginx-sites"
STAGED_CONFIG="${STAGING_DIR}/${SITE_NAME}"
BOOTSTRAP_CONFIG="${APP_DIR}/ops/nginx/${DOMAIN}.bootstrap.conf"
TLS_CONFIG="${APP_DIR}/ops/nginx/${SITE_NAME}"
APPLY_HELPER="/usr/local/sbin/codex-nginx-apply"
CERTBOT_CONFIG="/home/dekunin/letsencrypt"
CERTBOT_WORK="/home/dekunin/letsencrypt-work"
CERTBOT_LOGS="/home/dekunin/letsencrypt-logs"

if [[ ! -f "${APP_DIR}/current/index.html" ]]; then
  echo "Deploy the site before configuring Nginx." >&2
  exit 1
fi

install -d -m 0755 "${STAGING_DIR}"
install -m 0644 "${BOOTSTRAP_CONFIG}" "${STAGED_CONFIG}"
sudo -n "${APPLY_HELPER}" "${SITE_NAME}"

challenge_dir="${APP_DIR}/current/.well-known/acme-challenge"
challenge_name="school-preflight-$$"
challenge_value="school-${RANDOM}-${RANDOM}"
install -d -m 0755 "${challenge_dir}"
printf '%s' "${challenge_value}" >"${challenge_dir}/${challenge_name}"
trap 'rm -f "${challenge_dir}/${challenge_name}"' EXIT

served_value=""
for attempt in {1..10}; do
  served_value="$(curl --noproxy '*' --fail --silent --max-time 15 "http://${DOMAIN}/.well-known/acme-challenge/${challenge_name}" 2>/dev/null || true)"
  [[ "${served_value}" == "${challenge_value}" ]] && break
  sleep 1
done
if [[ "${served_value}" != "${challenge_value}" ]]; then
  echo "The public ACME challenge path is not served by this host." >&2
  exit 1
fi

certbot certonly \
  --webroot \
  --webroot-path "${APP_DIR}/current" \
  --domain "${DOMAIN}" \
  --cert-name "${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --config-dir "${CERTBOT_CONFIG}" \
  --work-dir "${CERTBOT_WORK}" \
  --logs-dir "${CERTBOT_LOGS}" \
  --deploy-hook "sudo -n ${APPLY_HELPER} ${SITE_NAME}"

install -m 0644 "${TLS_CONFIG}" "${STAGED_CONFIG}"
if ! sudo -n "${APPLY_HELPER}" "${SITE_NAME}"; then
  install -m 0644 "${BOOTSTRAP_CONFIG}" "${STAGED_CONFIG}"
  sudo -n "${APPLY_HELPER}" "${SITE_NAME}"
  echo "TLS config failed validation; restored the closed HTTP bootstrap config." >&2
  exit 1
fi

"${APP_DIR}/ops/renew-certificate.sh" --dry-run

cron_line="53 4 * * * ${APP_DIR}/ops/renew-certificate.sh --quiet"
current_cron="$(crontab -l 2>/dev/null || true)"
if ! grep -Fqx "${cron_line}" <<<"${current_cron}"; then
  { printf '%s\n' "${current_cron}"; printf '%s\n' "${cron_line}"; } | crontab -
fi

curl --fail --silent --show-error "https://${DOMAIN}/" | grep -Fq "Выбери тему"
printf 'Nginx and TLS are ready for %s.\n' "${DOMAIN}"
