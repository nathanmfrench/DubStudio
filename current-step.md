
The OAuth flow will work for multiple accounts. Here's how it works with your language-specific accounts:

1. **User Flow Example**:
```
For Spanish video:
- Click "Connect Account" for Spanish
- OAuth into test.spanish
- Account gets stored with language context "es"

For French video:
- Click "Connect Account" for French
- OAuth into test.french
- Account gets stored with language context "fr"

For Danish video:
- Click "Connect Account" for Danish
- OAuth into test.danish
- Account gets stored with language context "da"
```

Your existing code already supports this with:
```typescript
interface ConnectedAccount {
  platform: 'instagram';
  username: string;
  language?: string;  // Stores which language this account is for
  isConnected: boolean;
  accessToken?: string;
  userId?: string;
}
```

When processing videos, your app will:
1. Know which account to use for each language
2. Have separate access tokens for each account
3. Be able to post to the correct account for each language version

The key is that each OAuth flow:
1. Stores which language it's for (using `pendingLanguageCode`)
2. Gets its own unique access token
3. Is associated with the specific language in your `connectedAccounts` state

Would you like me to:
1. Show you how to implement the account storage for multiple accounts?
2. Add validation to ensure accounts aren't connected twice?
3. Implement something else?



---------------------------------------------------------------------------------------
Here's a comprehensive checklist for implementing Instagram posting functionality, based on your existing code and requirements:

1. **Meta/Instagram App Setup**
   - [ ] Create a Meta Developer account
   - [ ] Create a new Meta app
   - [ ] Configure Instagram Basic Display API
   - [ ] Configure Instagram Graph API
   - [ ] Add required permissions:
     - `instagram_basic`
     - `instagram_content_publish`
     - `pages_read_engagement`
   - [ ] Set up OAuth redirect URIs
   - [ ] Get App ID and App Secret
   - [ ] Submit app for review to get necessary permissions

2. **Backend Infrastructure**
   - [ ] Create new API endpoints:
     ```typescript
     // OAuth endpoints
     POST /api/instagram/auth/start
     POST /api/instagram/auth/callback
     
     // Account management
     GET /api/instagram/accounts
     DELETE /api/instagram/accounts/:id
     
     // Token management
     POST /api/instagram/token/refresh
     
     // Posting endpoints
     POST /api/instagram/post
     GET /api/instagram/post/status/:id
     ```
   - [ ] Set up secure token storage:
     ```typescript
     interface StoredToken {
       userId: string;
       accessToken: string;
       expiresAt: number;
       language: string;
       accountType: 'BUSINESS' | 'CREATOR';
     }
     ```
   - [ ] Implement token refresh mechanism
   - [ ] Set up Instagram Graph API client

3. **Frontend Configuration Updates**
   - [ ] Update `frontend/src/config/env.ts`:
     ```typescript
     instagram: {
       clientId: string;
       redirectUri: string;
       scopes: string[];
     }
     ```
   - [ ] Add Instagram API endpoints to `frontend/src/config/aws-config.ts`

4. **Video Validation (Pre-Processing)**
   - [ ] Implement validation in `UploadScreen.tsx`:
     ```typescript
     interface VideoValidationResult {
       isValid: boolean;
       errors?: {
         format?: string;    // MP4/MOV
         duration?: string;  // 3s-15m
         resolution?: string; // Max 1920px
         size?: string;     // Max 1GB
       };
     }
     ```
   - [ ] Add validation check before processing starts
   - [ ] Add error handling and user feedback

5. **Account Management Updates**
   - [ ] Update `ConnectedAccount` interface in `UploadScreen.tsx`:
     ```typescript
     interface ConnectedAccount {
       platform: 'instagram';
       username: string;
       language?: string;
       isConnected: boolean;
       accessToken?: string;
       userId?: string;
       accountType: 'BUSINESS' | 'CREATOR';
     }
     ```
   - [ ] Implement professional account verification
   - [ ] Add professional account instructions modal
   - [ ] Update account connection UI/UX

