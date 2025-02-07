import { APIGatewayProxyHandler } from 'aws-lambda';
import { Lambda } from 'aws-sdk';
import { JobService } from '../../services/jobService';
import { createResponse } from '../../utils/response';

const lambda = new Lambda();
const SUBTITLE_FUNCTION = process.env.SUBTITLE_FUNCTION!;
const DUBBING_FUNCTION = process.env.DUBBING_FUNCTION!;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.requestContext.authorizer) {
      return createResponse(401, { message: 'Unauthorized' });
    }

    const userId = event.requestContext.authorizer.claims.sub;
    const jobId = event.pathParameters?.jobId;

    if (!jobId) {
      return createResponse(400, { message: 'Missing jobId parameter' });
    }

    const job = await JobService.getJob(userId, jobId);

    if (!job) {
      return createResponse(404, { message: 'Job not found' });
    }

    // Update job status to processing
    await JobService.updateJobStatus(userId, jobId, 'PROCESSING');

    // Invoke subtitle generation for each target language
    const subtitlePromises = job.tasks.map(async (task) => {
      if (task.type === 'SUBTITLE') {
        await lambda.invoke({
          FunctionName: SUBTITLE_FUNCTION,
          InvocationType: 'Event',
          Payload: JSON.stringify({
            userId,
            jobId,
            taskId: task.id,
            sourceLanguage: job.video.sourceLanguage,
            targetLanguage: task.language,
            videoKey: job.video.key
          })
        }).promise();
      }
    });

    await Promise.all(subtitlePromises);

    return createResponse(200, { 
      message: 'Processing started',
      jobId 
    });

  } catch (error) {
    console.error('Error in process handler:', error);
    return createResponse(500, { message: 'Internal server error' });
  }
}; 