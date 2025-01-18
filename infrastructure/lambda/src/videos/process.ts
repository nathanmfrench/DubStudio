import { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { success, error, AuthenticatedEvent } from '../types/api';

const lambdaClient = new LambdaClient({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';
const DUBBING_FUNCTION_NAME = process.env.DUBBING_FUNCTION_NAME || '';

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
    const result = await dynamodb.send(new GetCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      }
    }));

    // Get source and target languages from request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { sourceLanguage = 'en', targetLanguages, caption } = body;

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return error(400, 'Missing or invalid targetLanguages in request body');
    }

    // Start a dubbing job for each target language
    const dubbingPromises = targetLanguages.map(targetLanguage => {
      const command = new InvokeCommand({
        FunctionName: DUBBING_FUNCTION_NAME,
        InvocationType: 'Event', // Asynchronous invocation
        Payload: Buffer.from(JSON.stringify({
          userId,
          videoId,
          body: {
            sourceLanguage,
            targetLanguage,
            caption
          }
        }))
      });
      return lambdaClient.send(command);
    });

    // Wait for all dubbing jobs to start
    await Promise.all(dubbingPromises);

    return success({
      message: 'Video processing started',
      videoId,
      status: 'PROCESSING',
      targetLanguages
    });
  } catch (err) {
    console.error('Error processing video:', err);
    return error(500, 'Error starting video processing');
  }
}; 