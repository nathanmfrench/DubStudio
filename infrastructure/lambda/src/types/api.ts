import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface ApiResponse extends APIGatewayProxyResult {
  headers: {
    [key: string]: string;
  };
}

export interface ErrorResponse extends ApiResponse {
  body: string;
}

export interface CognitoAuthorizerContext {
  claims: {
    sub: string;
    email: string;
    email_verified: string;
    'cognito:username': string;
    'cognito:groups'?: string[];
    aud: string;
    token_use: string;
    auth_time: number;
    iss: string;
    exp: number;
    iat: number;
    [key: string]: any;
  };
}

export type AuthenticatedEvent = Omit<APIGatewayProxyEvent, 'requestContext'> & {
  requestContext: Omit<APIGatewayProxyEvent['requestContext'], 'authorizer'> & {
    authorizer: CognitoAuthorizerContext;
  };
};

export function getUserId(event: AuthenticatedEvent): string {
  return event.requestContext.authorizer.claims.sub;
}

export function getUserEmail(event: AuthenticatedEvent): string {
  return event.requestContext.authorizer.claims.email;
}

export function getUserName(event: AuthenticatedEvent): string {
  return event.requestContext.authorizer.claims.email;
}

export function success(data: any): ApiResponse {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  };
}

export function error(statusCode: number, message: string): ErrorResponse {
  return {
    statusCode,
    body: JSON.stringify({ error: message }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    }
  };
} 