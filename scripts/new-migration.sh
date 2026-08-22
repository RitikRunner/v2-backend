#!/usr/bin/env bash
set -e
read -rp "Migration name: " name
[ -z "$name" ] && { echo "❌ Migration name is required"; exit 1; }
tsx ./node_modules/typeorm/cli.js migration:create "./src/migration/$name"