import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    // Extract the token from the Authorization header
    const authHeader = event.headers?.Authorization;
    if (!authHeader) {
      throw new Error('No Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create a verifier that expects valid access tokens
    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID!,
      tokenUse: 'access',
      clientId: process.env.USER_POOL_CLIENT_ID!
    });

    // Verify the token
    const payload = await verifier.verify(token);
    console.log('Token is valid. Payload:', payload);

    // Generate the IAM policy
    return {
      principalId: payload.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      }
    };
  } catch (err) {
    console.error('Token verification failed:', err);
    throw new Error('Unauthorized');
  }
}; 