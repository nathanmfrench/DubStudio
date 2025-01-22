export interface FacebookLoginResult {
  accessToken?: string;
  applicationID?: string;
  userID?: string;
  expirationTime?: number;
  lastRefreshTime?: number;
  dataAccessExpirationTime?: number;
  graphDomain?: string;
  permissions?: string[];
}

export interface FacebookProfile {
  id: string;
  name?: string;
  email?: string;
  picture?: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  follows_count?: number;
  followers_count?: number;
  media_count?: number;
  website?: string;
} 