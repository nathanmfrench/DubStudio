import { Handler, APIGatewayProxyEvent } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { success, error, AuthenticatedEvent } from '../types/api';
import { S3 } from 'aws-sdk';

const lambdaClient = new LambdaClient({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';
const DUBBING_FUNCTION_NAME = process.env.DUBBING_FUNCTION_NAME || '';
const SUBTITLE_FUNCTION_NAME = process.env.SUBTITLE_FUNCTION_NAME!;
const s3 = new S3();

if (!process.env.SUBTITLE_FUNCTION_NAME) {
  throw new Error('SUBTITLE_FUNCTION_NAME environment variable not set');
}

// Mock video processor (keep this until real implementation)
async function processVideoContent(input: Buffer): Promise<Buffer> {
  return Buffer.from(`PROCESSED: ${input.toString('utf-8')}`);
}

// Core processing logic
async function handleVideoProcessing(userId: string, videoId: string): Promise<void> {
  // 1. Retrieve raw video
  const getParams = {
    Bucket: 'dubstudio-raw-videos',
    Key: `uploads/${userId}/${videoId}/original.mp4`
  };
  
  const rawData = await s3.getObject(getParams).promise();
  if (!rawData.Body) throw new Error('Empty video file');

  // 2. Process content
  const processedBuffer = await processVideoContent(rawData.Body as Buffer);

  // 3. Store processed video
  const putParams = {
    Bucket: 'dubstudio-processed-videos',
    Key: `videos/${userId}/${videoId}/final.mp4`,
    Body: processedBuffer
  };
  await s3.putObject(putParams).promise();

  // 4. Cleanup raw file
  await Promise.all([
    // Raw file
    s3.deleteObject({
      Bucket: 'dubstudio-raw-videos',
      Key: `uploads/${userId}/${videoId}/original.mp4`
    }).promise(),
    
    // Processed file
    s3.deleteObject({
      Bucket: 'dubstudio-processed-videos',
      Key: `videos/${userId}/${videoId}/final.mp4`
    }).promise()
  ]);
}

// Lambda entry point
export const handler: Handler<APIGatewayProxyEvent> = async (event, context) => {
  console.log({
    stage: 'START',
    functionName: 'process-handler',  
    requestId: context.awsRequestId,
    timestamp: new Date().toISOString(),
    event: {
      path: event.path,
      httpMethod: event.httpMethod,
      pathParameters: event.pathParameters
    }
  });

  try {
    // Extract user context
    const userId = event.requestContext?.authorizer?.userId 
                   || event.headers?.['x-user-id'];
    if (!userId) return error(401, 'Unauthorized');

    // Add proper body parsing
    const body = typeof event.body === 'string' ? 
      JSON.parse(event.body) : 
      event.body || event;
    
    // Add path parameter fallback
    const videoId = body.videoId || event.pathParameters?.videoId;
    if (!videoId) return error(400, 'Missing videoId');

    // Execute processing
    await handleVideoProcessing(userId, videoId);
    return success({ status: 'completed' });

  } catch (err) {
    console.error('Processing failed:', err);
    return error(500, 'Error processing request');
  }
};

const processVideo = async (userId: string, videoId: string) => {
  try {
    // Get object as buffer instead of stream
    const { Body } = await s3.getObject({
      Bucket: 'dubstudio-raw-videos',
      Key: `uploads/${userId}/${videoId}/original.mp4`
    }).promise();

    if (!Body) throw new Error('Empty video file');
    
    // Process video buffer
    const processedBuffer = await processVideoContent(Body as Buffer);
    
    // Upload to processed bucket
    await s3.putObject({
      Bucket: 'dubstudio-processed-videos',
      Key: `videos/${userId}/${videoId}/final.mp4`,
      Body: processedBuffer
    }).promise();

    // Delete immediately after processing
    await Promise.all([
      // Raw file
      s3.deleteObject({
        Bucket: 'dubstudio-raw-videos',
        Key: `uploads/${userId}/${videoId}/original.mp4`
      }).promise(),
      
      // Processed file
      s3.deleteObject({
        Bucket: 'dubstudio-processed-videos',
        Key: `videos/${userId}/${videoId}/final.mp4`
      }).promise()
    ]);

  } catch (err) {           
    console.error('Processing failed:', err);
    throw err; // Rethrow to mark as failed
  }
}; 