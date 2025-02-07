import { Handler } from 'aws-lambda';
import { JobService } from '../../services/jobService';
import { spawn } from 'child_process';
import { S3 } from 'aws-sdk';

const s3 = new S3();
const RAW_BUCKET = process.env.RAW_VIDEOS_BUCKET!;
const PROCESSED_BUCKET = process.env.PROCESSED_VIDEOS_BUCKET!;

interface SubtitleEvent {
  userId: string;
  jobId: string;
  taskId: string;
  sourceLanguage: string;
  targetLanguage: string;
  videoKey: string;
}

export const handler: Handler<SubtitleEvent> = async (event) => {
  try {
    const { userId, jobId, taskId, sourceLanguage, targetLanguage, videoKey } = event;

    // Update task status to processing
    await JobService.updateTaskStatus(userId, jobId, taskId, 'PROCESSING');

    // Download video from S3
    const inputPath = `/tmp/${videoKey.split('/').pop()}`;
    await s3.getObject({
      Bucket: RAW_BUCKET,
      Key: videoKey
    }).promise().then(data => {
      require('fs').writeFileSync(inputPath, data.Body);
    });

    // Generate output path
    const outputKey = `subtitled/${jobId}/${targetLanguage}.srt`;
    const outputPath = `/tmp/${outputKey.split('/').pop()}`;

    // Run Python script
    await new Promise((resolve, reject) => {
      const process = spawn('python3', [
        'subtitles.py',
        inputPath,
        outputPath,
        sourceLanguage,
        targetLanguage
      ]);

      process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(null);
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
    });

    // Upload subtitle file to S3
    await s3.putObject({
      Bucket: PROCESSED_BUCKET,
      Key: outputKey,
      Body: require('fs').readFileSync(outputPath),
      ContentType: 'text/plain'
    }).promise();

    // Update task status to completed
    await JobService.updateTaskStatus(
      userId,
      jobId,
      taskId,
      'COMPLETED',
      outputKey
    );

    // Cleanup
    require('fs').unlinkSync(inputPath);
    require('fs').unlinkSync(outputPath);

  } catch (error: any) {
    console.error('Error in subtitle handler:', error);
    
    // Update task status to failed
    await JobService.updateTaskStatus(
      event.userId,
      event.jobId,
      event.taskId,
      'FAILED',
      undefined,
      error.message || 'Unknown error occurred'
    );

    throw error;
  }
}; 