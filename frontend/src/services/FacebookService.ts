import { Settings, LoginManager, AccessToken, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import Constants from 'expo-constants';
import type { FacebookLoginResult, FacebookProfile, FacebookPage, InstagramBusinessAccount } from '../types/facebook';

class FacebookService {
  private static instance: FacebookService;
  private static initialized: boolean = false;

  private constructor() {
    console.log('FacebookService: Creating new instance');
  }

  public static getInstance(): FacebookService {
    if (!FacebookService.instance) {
      FacebookService.instance = new FacebookService();
      console.log('FacebookService: Instance created');
    }
    return FacebookService.instance;
  }

  public initialize(): void {
    if (FacebookService.initialized) {
      console.log('FacebookService: Already initialized, skipping');
      return;
    }

    try {
      console.log('FacebookService: Starting initialization...');
      const appId = Constants.expoConfig?.extra?.EXPO_PUBLIC_FACEBOOK_APP_ID || '1125481698703055';
      console.log('FacebookService: Using App ID:', appId);
      
      Settings.initializeSDK();
      console.log('FacebookService: SDK initialized');
      
      Settings.setAppID(appId);
      console.log('FacebookService: App ID set');
      
      FacebookService.initialized = true;
      console.log('FacebookService: Initialization complete');
    } catch (error) {
      console.error('FacebookService: Initialization failed:', error);
      throw error;
    }
  }

  public isInitialized(): boolean {
    console.log('FacebookService: Checking initialization status:', FacebookService.initialized);
    return FacebookService.initialized;
  }

  public async login(): Promise<FacebookLoginResult> {
    try {
      console.log('FacebookService: Starting login process...');
      console.log('FacebookService: Requesting permissions...');
      
      const permissions = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'business_management'
      ];
      console.log('FacebookService: Requesting permissions:', permissions);

      const result = await LoginManager.logInWithPermissions(permissions);
      console.log('FacebookService: Login result:', result);

      if (result.isCancelled) {
        console.log('FacebookService: Login cancelled by user');
        throw new Error('User cancelled login');
      }

      console.log('FacebookService: Getting access token...');
      const data = await AccessToken.getCurrentAccessToken();
      
      if (!data) {
        console.error('FacebookService: Failed to get access token');
        throw new Error('Failed to get access token');
      }

      console.log('FacebookService: Access token received:', {
        tokenLength: data.accessToken.length,
        userId: data.userID,
        expiration: new Date(data.expirationTime).toISOString(),
        permissions: data.permissions
      });

      return {
        accessToken: data.accessToken,
        applicationID: data.applicationID,
        userID: data.userID,
        expirationTime: data.expirationTime,
        lastRefreshTime: data.lastRefreshTime,
        dataAccessExpirationTime: data.dataAccessExpirationTime,
        permissions: data.permissions,
      };
    } catch (error) {
      console.error('FacebookService: Login error:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      console.log('FacebookService: Logging out...');
      await LoginManager.logOut();
      console.log('FacebookService: Logout successful');
    } catch (error) {
      console.error('FacebookService: Logout error:', error);
      throw error;
    }
  }

  public async getUserProfile(): Promise<FacebookProfile> {
    console.log('FacebookService: Fetching user profile...');
    return new Promise((resolve, reject) => {
      const request = new GraphRequest(
        '/me',
        {
          parameters: {
            fields: {
              string: 'id,name,email,picture'
            }
          }
        },
        (error, result) => {
          if (error) {
            console.error('FacebookService: Failed to fetch user profile:', error);
            reject(error);
          } else {
            console.log('FacebookService: Received profile data:', result);
            const profile = result as Record<string, any>;
            if (!profile?.id) {
              console.error('FacebookService: Invalid profile data received');
              reject(new Error('Invalid profile data received'));
              return;
            }
            const profileData = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              picture: profile.picture,
            };
            console.log('FacebookService: Parsed profile data:', profileData);
            resolve(profileData);
          }
        }
      );

      console.log('FacebookService: Starting profile request...');
      new GraphRequestManager().addRequest(request).start();
    });
  }

  public async getPages(): Promise<FacebookPage[]> {
    console.log('FacebookService: Fetching user pages...');
    return new Promise((resolve, reject) => {
      const request = new GraphRequest(
        '/me/accounts',
        {
          parameters: {
            fields: {
              string: 'id,name,access_token,category,tasks'
            }
          }
        },
        (error, result) => {
          if (error) {
            console.error('FacebookService: Failed to fetch pages:', error);
            reject(error);
          } else {
            console.log('FacebookService: Received pages data:', {
              count: (result as any)?.data?.length || 0,
              pages: (result as any)?.data?.map((page: any) => ({
                id: page.id,
                name: page.name,
                category: page.category
              }))
            });
            resolve((result as any)?.data || []);
          }
        }
      );

      console.log('FacebookService: Starting pages request...');
      new GraphRequestManager().addRequest(request).start();
    });
  }

  public async getInstagramBusinessAccount(pageId: string): Promise<InstagramBusinessAccount | null> {
    console.log('FacebookService: Fetching Instagram Business Account for page:', pageId);
    return new Promise((resolve, reject) => {
      const request = new GraphRequest(
        `/${pageId}`,
        {
          parameters: {
            fields: {
              string: 'instagram_business_account{id,username,name,profile_picture_url,biography,follows_count,followers_count,media_count,website}'
            }
          }
        },
        (error, result) => {
          if (error) {
            console.error('FacebookService: Failed to fetch Instagram account:', error);
            reject(error);
          } else {
            const instagramAccount = (result as any)?.instagram_business_account || null;
            console.log('FacebookService: Received Instagram account data:', {
              hasAccount: !!instagramAccount,
              username: instagramAccount?.username,
              id: instagramAccount?.id
            });
            resolve(instagramAccount);
          }
        }
      );

      console.log('FacebookService: Starting Instagram account request...');
      new GraphRequestManager().addRequest(request).start();
    });
  }
}

export const facebookService = FacebookService.getInstance(); 