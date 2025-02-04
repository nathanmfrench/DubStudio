import { post, get } from 'aws-amplify/api';
import { API_URL } from '..//config/constants';
import { getAuthToken } from '..//utils/auth';
import { amplifyConfig } from '..//config/aws-config';

export interface UploadVideoRequest {
  fileName: string;
  fileType: string;
}

export interface UploadVideoResponse {
  uploadUrl: string;
  videoId: string;
  key: string;
}

export interface VideoStatus {
  videoId: string;
  status: 'pending_upload' | 'uploaded' | 'processing' | 'completed' | 'failed';
  error?: string;
  dubbingProgress?: {
    [language: string]: {
      status: string;
      progress: number;
    };
  };
}

interface UploadOptions {
  onProgress?: (percentage: number) => void;
}

class VideoService {

  async getUploadUrl(request: UploadVideoRequest): Promise<UploadVideoResponse> {
    try {
      // Validate request
      if (!request.fileName || !request.fileType) {
        throw new Error('Missing required fields');
      }
  
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Failed to obtain auth token');
      }
  
      // Decode and log token info
      try {
        const tokenParts = token.split('.');
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        console.log('[VideoService] Token details:', {
          exp: new Date(tokenPayload.exp * 1000),
          isExpired: Date.now() >= tokenPayload.exp * 1000,
          scope: tokenPayload.scope,
          iss: tokenPayload.iss,
          sub: tokenPayload.sub,
          client_id: tokenPayload.client_id,
          token_use: tokenPayload.token_use
        });

        // Verify required scope is present
        const scopes = tokenPayload.scope?.split(' ') || [];
        if (!scopes.includes('videos-resource-server/videos:upload')) {
          throw new Error('Missing required scope: videos-resource-server/videos:upload');
        }
      } catch (e) {
        console.warn('[VideoService] Could not decode token:', e);
      }
  
      console.log('[VideoService] Preparing request:', {
        apiName: 'dubstudio',
        path: '/v1/videos',
        fileName: request.fileName,
        fileType: request.fileType,
        tokenPresent: !!token
      });
  
      const restOperation = post({
        apiName: 'dubstudio',
        path: '/v1/videos',
        options: {
          body: {
            fileName: request.fileName,
            fileType: request.fileType
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      });
  
      console.log('[VideoService] Request operation created');
  
      const { body } = await restOperation.response;
      console.log('[VideoService] Response received');
  
      try {
        const parsedResponse = await body.json();
        console.log('[VideoService] Response parsed successfully:', {
          responseKeys: parsedResponse ? Object.keys(parsedResponse) : ["No responsekeys in parsedresponse (getuploadurl function)"],
          responseData: parsedResponse
        });
  
        return parsedResponse as unknown as UploadVideoResponse;
      } catch (parseError) {
        console.error('[VideoService] Failed to parse response:', parseError);
        const rawText = await body.text();
        console.log('[VideoService] Raw response:', rawText);
        throw parseError;
      }
  
    } catch (error) {
      console.error('[VideoService] Upload URL request failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'Unknown type',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        requestDetails: {
          fileName: request.fileName,
          fileType: request.fileType
        }
      });
  
      throw error;
    }
  }

  async uploadToS3(
    presignedUrl: string,
    file: { uri: string; type: string; name: string },
    options?: UploadOptions
  ) {
    console.log('[VideoService] Starting S3 upload:', {
      presignedUrl: presignedUrl.substring(0, 50) + '...',
      file: {
        name: file.name,
        type: file.type,
      }
    });

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      console.log(`[VideoService] Upload progress: ${Math.round((event.loaded / event.total) * 100)}%`);
      if (event.lengthComputable && options?.onProgress) {
        const percent = (event.loaded / event.total) * 100;
        options.onProgress(Math.round(percent));
      }
    };
    
    await new Promise((resolve, reject) => {
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            reject(new Error('Upload failed'));
          }
        }
      };
      
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send({ uri: file.uri, type: file.type, name: file.name });
    });
  }

  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    try {
      const restOperation = get({
        apiName: 'dubstudio',
        path: `/v1/videos/${videoId}/status`
      });

      const { body } = await restOperation.response;
      const response = await body.json();
      return response as unknown as VideoStatus;
    } catch (error) {
      console.error('Failed to get video status:', error);
      throw error;
    }
  }
}

export const videoService = new VideoService(); 