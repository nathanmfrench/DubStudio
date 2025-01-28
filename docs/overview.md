





Let me break down the entire infrastructure stack and explain how everything works together:

1. **Core AWS Services Setup**:
```typescript
// S3 Bucket for storing videos
const videoBucket = new s3.Bucket(this, 'DubStudioVideoBucket', {...});

// DynamoDB Table for storing video metadata
const videosTable = new dynamodb.Table(this, 'DubStudioVideosTable', {...});

// Cognito User Pool for authentication
const userPool = new cognito.UserPool(this, 'DubStudioUserPool', {...});
```
- S3 stores the actual video files
- DynamoDB stores metadata about videos (status, user info, etc.)
- Cognito handles user authentication and management

2. **Lambda Functions Architecture**:
```typescript
// TypeScript Lambdas for API handling
const videoUploadHandler = new lambda.Function(...);    // Handles video upload requests
const videoStatusHandler = new lambda.Function(...);    // Checks video status
const videoProcessHandler = new lambda.Function(...);   // Initiates video processing

// Python Lambda for actual video dubbing
const dubbingLayer = new lambda.LayerVersion(...);     // Python dependencies
const videoDubbingHandler = new lambda.Function(...);   // Does the actual dubbing
```

The flow works like this:
1. User uploads video → `videoUploadHandler` (TS)
2. User requests processing → `videoProcessHandler` (TS)
3. Process handler invokes → `videoDubbingHandler` (Python)
4. User checks status → `videoStatusHandler` (TS)

3. **Python Dependencies Management** (The part we just modified):
```typescript
const dubbingLayer = new lambda.LayerVersion(this, 'DubStudioDubbingLayer', {
  code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/python'), {
    bundling: {
      image: lambda.Runtime.PYTHON_3_9.bundlingImage,
      command: [
        'bash', '-c',
        'pip install -r requirements.txt -t /asset-output/python/lib/python3.9/site-packages/'
      ],
    }
  }),
  ...
});
```
This section:
- Uses CDK's bundling feature to create a Lambda layer
- During deployment:
  1. Spins up a Python 3.9 Docker container
  2. Copies your requirements.txt into it
  3. Runs pip install in the container
  4. Packages the installed dependencies in Lambda layer format
  5. Makes these dependencies available to the dubbing function

4. **API Gateway Setup**:
```typescript
const api = new apigateway.RestApi(...);
const apiAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(...);
```
Creates REST API endpoints:
- `/v1/videos` (POST) - Upload video
- `/v1/videos/{videoId}/status` (GET) - Check status
- `/v1/videos/{videoId}/process` (POST) - Start processing

5. **Permissions and Security**:
```typescript
videoBucket.grantReadWrite(videoUploadHandler);
videosTable.grantReadWriteData(videoUploadHandler);
elevenLabsSecret.grantRead(videoDubbingHandler);
```
Sets up least-privilege access:
- Upload handler can read/write to S3
- All handlers can access their needed DynamoDB table
- Dubbing handler can read ElevenLabs API key
- Process handler can invoke dubbing handler

The complete flow when a user wants to dub a video:
1. User authenticates through Cognito
2. Uploads video:
   - Gets presigned URL from upload handler
   - Uploads directly to S3
   - Metadata stored in DynamoDB
3. Requests processing:
   - Process handler validates request
   - Invokes Python dubbing handler asynchronously
   - Updates status in DynamoDB
4. Python dubbing handler:
   - Uses ElevenLabs API (key from Secrets Manager)
   - Processes video using Python dependencies (from Lambda layer)
   - Updates status in DynamoDB
5. User checks status periodically through status endpoint

All of this is deployed as a single CloudFormation stack, with CDK handling the infrastructure-as-code translation and dependency management.

Would you like me to elaborate on any particular part of this architecture?
