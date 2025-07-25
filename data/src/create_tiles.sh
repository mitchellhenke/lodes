#!/bin/bash

# Use tippecanoe to create vector tiles from Census CB data
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <year> <geography>"
  exit 1
fi

year=$1
geography=$2

IN_FILE=./input/cb/year=${year}/geography=${geography}/${geography}.geojson
OUT_DIR=./output/tiles/year=${year}/geography=${geography}/
OUT_FILE=tiles-${year}-${geography}.pmtiles
mkdir -p "$OUT_DIR"

tippecanoe -f -zg -l geometry -o "${OUT_DIR}""${OUT_FILE}" \
    --coalesce-densest-as-needed --simplify-only-low-zooms \
    --no-simplification-of-shared-nodes \
    -y id -T id:string -y name -T name:string \
    --extend-zooms-if-still-dropping "${IN_FILE}"
