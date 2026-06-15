#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
makefile="${repo_root}/Makefile"
gitignore="${repo_root}/.gitignore"
env_example="${repo_root}/.env.example"

targets=(
  install
  dev-backend
  dev-frontend
  dev
  migrate
  seed
  test
  test-backend
  test-frontend
  lint
  format
  clean
)

for target in "${targets[@]}"; do
  grep -qE "^${target}:" "${makefile}"
done

grep -qE '(^|[[:space:]])(\*\*/\.env|\.env)([[:space:]]|$)' "${gitignore}"
grep -q 'APP_DATABASE_URL' "${env_example}"
