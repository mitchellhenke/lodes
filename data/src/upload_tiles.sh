#!/bin/bash

# Upload tiles to R2/S3 bucket
if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <bucket_name> <endpoint_url> <year> <geography>"
  exit 1
fi

bucket=$1
endpoint_url=$2
year=$3
geography=$4

aws s3api put-object --bucket "${bucket}" --key "tiles/year=${year}/geography=${geography}/tiles-${year}-${geography}.pmtiles" --body  "output/tiles/year=${year}/geography=${geography}/tiles-${year}-${geography}.pmtiles" --checksum-algorithm CRC32 --endpoint-url "${endpoint_url}"
