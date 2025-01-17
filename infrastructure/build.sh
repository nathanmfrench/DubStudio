#!/bin/bash
docker run --rm -u root \
  -v "/home/nathan/Desktop/dubstudio/infrastructure/lambda:/asset-input:delegated" \
  -v "/home/nathan/Desktop/dubstudio/infrastructure/cdk.out/asset.0b3eb47719d5ca0491b82809cb8367fb57fe5be6c04613fb279f97182c3002e0:/asset-output:delegated" \
  -w "/asset-input" \
  "public.ecr.aws/sam/build-nodejs18.x" \
  bash -c "set -x && mkdir -p /tmp/npm && npm config set cache /tmp/npm && npm ci && npm run build && ls -la && mkdir -p /asset-output/dist && cp -r dist/* /asset-output/dist/ && cp package.json /asset-output/ && cd /asset-output && npm ci --production"