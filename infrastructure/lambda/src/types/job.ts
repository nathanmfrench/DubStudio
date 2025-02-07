export type JobStatus = 
  | 'PENDING'    // Initial state
  | 'UPLOADING'  // File is being uploaded
  | 'PROCESSING' // Being processed
  | 'COMPLETED'  // All tasks completed
  | 'FAILED';    // Processing failed

export type TaskType = 'SUBTITLE' | 'DUB';

export type TaskStatus = 
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface VideoMetadata {
  key: string;        // S3 key
  duration: number;   // in seconds
  sourceLanguage: string;
  targetLanguages: string[];
}

export interface ProcessingTask {
  id: string;        // Unique task ID
  type: TaskType;
  language: string;
  status: TaskStatus;
  outputKey?: string; // S3 key of processed file
  error?: string;     // Error message if failed
  createdAt: number;
  updatedAt: number;
}

export interface JobRecord {
  // Keys
  userId: string;     // Partition key
  jobId: string;      // Sort key

  // Status
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  ttl: number;        // Auto-delete after 7 days

  // Content
  video: VideoMetadata;
  tasks: ProcessingTask[];

  // Error handling
  error?: string;     // Overall job error
} 