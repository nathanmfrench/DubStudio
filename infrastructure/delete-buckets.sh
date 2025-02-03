#!/bin/bash

buckets=(
  "dubstudio-raw-videos-484907500026-dev"
  "dubstudio-videos-dev" 
  "dubstudio-processed-videos-484907500026-dev"
)

for bucket in "${buckets[@]}"; do
  echo "Deleting $bucket..."
  
  # Get all versions and delete markers
  objects=$(aws s3api list-object-versions \
    --bucket $bucket \
    --query '{Objects: (Versions[].{Key:Key,VersionId:VersionId}) || []}' \
    --output json)

  # Delete all versions first
  if [ "$(echo $objects | jq '.Objects | length')" -gt 0 ]; then
    aws s3api delete-objects \
      --bucket $bucket \
      --delete "$objects" \
      --no-cli-pager
  fi

  # Delete the bucket
  aws s3api delete-bucket --bucket $bucket
done