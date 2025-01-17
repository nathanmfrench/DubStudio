const region = 'us-east-1';
const userPoolId = 'us-east-1_H8AcY3ZlK';
const userPoolClientId = '6hqhp7husqc641npi0dihj8a8b';
const apiUrl = 'https://ve5pvzxy2d.execute-api.us-east-1.amazonaws.com/prod';

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    }
  }
};

// These endpoints are for your backend API
export const apiEndpoints = {
  videos: {
    upload: `${apiUrl}/v1/videos`,
    process: (videoId: string) => `${apiUrl}/v1/videos/${videoId}/process`,
    status: (videoId: string) => `${apiUrl}/v1/videos/${videoId}/status`,
  },
}; 