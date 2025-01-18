#!/bin/bash
set -a
source .env.development
set +a

echo "Starting with environment variables:"
env | grep EXPO_PUBLIC_

expo start --clear 