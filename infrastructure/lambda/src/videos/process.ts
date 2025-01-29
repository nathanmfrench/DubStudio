import { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { success, error, AuthenticatedEvent } from '../types/api';

const lambdaClient = new LambdaClient({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';
const DUBBING_FUNCTION_NAME = process.env.DUBBING_FUNCTION_NAME || '';

export const handler: Handler<AuthenticatedEvent> = async (event) => {
  console.log({
    stage: 'START',
    functionName: 'process-handler',
    requestId: event.requestContext.requestId,
    timestamp: new Date().toISOString(),
    event: {
      path: event.path,
      httpMethod: event.httpMethod,
      pathParameters: event.pathParameters
    }
  });

  try {
    const videoId = event.pathParameters?.videoId;
    if (!videoId) {
      console.log({
        stage: 'ERROR',
        error: 'Missing videoId parameter',
        pathParameters: event.pathParameters,
        timestamp: new Date().toISOString()
      });
      return error(400, 'Missing videoId parameter');
    }

    // Get user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      console.log({
        stage: 'ERROR',
        error: 'Unauthorized - Missing user ID',
        timestamp: new Date().toISOString()
      });
      return error(401, 'Unauthorized');
    }

    console.log({
      stage: 'PROCESSING',
      action: 'fetch_video_details',
      userId,
      videoId,
      tableName: VIDEOS_TABLE_NAME,
      timestamp: new Date().toISOString()
    });

    // Get video details from DynamoDB
    const result = await dynamodb.send(new GetCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      }
    }));

    if (!result.Item) {
      console.log({
        stage: 'ERROR',
        error: 'Video not found',
        userId,
        videoId,
        timestamp: new Date().toISOString()
      });
      return error(404, 'Video not found');
    }

    // Get source and target languages from request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { sourceLanguage = 'en', targetLanguages, caption } = body;

    console.log({
      stage: 'PROCESSING',
      action: 'parse_request_body',
      body: {
        sourceLanguage,
        targetLanguages,
        caption: caption ? 'present' : 'absent'
      },
      timestamp: new Date().toISOString()
    });

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      console.log({
        stage: 'ERROR',
        error: 'Invalid target languages',
        receivedValue: targetLanguages,
        timestamp: new Date().toISOString()
      });
      return error(400, 'Missing or invalid targetLanguages in request body');
    }

    console.log({
      stage: 'PROCESSING',
      action: 'invoke_dubbing_functions',
      targetLanguages,
      dubbingFunction: DUBBING_FUNCTION_NAME,
      timestamp: new Date().toISOString()
    });

    // Start a dubbing job for each target language
    const dubbingPromises = targetLanguages.map(targetLanguage => {
      const payload = {
        userId,
        videoId,
        body: {
          sourceLanguage,
          targetLanguage,
          caption
        }
      };

      console.log({
        stage: 'PROCESSING',
        action: 'invoke_single_dubbing',
        targetLanguage,
        payload,
        timestamp: new Date().toISOString()
      });

      const command = new InvokeCommand({
        FunctionName: DUBBING_FUNCTION_NAME,
        InvocationType: 'Event',
        Payload: Buffer.from(JSON.stringify(payload))
      });
      return lambdaClient.send(command);
    });

    console.log({
      stage: 'PROCESSING',
      action: 'update_video_status',
      videoId,
      newStatus: 'PROCESSING',
      timestamp: new Date().toISOString()
    });

    // Update video status to PROCESSING
    await dynamodb.send(new UpdateCommand({
      TableName: VIDEOS_TABLE_NAME,
      Key: {
        userId,
        videoId
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt REMOVE #error',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#error': 'error'
      },
      ExpressionAttributeValues: {
        ':status': 'PROCESSING',
        ':updatedAt': new Date().toISOString()
      }
    }));

    // Wait for all dubbing jobs to start
    await Promise.all(dubbingPromises);

    console.log({
      stage: 'COMPLETE',
      videoId,
      status: 'success',
      targetLanguages,
      timestamp: new Date().toISOString()
    });

    return success({
      message: 'Video processing started',
      videoId,
      status: 'PROCESSING',
      targetLanguages
    });

  } catch (err) {
    console.error({
      stage: 'ERROR',
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return error(500, 'Error starting video processing');
  }
}; 