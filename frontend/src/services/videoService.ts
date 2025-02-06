import { post, get } from 'aws-amplify/api';

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

interface VideoFile {
  uri: string;
  mimeType: string;
  name: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  videoId: string;
  key: string;
}

export class VideoUploadError extends Error {
  constructor(message: string, public stage: 'presign' | 'upload' | 'process') {
    super(message);
    this.name = 'VideoUploadError';
  }
}

async function uploadVideo(file: VideoFile) {
  try {
    // 1. Get presigned URL
    console.log('[VideoService] Getting presigned URL for:', {
      fileName: file.name,
      type: file.mimeType
    });

    const response = await post({
      apiName: 'dubstudio',
      path: '/v1/videos',
      options: {
        body: {
          fileType: file.mimeType,
          fileName: file.name
        }
      }
    }).response;

    const { body } = response;
    const rawData = await body.json();
    
    // Validate response shape
    if (!rawData || typeof rawData !== 'object' || 
        !('uploadUrl' in rawData) || !('videoId' in rawData) || !('key' in rawData)) {
      throw new VideoUploadError('Invalid response format from server', 'presign');
    }
    
    const data = rawData as unknown as UploadUrlResponse;
    const { uploadUrl, videoId } = data;

    console.log('[VideoService] Got presigned URL and videoId:', { videoId });

    // 2. Upload to S3 using XMLHttpRequest
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.mimeType);

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(null);
          } else {
            reject(new VideoUploadError(
              `S3 upload failed with status ${xhr.status}: ${xhr.responseText}`,
              'upload'
            ));
          }
        }
      };

      xhr.onerror = () => {
        reject(new VideoUploadError('Network error during upload', 'upload'));
      };

      // Get binary data using fetch
      fetch(file.uri)
        .then(response => response.blob())
        .then(blob => {
          xhr.send(blob);
        })
        .catch(error => {
          reject(new VideoUploadError(`Failed to get file data: ${error.message}`, 'upload'));
        });
    });

    console.log('[VideoService] Upload successful, triggering processing');

    // 3. Trigger processing
    await post({
      apiName: 'dubstudio',
      path: `/v1/videos/${videoId}/process`
    }).response;

    console.log('[VideoService] Processing triggered successfully');
    return videoId;

  } catch (error) {
    if (error instanceof VideoUploadError) {
      throw error;
    }

    // Determine error stage and wrap in our custom error
    if (error instanceof Error) {
      if (error.message.includes('presigned')) {
        throw new VideoUploadError(`Failed to get upload URL: ${error.message}`, 'presign');
      } else if (error.message.includes('process')) {
        throw new VideoUploadError(`Failed to trigger processing: ${error.message}`, 'process');
      }
    }

    // Generic error case
    throw new VideoUploadError(
      error instanceof Error ? error.message : 'Unknown error during upload',
      'upload'
    );
  }
}

class VideoService {

  async getUploadUrl(request: UploadVideoRequest): Promise<UploadVideoResponse> {
    try {
      // Validate request
      if (!request.fileName || !request.fileType) {
        throw new Error('Missing required fields');
      }

      console.log('[VideoService] Preparing request:', {
        apiName: 'dubstudio',
        path: '/v1/videos',
        fileName: request.fileName,
        fileType: request.fileType
      });
  
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
  
      console.log('[VideoService] Request operation created');
  
      const { body } = await restOperation.response;
      console.log('[VideoService] Response received');
  
      try {
        const parsedResponse = await body.json();
        console.log('[VideoService] Response parsed successfully:', {
          responseKeys: parsedResponse ? Object.keys(parsedResponse) : null,
          responseData: parsedResponse
        });
  
        // Type guard for UploadVideoResponse
        if (this.isUploadVideoResponse(parsedResponse)) {
          return parsedResponse;
        }
        throw new Error('Invalid response format from server');
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
    file: VideoFile,
    options?: UploadOptions
  ): Promise<void> {
    console.log('[VideoService] Starting S3 upload:', {
      presignedUrl: presignedUrl.substring(0, 50) + '...',
      file: {
        name: file.name,
        type: file.mimeType,
      }
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Set up progress tracking
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && options?.onProgress) {
          const percentage = (event.loaded / event.total) * 100;
          options.onProgress(percentage);
          console.log(`[VideoService] Upload progress: ${Math.round(percentage)}%`);
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('[VideoService] Upload completed successfully');
            resolve();
          } else {
            console.error('[VideoService] Upload failed:', {
              status: xhr.status,
              response: xhr.responseText
            });
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        console.error('[VideoService] Upload failed with network error');
        reject(new Error('Network error during upload'));
      };

      try {
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.mimeType);
        
        // Instead of FormData, use fetch to get the binary data
        fetch(file.uri)
          .then(response => response.blob())
          .then(blob => {
            xhr.send(blob);
          })
          .catch(error => {
            console.error('[VideoService] Error getting file blob:', error);
            reject(error);
          });
      } catch (error) {
        console.error('[VideoService] Error initiating upload:', error);
        reject(error);
      }
    });
  }

  private isUploadVideoResponse(response: any): response is UploadVideoResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.uploadUrl === 'string' &&
      typeof response.videoId === 'string' &&
      typeof response.key === 'string'
    );
  }

  private isVideoStatus(response: any): response is VideoStatus {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof response.videoId === 'string' &&
      typeof response.status === 'string' &&
      ['pending_upload', 'uploaded', 'processing', 'completed', 'failed'].includes(response.status)
    );
  }

  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    try {
      const restOperation = get({
        apiName: 'dubstudio',
        path: `/v1/videos/${videoId}/status`
      });

      const { body } = await restOperation.response;
      const response = await body.json();
      
      if (this.isVideoStatus(response)) {
        return response;
      }
      throw new Error('Invalid video status response format');
    } catch (error) {
      console.error('[VideoService] Failed to get video status:', error);
      throw error;
    }
  }

  uploadVideo = uploadVideo;
}

export const videoService = new VideoService(); 