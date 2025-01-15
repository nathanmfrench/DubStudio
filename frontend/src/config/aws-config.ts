const region = 'us-east-1';
const userPoolId = 'us-east-1_J9JvV0AWa';
const userPoolClientId = '41aonsge1fgmet7s2v92u1aea1';

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
    }
  }
};

// These endpoints are for your backend API, not needed for Cognito
export const apiEndpoints = {
  signIn: '/auth/signin',
  signUp: '/auth/signup',
  confirmSignUp: '/auth/confirm',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
}; 