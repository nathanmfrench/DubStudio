import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3 } from 'aws-sdk';
import { JobService } from '../../services/jobService';
import { createResponse } from '../../utils/response';
import { v4 as uuid } from 'uuid';

const s3 = new S3();
const BUCKET_NAME = process.env.RAW_VIDEOS_BUCKET!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.requestContext.authorizer) {
      return createResponse(401, { message: 'Unauthorized' });
    }

    const userId = event.requestContext.authorizer.claims.sub;
    
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { fileName, sourceLanguage, targetLanguages } = body;

    if (!fileName || !sourceLanguage || !targetLanguages) {
      return createResponse(400, { 
        message: 'Missing required fields: fileName, sourceLanguage, targetLanguages' 
      });
    }

    // Generate unique S3 key
    const fileKey = `uploads/${userId}/${uuid()}-${fileName}`;

    // Generate presigned URL
    const presignedUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 3600, // 1 hour
      ContentType: 'video/*',
      Metadata: {
        userId,
        sourceLanguage,
        targetLanguages: JSON.stringify(targetLanguages)
      }
    });

    // Create job record
    const job = await JobService.createJob(
      userId,
      sourceLanguage,
      targetLanguages,
      fileKey
    );

    return createResponse(200, {
      uploadUrl: presignedUrl,
      jobId: job.jobId,
      fileKey
    });

  } catch (error) {
    console.error('Error in upload handler:', error);
    return createResponse(500, { message: 'Internal server error' });
  }
}; 