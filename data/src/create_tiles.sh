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
    -y id -T id:string \
    --extend-zooms-if-still-dropping "${IN_FILE}"

# aws s3api put-object --bucket lodes-public --key "tiles/year=2022/geography=block_group/tiles-2022-block_group.pmtiles" --body  "output/tiles/year=2023/geography=block_group/tiles-2023-block_group.pmtiles" --checksum-algorithm CRC32 --endpoint-url "https://f8de4764a973ce6156967ec64aab41f3.r2.cloudflarestorage.com/"
