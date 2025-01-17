# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template


undestand this error: 
Here's a summary of the fixes we made to get the video processing working:

1. **DynamoDB Permissions Fix**:
   - Issue: The Process Lambda function didn't have proper permissions to access DynamoDB
   - Fix: Added `initialPolicy` to the Process Lambda function in `infrastructure-stack.ts`:
   ```typescript
   initialPolicy: [
     new iam.PolicyStatement({
       effect: iam.Effect.ALLOW,
       actions: [
         'dynamodb:GetItem',
         'dynamodb:UpdateItem'
       ],
       resources: [videosTable.tableArn]
     })
   ]
   ```
   - Why: This was needed so the Process Lambda could read and update video entries in DynamoDB

2. **DynamoDB Entry Creation**:
   - Issue: The Upload Lambda was already correctly creating DynamoDB entries during the pre-signed URL generation
   - Verified: The code in `upload.ts` was already creating entries with:
     - `userId` (from Cognito)
     - `videoId` (timestamp)
     - `fileName`
     - `fileType`
     - `s3Key`
     - `status: 'UPLOADED'`
     - `createdAt` and `updatedAt` timestamps

No other fixes were needed because:
1. The Upload Lambda was already creating DynamoDB entries correctly
2. The Process Lambda just needed the proper permissions to read those entries
3. The API Gateway and other infrastructure components were already set up correctly

The main issue was just the missing DynamoDB permissions in the Process Lambda's IAM role.
