import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { success, error, AuthenticatedEvent, getUserId } from '../types/api';

const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const s3Client = new S3Client({});
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';

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
  
  const rawData = await s3Client.send(new GetObjectCommand(getParams));
  if (!rawData.Body) throw new Error('Empty video file');

  // 2. Process content
  const processedBuffer = await processVideoContent(rawData.Body as unknown as Buffer);

  // 3. Store processed video
  const putParams = {
    Bucket: 'dubstudio-processed-videos',
    Key: `videos/${userId}/${videoId}/final.mp4`,
    Body: processedBuffer
  };
  await s3Client.send(new PutObjectCommand(putParams));

  // 4. Cleanup raw file
  await Promise.all([
    // Raw file
    s3Client.send(new DeleteObjectCommand({
      Bucket: 'dubstudio-raw-videos',
      Key: `uploads/${userId}/${videoId}/original.mp4`
    })),
    
    // Processed file
    s3Client.send(new DeleteObjectCommand({
      Bucket: 'dubstudio-processed-videos',
      Key: `videos/${userId}/${videoId}/final.mp4`
    }))
  ]);
}

// Lambda entry point
export const handler: Handler<AuthenticatedEvent> = async (event, context) => {
  console.log({
    stage: 'START',
    functionName: 'process-handler',  
    requestId: context.awsRequestId,
    timestamp: new Date().toISOString(),
    event: {
      path: event.path,
      httpMethod: event.httpMethod,
      pathParameters: event.pathParameters,
      authorizer: event.requestContext.authorizer
    }
  });

  try {
    // Extract user ID from Cognito claims
    const userId = getUserId(event);
    if (!userId) {
      console.error('No user ID found in request context');
      return error(401, 'Unauthorized - No user ID found');
    }

    // Get video ID from path parameters
    const videoId = event.pathParameters?.videoId;
    if (!videoId) {
      return error(400, 'Missing videoId parameter');
    }

    // Get video from DynamoDB to verify ownership
    const getResult = await dynamodb.send(new GetCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      }
    }));

    if (!getResult.Item) {
      return error(404, 'Video not found');
    }

    // Update video status to processing
    await dynamodb.send(new UpdateCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'processing',
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Execute processing
    await handleVideoProcessing(userId, videoId);
    return success({ status: 'processing' });

  } catch (err) {
    console.error('Processing failed:', err);
    return error(500, 'Error processing request');
  }
};

const processVideo = async (userId: string, videoId: string) => {
  try {
    // Get object as buffer instead of stream
    const rawData = await s3Client.send(new GetObjectCommand({
      Bucket: 'dubstudio-raw-videos',
      Key: `uploads/${userId}/${videoId}/original.mp4`
    }));

    if (!rawData.Body) throw new Error('Empty video file');
    
    // Process video buffer
    const processedBuffer = await processVideoContent(rawData.Body as unknown as Buffer);
    
    // Upload to processed bucket
    await s3Client.send(new PutObjectCommand({
      Bucket: 'dubstudio-processed-videos',
      Key: `videos/${userId}/${videoId}/final.mp4`,
      Body: processedBuffer
    }));

    // Delete immediately after processing
    await Promise.all([
      // Raw file
      s3Client.send(new DeleteObjectCommand({
        Bucket: 'dubstudio-raw-videos',
        Key: `uploads/${userId}/${videoId}/original.mp4`
      })),
      
      // Processed file
      s3Client.send(new DeleteObjectCommand({
        Bucket: 'dubstudio-processed-videos',
        Key: `videos/${userId}/${videoId}/final.mp4`
      }))
    ]);

  } catch (err) {           
    console.error('Processing failed:', err);
    throw err; // Rethrow to mark as failed
  }
}; 