6. **OAuth Flow Implementation**
   - [ ] Update `handleConnectInstagram` in `UploadScreen.tsx`:
     ```typescript
     const handleConnectInstagram = async (langCode: string) => {
       // Start OAuth flow
       // Store language context
       // Handle redirects
     };
     ```
   - [ ] Implement OAuth callback handling
   - [ ] Add error handling for OAuth failures
   - [ ] Handle account type verification

7. **Sequential Posting Flow**
   - [ ] Update processing status handling:
     ```typescript
     interface ProcessingStatus {
       status: 'pending_upload' | 'uploading' | 'processing' | 'completed' | 'failed';
       progress: number;
       error?: string;
       languages: {
         [key: string]: {
           status: 'pending' | 'processing' | 'completed' | 'failed' | 'posting';
           progress: number;
           error?: string;
           instagramPostId?: string;
         };
       };
     }
     ```
   - [ ] Implement sequential posting logic
   - [ ] Add posting status tracking
   - [ ] Handle posting failures

8. **Instagram Graph API Integration**
   - [ ] Implement container creation:
     ```typescript
     interface ReelContainer {
       id: string;
       status: string;
       statusCode: string;
     }
     ```
   - [ ] Handle media upload
   - [ ] Implement publishing flow
   - [ ] Add status checking

9. **Error Handling & User Feedback**
   - [ ] Add error states for:
     - Instagram app not installed
     - Video validation failures
     - OAuth failures
     - Posting failures
     - Token expiration
   - [ ] Implement retry mechanisms
   - [ ] Add user notifications

10. **Testing & Validation**
    - [ ] Test OAuth flow with different account types
    - [ ] Test video validation with various formats
    - [ ] Test posting flow with different languages
    - [ ] Test token refresh mechanism
    - [ ] Test error handling
    - [ ] Test sequential posting
    - [ ] Validate against Instagram's requirements

11. **Security Considerations**
    - [ ] Secure token storage
    - [ ] Implement rate limiting
    - [ ] Add request validation
    - [ ] Implement proper error logging
    - [ ] Add monitoring for token expiration

12. **Documentation & Maintenance**
    - [ ] Document API endpoints
    - [ ] Document token refresh process
    - [ ] Document error codes
    - [ ] Add monitoring for API limits
    - [ ] Plan for Instagram API updates

---------------------------------------------------------------------------------------
RECOMMENDED TASK ORDER
1. **Meta/Instagram App Setup** (Do this first as it's required for everything else)
   - Create Meta Developer account
   - Create new Meta app
   - Get App ID and App Secret
   - Configure basic settings
   - This is crucial as you'll need these credentials for development

2. **Frontend Configuration** (Basic setup to store credentials)
   - Update `frontend/src/config/env.ts` with Instagram settings
   ```typescript
   instagram: {
     clientId: string;
     redirectUri: string;
     scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement']
   }
   ```

3. **Video Validation** (Pre-processing checks)
   - Implement basic validation in `UploadScreen.tsx`
   - This is important to do early as it prevents users from trying to upload invalid videos
   - You already have the video selection code, so this is a natural extension

4. **Basic Backend Infrastructure** (Core endpoints)
   - Set up initial OAuth endpoints:
     - `/api/instagram/auth/start`
     - `/api/instagram/auth/callback`
   - Set up secure token storage
   - This creates the foundation for account connection

5. **Account Management UI Updates**
   - Update `ConnectedAccount` interface
   - Add professional account verification
   - Add account instructions modal
   - This builds on your existing account management UI

6. **OAuth Flow Implementation**
   - Implement `handleConnectInstagram`
   - Add OAuth callback handling
   - This allows users to start connecting accounts

The reason for this order is:
1. You need the Meta app credentials to do anything
2. Video validation can be done independently and improves user experience immediately
3. Backend infrastructure is needed for OAuth
4. UI updates prepare for account connection
5. OAuth flow ties it all together
 
