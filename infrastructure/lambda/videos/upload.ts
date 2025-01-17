import { Handler } from 'aws-lambda';
import { S3, DynamoDB } from 'aws-sdk';
import { success, error, AuthenticatedEvent } from '../types/api';

const s3 = new S3();
const dynamodb = new DynamoDB.DocumentClient();
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';
const TABLE_NAME = process.env.VIDEOS_TABLE_NAME || '';

export const handler: Handler<AuthenticatedEvent> = async (event) => {
  try {
    if (!event.body) {
      return error(400, 'Missing request body');
    }

    const { fileName, fileType } = JSON.parse(event.body);
    
    if (!fileName || !fileType) {
      return error(400, 'Missing required fields: fileName, fileType');
    }

    // Get user ID from Cognito claims
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      return error(401, 'Unauthorized');
    }

    // Generate video ID and S3 key
    const videoId = Date.now().toString();
    const key = `uploads/${userId}/${videoId}-${fileName}`;

    // Create DynamoDB entry
    await dynamodb.put({
      TableName: TABLE_NAME,
      Item: {
        userId,
        videoId,
        fileName,
        fileType,
        s3Key: key,
        status: 'UPLOADED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }).promise();

    // Generate pre-signed URL for upload
    const presignedUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Expires: 300, // URL expires in 5 minutes
    });

    return success({
      uploadUrl: presignedUrl,
      key,
      videoId,
      expiresIn: 300,
    });
  } catch (err) {
    console.error('Error generating upload URL:', err);
    return error(500, 'Error generating upload URL');
  }
}; 