import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { success, error, AuthenticatedEvent } from '../types/api';

const s3 = new S3();
const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || '';

export const handler: APIGatewayProxyHandler = async (event: AuthenticatedEvent) => {
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

    // Generate a unique key for the video
    const key = `uploads/${userId}/${Date.now()}-${fileName}`;

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
      expiresIn: 300,
    });
  } catch (err) {
    console.error('Error generating upload URL:', err);
    return error(500, 'Error generating upload URL');
  }
}; 