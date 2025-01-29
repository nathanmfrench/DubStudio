import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AuthenticatedEvent, success, error, getUserId } from '../types/api';

const s3Client = new S3Client({});
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

// Match environment variable names with infrastructure stack
const TABLE_NAME = process.env.VIDEOS_TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

interface UploadRequestBody {
  fileName: string;
  fileType: string;
}

export const handler = async (event: AuthenticatedEvent) => {
  console.log({
    stage: 'START',
    functionName: 'upload-handler',
    requestId: event.requestContext.requestId,
    timestamp: new Date().toISOString(),
    event: {
      path: event.path,
      httpMethod: event.httpMethod,
      headers: event.headers
    }
  });

  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      console.log({
        stage: 'ERROR',
        error: 'Method not allowed',
        method: event.httpMethod,
        timestamp: new Date().toISOString()
      });
      return error(405, 'Method not allowed');
    }

    // Parse and validate request body
    if (!event.body) {
      console.log({
        stage: 'ERROR',
        error: 'Missing request body',
        timestamp: new Date().toISOString()
      });
      return error(400, 'Request body is required');
    }

    console.log({
      stage: 'PROCESSING',
      action: 'parse_request_body',
      timestamp: new Date().toISOString(),
      body: event.body
    });
    
    const body: UploadRequestBody = JSON.parse(event.body);
    if (!body.fileName || !body.fileType) {
      console.log({
        stage: 'ERROR',
        error: 'Missing required fields',
        receivedFields: Object.keys(body),
        timestamp: new Date().toISOString()
      });
      return error(400, 'fileName and fileType are required');
    }

    // Get user ID from Cognito claims
    const userId = getUserId(event);
    const videoId = randomUUID();

    console.log({
      stage: 'PROCESSING',
      action: 'generate_ids',
      userId,
      videoId,
      timestamp: new Date().toISOString()
    });

    // Generate a unique key for the video
    const key = `${userId}/${videoId}/${body.fileName}`; // Allows path traversal via "../../"


    console.log({
      stage: 'PROCESSING',
      action: 'generate_s3_key',
      key,
      timestamp: new Date().toISOString()
    });

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: body.fileType
    });

    console.log({
      stage: 'PROCESSING',
      action: 'generate_presigned_url',
      bucket: BUCKET_NAME,
      key,
      contentType: body.fileType,
      timestamp: new Date().toISOString()
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Create video record in DynamoDB
    const item = {
      userId,
      videoId,
      fileName: body.fileName,
      status: 'pending_upload',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log({
      stage: 'PROCESSING',
      action: 'create_dynamodb_record',
      tableName: TABLE_NAME,
      item,
      timestamp: new Date().toISOString()
    });

    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    console.log({
      stage: 'COMPLETE',
      videoId,
      key,
      status: 'success',
      timestamp: new Date().toISOString()
    });

    // Return the presigned URL and video details
    return success({
      uploadUrl: presignedUrl,
      videoId,
      key
    });

  } catch (err) {
    console.error({
      stage: 'ERROR',
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return error(500, 'Internal server error');
  }
}; 