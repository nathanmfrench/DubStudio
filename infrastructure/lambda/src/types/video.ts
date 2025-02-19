export interface VideoMetadata {
  userId: string;
  videoId: string;
  fileName: string;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  sourceLanguage?: string;
  targetLanguages?: string[];
  dubbingIds?: { [key: string]: string }; // language -> dubbingId mapping
  // Add to VideoMetadata interface
  subtitleStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  subtitleFileKey?: string;
  subtitleStyle?: SubtitleStyle;
}

export interface SubtitleStyle {
  fontSize?: number;        // e.g., 24
  fontColor?: string;       // hex color like '#FFFFFF'
  backgroundColor?: string; // hex color like '#000000'
  fontType?: string;        // e.g., 'Arial', 'Helvetica', etc.
  outline?: number;         // e.g., 1
  opacity?: number;         // 0-1, for background opacity
  position?: {
    x: number;             // percentage from left (0-100)
    y: number;             // percentage from top (0-100)
  };
}

export type VideoStatus = 
  | 'pending_upload'
  | 'uploaded'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ProcessVideoRequest {
  sourceLanguage: string;
  targetLanguages: string[];
  caption?: boolean;
  subtitleStyle?: SubtitleStyle;
}

export interface UploadVideoRequest {
  fileName: string;
  fileType: string;
}

export interface UploadVideoResponse {
  uploadUrl: string;
  videoId: string;
  key: string;
}

export interface VideoStatusResponse {
  videoId: string;
  status: VideoStatus;
  error?: string;
  dubbingProgress?: {
    [language: string]: {
      status: string;
      progress: number;
    };
  };
} 