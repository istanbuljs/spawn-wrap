#!/usr/bin/env bash

set -e
export CDPATH=

__filename () {
  local SELF_PATH DIR SYM
  SELF_PATH="$0"
  if [ "${SELF_PATH:0:1}" != "." ] && [ "${SELF_PATH:0:1}" != "/" ]; then
    SELF_PATH=./"$SELF_PATH"
  fi
  SELF_PATH=$( cd -P -- "$(dirname -- "$SELF_PATH")" \
            && pwd -P \
            ) && SELF_PATH=$SELF_PATH/$(basename -- "$0")

  # resolve symlinks
  while [ -h "$SELF_PATH" ]; do
    DIR=$(dirname -- "$SELF_PATH")
    SYM=$(readlink -- "$SELF_PATH")
    SELF_PATH=$( cd -- "$DIR" \
              && cd -- $(dirname -- "$SYM") \
              && pwd \
              )/$(basename -- "$SYM")
  done
  echo -n "$SELF_PATH"
}

__dirname () {
  echo -n $(dirname -- "$(__filename)")
}

cleanPath () {
  local dn=$(__dirname)
  local bin=$dn
  local s=$IFS
  export IFS=':'
  local newpath=()
  local p
  for p in $PATH; do
    if ! [ $p = $bin ]; then
      newpath[${#newpath[@]}]=$p
    fi
  done
  newpath="${newpath[*]}"
  export IFS=$s
  export PATH=$newpath
}

main () {
  cleanPath
  local fn=$(__filename)
  local dn=$(dirname -- "$fn")
  local exe=$(basename -- "$fn")
  cat $dn/_args | {
    local args=()
    while read a; do
      args[${#args[@]}]=$a
    done
    args=("${args[@]}" "$@")
    env $(cat $dn/_env) $exe "${args[@]}"
  }
}

main "$@"
