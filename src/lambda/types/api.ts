import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Base response type
export interface ApiResponse {
  statusCode: number;
  body: string;
  headers: {
    [key: string]: string | boolean;
  };
}

// Error response type
export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// Success response wrapper
export function success(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
}

// Error response wrapper
export function error(statusCode: number, message: string, code?: string, details?: any): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    message,
    ...(code && { code }),
    ...(details && { details }),
  };

  return {
    statusCode,
    body: JSON.stringify(errorResponse),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
}

// Type for authenticated requests
export type AuthenticatedEvent = Omit<APIGatewayProxyEvent, 'requestContext'> & {
  requestContext: APIGatewayProxyEvent['requestContext'] & {
    authorizer?: {
      claims: {
        sub: string;
        email: string;
        'cognito:groups'?: string[];
      };
    };
  };
}; 