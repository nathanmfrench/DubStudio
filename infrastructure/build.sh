#!/bin/bash
set -e

echo "🏗️ Building infrastructure..."

# Install root dependencies
npm install

# Build Lambda functions
cd lambda
npm install
npm run build # Must generate files in "dist/" as per CDK expectations
cd ..

# Bootstrap AWS environment (only needed once)
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
REGION=$(aws configure get region)
npx cdk bootstrap aws://$ACCOUNT_ID/$REGION

# Deploy CDK stack
npx cdk deploy --require-approval never