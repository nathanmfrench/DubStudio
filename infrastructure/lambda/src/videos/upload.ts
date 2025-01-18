import { Handler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { success, error, AuthenticatedEvent } from '../types/api';

const s3Client = new S3Client({});
const dynamodbClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient);

const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
const VIDEOS_TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';

export const handler: Handler<AuthenticatedEvent> = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return error(400, 'Missing fileName or fileType in request body');
    }

    // Get user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Generate unique video ID using timestamp
    const videoId = `${Date.now()}-${fileName}`;
    const key = `uploads/${userId}/${videoId}`;

    // Generate pre-signed URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // Create DynamoDB entry
    await dynamodb.send(new PutCommand({
      TableName: VIDEOS_TABLE_NAME,
      Item: {
        userId,
        videoId,
        fileName,
        fileType,
        s3Key: key,
        status: 'UPLOADED',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));

    return success({
      videoId,
      uploadUrl,
    });
  } catch (err) {
    console.error('Error generating upload URL:', err);
    return error(500, 'Error generating upload URL');
  }
}; 