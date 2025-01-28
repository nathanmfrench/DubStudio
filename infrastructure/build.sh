#!/bin/bash

# Exit on error
set -e

echo "🏗️ Building infrastructure..."

# Install infrastructure dependencies
npm install

# Build TypeScript Lambda functions
cd lambda
npm install
npm run build
cd ..

# Synthesize CDK app
npx cdk synth