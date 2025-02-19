import { post, get } from 'aws-amplify/api';
import { API_URL } from '../config/constants';
import { getAuthToken } from '../utils/auth';
import { amplifyConfig } from '../config/aws-config';
import { SubtitleStyle } from 'infrastructure/lambda/src/types/video';

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

interface SubtitlePreviewRequest {
  videoId: string;
  subtitleStyle: SubtitleStyle;
  timestamp: number;
  sourceLanguage: string;
  targetLanguage: string;
  previewText: string;
}

interface SubtitlePreviewResponse {
  previewUrl: string;
}

interface GenerateSRTResponse {
  srtKey: string;
}

interface BurnSubtitlesResponse {
  videoKey: string;
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
          scopes: tokenPayload.scope,
          iss: tokenPayload.iss,
          sub: tokenPayload.sub
        });
      } catch (e) {
        console.warn('[VideoService] Could not decode token:', e);
      }
  
      console.log('[VideoService] Preparing request:', {
        apiName: 'dubstudio',
        path: '/v1/videos',
        fileName: request.fileName,
        fileType: request.fileType,
        tokenPresent: !!token,
        tokenPrefix: token.substring(0, 20) + '...'
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

  async generateSRT(videoId: string, sourceLanguage: string, targetLanguage: string): Promise<string> {
    try {
      const { body } = await post({
        apiName: 'dubstudio',
        path: `/v1/videos/${videoId}/generate-srt`,
        options: {
          body: JSON.stringify({
            sourceLanguage,
            targetLanguage
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }).response;

      const response = await body.json() as unknown as GenerateSRTResponse;
      return response.srtKey;
    } catch (error) {
      console.error('Error generating SRT:', error);
      throw error;
    }
  }

  async burnSubtitles(videoId: string, srtKey: string, subtitleStyle: SubtitleStyle): Promise<string> {
    try {
      const { body } = await post({
        apiName: 'dubstudio',
        path: `/v1/videos/${videoId}/burn-subtitles`,
        options: {
          body: JSON.stringify({
            srtKey,
            subtitleStyle
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }).response;

      const response = await body.json() as unknown as BurnSubtitlesResponse;
      return response.videoKey;
    } catch (error) {
      console.error('Error burning subtitles:', error);
      throw error;
    }
  }

  async generateSubtitlePreview(params: SubtitlePreviewRequest): Promise<SubtitlePreviewResponse> {
    try {
      // First, ensure we have an SRT file
      const srtKey = await this.generateSRT(
        params.videoId,
        params.sourceLanguage,
        params.targetLanguage
      );

      // Then generate preview with the SRT
      const { body } = await post({
        apiName: 'api',
        path: `/videos/${params.videoId}/subtitle-preview`,
        options: {
          body: JSON.stringify({
            srtKey,
            style: params.subtitleStyle,
            timestamp: params.timestamp,
            previewText: params.previewText
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        },
      }).response;

      const response = await body.json();
      return response as unknown as SubtitlePreviewResponse;
    } catch (error) {
      console.error('Error generating subtitle preview:', error);
      throw error;
    }
  }

  async processLanguagesInParallel(
    videoId: string,
    sourceLanguage: string,
    targetLanguages: string[],
    subtitleStyle: SubtitleStyle
  ): Promise<Array<{ language: string, videoKey: string }>> {
    try {
      // Step 1: Generate SRT files for all languages in parallel
      console.log('Starting parallel SRT generation for languages:', targetLanguages);
      const srtPromises = targetLanguages.map(targetLang => 
        this.generateSRT(videoId, sourceLanguage, targetLang)
          .catch(error => {
            console.error(`Failed to generate SRT for ${targetLang}:`, error);
            throw new Error(`SRT generation failed for ${targetLang}: ${error.message}`);
          })
      );

      // Wait for all SRT files to be generated
      const srtResults = await Promise.allSettled(srtPromises);
      
      // Filter successful results and handle failures
      const successfulSrts = srtResults
        .map((result, index) => ({
          language: targetLanguages[index],
          result
        }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ language, result }) => ({
          language,
          srtKey: (result as PromiseFulfilledResult<string>).value
        }));

      // Log any failures
      const failures = srtResults
        .map((result, index) => ({
          language: targetLanguages[index],
          result
        }))
        .filter(({ result }) => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.error('SRT generation failures:', failures);
      }

      // Step 2: Burn subtitles for all successful SRTs in parallel
      const burnPromises = successfulSrts.map(({ language, srtKey }) =>
        this.burnSubtitles(videoId, srtKey, subtitleStyle)
          .then(videoKey => ({ language, videoKey }))
          .catch(error => {
            console.error(`Failed to burn subtitles for ${language}:`, error);
            throw new Error(`Subtitle burning failed for ${language}: ${error.message}`);
          })
      );

      // Wait for all videos to be processed
      const burnResults = await Promise.allSettled(burnPromises);

      // Return successful results
      return burnResults
        .map((result, index) => ({
          language: successfulSrts[index].language,
          result
        }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ language, result }) => ({
          language,
          videoKey: (result as PromiseFulfilledResult<{ language: string, videoKey: string }>).value.videoKey
        }));

    } catch (error) {
      console.error('Parallel processing error:', error);
      throw error;
    }
  }
}

export const videoService = new VideoService(); 