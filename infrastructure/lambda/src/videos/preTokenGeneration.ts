export const handler = async (event: any) => {
    console.log('Pre Token Generation event:', JSON.stringify(event, null, 2));
  
    return {
      ...event,
      response: {
        claimsOverrideDetails: {
          scopesToAdd: [
            'dubstudio-api/video-upload', 
            'dubstudio-api/video-process'
          ],
          scopesToSuppress: ['aws.cognito.signin.user.admin']
        }
      }
    };
  };