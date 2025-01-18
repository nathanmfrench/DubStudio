import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { success, error, AuthenticatedEvent } from '../types/api';

const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';

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
    const result = await dynamodb.send(new GetCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      }
    }));

    if (!result.Item) {
      return error(404, 'Video not found');
    }

    return success(result.Item);
  } catch (err) {
    console.error('Error getting video status:', err);
    return error(500, 'Error getting video status');
  }
}; 