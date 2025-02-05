#!/bin/bash
BUCKETS=(
"dubstudio-processed-videos-undefined-dev"
"dubstudio-raw-videos-undefined-dev"
"dubstudio-videos-undefined-dev"
)

echo "The following buckets will be deleted:"
printf '%s\n' "${BUCKETS[@]}"
read -p "Are you sure? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  for BUCKET in "${BUCKETS[@]}"; do
    echo "Processing $BUCKET..."
    
    # Empty bucket
    aws s3 rm s3://$BUCKET --recursive
    
    # Delete bucket
    aws s3api delete-bucket --bucket $BUCKET
    
    echo "$BUCKET deleted"
  done
  echo "All buckets deleted"
else
  echo "Operation cancelled"
fi