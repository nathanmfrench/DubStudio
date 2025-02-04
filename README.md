# DubStudio

there's an autoverify email setup in the cognito user pool that I got to by randomly clicking around in the cognito console.
(this in the signup page I believe Edit attribute verification and user account confirmation )
If someone is using a basic account and want to upgrade, what happens to their account? How many videos do they get?
there is a different config setup for expo-fbsdk-next android and ios 
will need to update bundle ID, put domains in the meta developer console

The callbackUrls in the Cognito User Pool Client is set to ['exp://localhost:19000/--/*'] with a comment "Update with your Expo callback URLs". This might need to be updated for production.
The Python Lambda's code property points to the same directory as its layer (../lambda/python). This might be intentional, but typically the layer would point to a dependencies directory and the code would point to a source directory.
The allowedOrigins: ['*'] in the S3 bucket CORS settings has a comment "Restrict this in production" - this is a reminder that needs to be addressed before production deployment.







Let me explain what happened:

1. **The Root Issue**: When you used `sudo npx cdk`, you were running the CDK commands as the root Linux user. However, your AWS credentials are stored in your user's home directory at `~/.aws/credentials`. The root user has a different home directory (`/root/.aws/`) and thus couldn't access your credentials.

2. **Why It Failed**: 
   - Your AWS credentials are stored in: `/home/nathan/.aws/credentials`
   - But `sudo` was looking in: `/root/.aws/credentials`
   - This is why you got the "no credentials configured" error, even though you had properly set them up with `aws configure`

3. **The Permission Chain**:
   ```
   Your AWS Credentials (~/.aws/credentials)
         ↓
   Your User Account (nathan)
         ↓
   CDK Commands (npx cdk)
         ↓
   AWS API Calls
   ```

When you added `sudo`, you broke this chain because the root user couldn't see your user's credentials.

4. **The Fix**: Running without `sudo` allowed the CDK commands to:
   - Run as your user (nathan)
   - Access your AWS credentials
   - Make the necessary API calls to AWS

The new error you got (`EACCES: permission denied, open 'cdk.context.json'`) was actually a good sign - it meant CDK could now authenticate with AWS but had a local file permission issue, which is much easier to fix with a simple `chown` command.

Remember: For AWS tools like CDK, the authentication that matters is your AWS credentials, not your local system privileges. You rarely need `sudo` for AWS operations unless you're installing global packages or modifying system files.
