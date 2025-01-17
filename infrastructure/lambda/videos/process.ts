import { Handler } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { success, error, AuthenticatedEvent } from '../types/api';

const s3 = new S3();
const dynamodb = new DynamoDB.DocumentClient();
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
const TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';

export const handler: Handler<AuthenticatedEvent> = async (event) => {
  try {
    const videoId = event.pathParameters?.videoId;
    if (!videoId) {
      return error(400, 'Missing videoId parameter');
    }

    // Get user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Get video details from DynamoDB
    const videoDetails = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: {
        userId,
        videoId,
      },
    }).promise();

    if (!videoDetails.Item) {
      return error(404, 'Video not found');
    }

    // Start processing
    await dynamodb.update({
      TableName: TABLE_NAME,
      Key: {
        userId,
        videoId,
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status': 'PROCESSING',
        ':updatedAt': new Date().toISOString(),
      },
    }).promise();

    // Here you would trigger your video processing pipeline
    // This could be a Step Function, another Lambda, or a service like MediaConvert
    // For now, we'll just return success

    return success({
      message: 'Video processing started',
      videoId,
      status: 'PROCESSING',
    });
  } catch (err) {
    console.error('Error processing video:', err);
    return error(500, 'Error starting video processing');
  }
}; 