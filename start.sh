#!/bin/sh
set -eu

CDPATH= cd -- "$(dirname -- "$0")"
exec node scripts/dev-all.mjs
