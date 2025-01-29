import axios from 'axios';
import { API_URL } from '..//config/constants';
import { getAuthToken } from '..//utils/auth';

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

class VideoService {
  private async getHeaders() {
    const token = await getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getUploadUrl(request: UploadVideoRequest): Promise<UploadVideoResponse> {
    const headers = await this.getHeaders();
    const response = await axios.post(`${API_URL}/v1/videos`, request, { headers });
    return response.data;
  }

  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }

  async getVideoStatus(videoId: string): Promise<VideoStatus> {
    const headers = await this.getHeaders();
    const response = await axios.get(`${API_URL}/v1/videos/${videoId}/status`, { headers });
    return response.data;
  }
}

export const videoService = new VideoService(); 