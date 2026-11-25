#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN_DIR="${NODE_BIN_DIR:-/home/dekunin/.nvm/versions/node/v24.10.0/bin}"
NPM_BIN="${NPM_BIN:-${NODE_BIN_DIR}/npm}"
DOMAIN="school.kunini.ru"

export PATH="${NODE_BIN_DIR}:${PATH}"
cd "${APP_DIR}"

if [[ -n "$(git status --short)" ]]; then
  echo "Refusing to deploy a dirty checkout." >&2
  exit 1
fi

git pull --ff-only origin main
"${NPM_BIN}" run check

revision="$(git rev-parse HEAD)"
install -d -m 0755 "${APP_DIR}/releases"
release_dir="$(mktemp -d "${APP_DIR}/releases/${revision}.XXXXXX")"
release_name="$(basename "${release_dir}")"
cp -a "${APP_DIR}/dist/." "${release_dir}/"
chmod -R u=rwX,go=rX "${release_dir}"

previous_target="$(readlink "${APP_DIR}/current" 2>/dev/null || true)"
ln -sfn "releases/${release_name}" "${APP_DIR}/current.next"
mv -Tf "${APP_DIR}/current.next" "${APP_DIR}/current"

if [[ "${SKIP_PUBLIC_VERIFY:-0}" == "1" ]]; then
  printf 'Activated %s for initial Nginx setup.\n' "${revision}"
  exit 0
fi

if ! public_html="$(curl --fail --silent --show-error --max-time 20 "https://${DOMAIN}/")" ||
  [[ "${public_html}" != *"Выбери тему"* ]]; then
  if [[ -n "${previous_target}" ]]; then
    ln -sfn "${previous_target}" "${APP_DIR}/current.next"
    mv -Tf "${APP_DIR}/current.next" "${APP_DIR}/current"
  fi
  echo "Public verification failed; restored ${previous_target:-the previous state}." >&2
  exit 1
fi

printf 'Deployed %s to https://%s/.\n' "${revision}" "${DOMAIN}"
