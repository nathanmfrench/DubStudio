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
const TABLE_NAME = process.env.TABLE_NAME!;
const BUCKET_NAME = process.env.BUCKET_NAME!;

interface UploadRequestBody {
  fileName: string;
  fileType: string;
}

export const handler = async (event: AuthenticatedEvent) => {
  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return error(405, 'Method not allowed');
    }

    // Parse and validate request body
    if (!event.body) {
      return error(400, 'Request body is required');
    }

    const body: UploadRequestBody = JSON.parse(event.body);
    if (!body.fileName || !body.fileType) {
      return error(400, 'fileName and fileType are required');
    }

    // Get user ID from Cognito claims
    const userId = getUserId(event);
    const videoId = randomUUID();

    // Generate a unique key for the video
    const key = `${userId}/${videoId}/${body.fileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: body.fileType
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Create video record in DynamoDB
    await ddbDocClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        videoId,
        fileName: body.fileName,
        status: 'pending_upload',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }));

    // Return the presigned URL and video details
    return success({
      uploadUrl: presignedUrl,
      videoId,
      key
    });

  } catch (err) {
    console.error('Error in upload handler:', err);
    return error(500, 'Internal server error');
  }
}; 