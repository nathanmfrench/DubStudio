import { APIGatewayProxyHandler } from 'aws-lambda';
import { JobService } from '../../services/jobService';
import { createResponse } from '../../utils/response';

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

    return createResponse(200, { job });

  } catch (error) {
    console.error('Error in status handler:', error);
    return createResponse(500, { message: 'Internal server error' });
  }
}; 