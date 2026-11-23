#!/usr/bin/env bash
set -euo pipefail

repository=$(cd "$(dirname "$0")/../.." && pwd)
build="$repository/dist-site"
if [[ ! -s "$build/index.html" || ! -d "$build/assets" || ! -s "$build/sitemap.xml" ]]; then
  echo "先运行 pnpm build:site。" >&2
  exit 1
fi
pnpm --dir "$repository" check:site-stability

if [[ $# == 0 ]]; then
  set -- contabo-fr
fi

revision=$(git -C "$repository" rev-parse --short HEAD)
release="$(date -u +%Y%m%dT%H%M%SZ)-$revision"
remote=$(cat <<'SCRIPT'
set -eu
base=/var/www/syntrofic-ui
install -d -m 0755 "$base" "$base/releases" "$base/assets"
exec 9>"$base/.publish.lock"
flock 9
stage=$(mktemp -d "$base/releases/.stage.XXXXXXXX")
trap 'rm -rf -- "$stage" "$base/.current-$release"' EXIT
chmod 0755 "$stage"
tar -xzf - --no-same-owner -C "$stage"
test -s "$stage/index.html"
test -s "$stage/sitemap.xml"
test -s "$stage/404.html"
cp -an "$stage/assets/." "$base/assets/"
rm -rf -- "$stage/assets"
test ! -e "$base/releases/$release"
mv -- "$stage" "$base/releases/$release"
ln -s "releases/$release" "$base/.current-$release"
mv -Tf -- "$base/.current-$release" "$base/current"
printf '%s\n' "$release"
SCRIPT
)

COPYFILE_DISABLE=1 tar --format=ustar -C "$build" -czf - . | ssh "$@" "release=$release bash -c $(printf '%q' "$remote")"
