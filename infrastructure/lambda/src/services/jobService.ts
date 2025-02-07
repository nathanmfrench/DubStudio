import { DynamoDB } from 'aws-sdk';
import { JobRecord, JobStatus, ProcessingTask, TaskStatus } from '../types/job';
import { v4 as uuid } from 'uuid';

const dynamoDB = new DynamoDB.DocumentClient();
const TABLE_NAME = process.env.JOBS_TABLE!;

export class JobService {
  /**
   * Create a new job record
   */
  static async createJob(
    userId: string,
    sourceLanguage: string,
    targetLanguages: string[],
    s3Key: string
  ): Promise<JobRecord> {
    const now = Date.now();
    const job: JobRecord = {
      userId,
      jobId: uuid(),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      ttl: Math.floor(now / 1000) + (7 * 24 * 60 * 60), // 7 days
      video: {
        key: s3Key,
        duration: 0, // Will be updated after upload
        sourceLanguage,
        targetLanguages
      },
      tasks: targetLanguages.map(language => ({
        id: uuid(),
        type: 'SUBTITLE',
        language,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now
      }))
    };

    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: job
    }).promise();

    return job;
  }

  /**
   * Get a job by ID
   */
  static async getJob(userId: string, jobId: string): Promise<JobRecord | null> {
    const result = await dynamoDB.get({
      TableName: TABLE_NAME,
      Key: { userId, jobId }
    }).promise();

    return (result.Item as JobRecord) || null;
  }

  /**
   * Update job status
   */
  static async updateJobStatus(
    userId: string,
    jobId: string,
    status: JobStatus,
    error?: string
  ): Promise<void> {
    const updateExpression = error
      ? 'SET #status = :status, updatedAt = :now, #error = :error'
      : 'SET #status = :status, updatedAt = :now';
    
    const expressionAttributeNames = {
      '#status': 'status',
      ...(error && { '#error': 'error' })
    };

    const expressionAttributeValues = {
      ':status': status,
      ':now': Date.now(),
      ...(error && { ':error': error })
    };

    await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { userId, jobId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }).promise();
  }

  /**
   * Update task status
   */
  static async updateTaskStatus(
    userId: string,
    jobId: string,
    taskId: string,
    status: TaskStatus,
    outputKey?: string,
    error?: string
  ): Promise<void> {
    const job = await this.getJob(userId, jobId);
    if (!job) throw new Error('Job not found');

    const taskIndex = job.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const updatedTask: ProcessingTask = {
      ...job.tasks[taskIndex],
      status,
      updatedAt: Date.now(),
      ...(outputKey && { outputKey }),
      ...(error && { error })
    };

    job.tasks[taskIndex] = updatedTask;

    // Check if all tasks are complete
    const allTasksComplete = job.tasks.every(t => 
      t.status === 'COMPLETED' || t.status === 'FAILED'
    );

    const allTasksFailed = job.tasks.every(t => t.status === 'FAILED');

    // Update job status if needed
    if (allTasksComplete) {
      job.status = allTasksFailed ? 'FAILED' : 'COMPLETED';
    }

    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: job
    }).promise();
  }

  /**
   * List jobs for a user
   */
  static async listUserJobs(userId: string): Promise<JobRecord[]> {
    const result = await dynamoDB.query({
      TableName: TABLE_NAME,
      IndexName: 'user-jobs-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false // Most recent first
    }).promise();

    return (result.Items as JobRecord[]) || [];
  }

  /**
   * List jobs by status
   */
  static async listJobsByStatus(status: JobStatus): Promise<JobRecord[]> {
    const result = await dynamoDB.query({
      TableName: TABLE_NAME,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      }
    }).promise();

    return (result.Items as JobRecord[]) || [];
  }
} 