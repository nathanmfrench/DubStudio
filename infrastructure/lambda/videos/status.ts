import { Handler } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { success, error, AuthenticatedEvent } from '../types/api';

const dynamodb = new DynamoDB.DocumentClient();
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

    // Get video status from DynamoDB
    const result = await dynamodb.get({
      TableName: TABLE_NAME,
      Key: {
        userId,
        videoId,
      },
    }).promise();

    if (!result.Item) {
      return error(404, 'Video not found');
    }

    return success({
      videoId,
      status: result.Item.status,
      progress: result.Item.progress || 0,
      error: result.Item.error,
      updatedAt: result.Item.updatedAt,
      outputs: result.Item.outputs || [],
    });
  } catch (err) {
    console.error('Error checking video status:', err);
    return error(500, 'Error retrieving video status');
  }
}; 