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
      const restOperation = post({
        apiName: 'dubstudio',
        path: '/v1/videos',
        options: {
          body: {
            fileName: request.fileName,
            fileType: request.fileType
          }
        }
      });

      const { body } = await restOperation.response;
      const response = await body.json();
      return response as unknown as UploadVideoResponse;
    } catch (error) {
      console.error('Upload URL request failed:', error);
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