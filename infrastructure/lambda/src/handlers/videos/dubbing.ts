import { Handler } from 'aws-lambda';
import { JobService } from '../../services/jobService';
import { spawn } from 'child_process';
import { S3 } from 'aws-sdk';

const s3 = new S3();
const RAW_BUCKET = process.env.RAW_VIDEOS_BUCKET!;
const PROCESSED_BUCKET = process.env.PROCESSED_VIDEOS_BUCKET!;

interface DubbingEvent {
  userId: string;
  jobId: string;
  taskId: string;
  sourceLanguage: string;
  targetLanguage: string;
  videoKey: string;
  subtitleKey: string;
}

export const handler: Handler<DubbingEvent> = async (event) => {
  try {
    const { 
      userId, 
      jobId, 
      taskId, 
      sourceLanguage, 
      targetLanguage, 
      videoKey,
      subtitleKey 
    } = event;

    // Update task status to processing
    await JobService.updateTaskStatus(userId, jobId, taskId, 'PROCESSING');

    // Download video and subtitle from S3
    const inputVideoPath = `/tmp/${videoKey.split('/').pop()}`;
    const inputSubtitlePath = `/tmp/${subtitleKey.split('/').pop()}`;

    await Promise.all([
      s3.getObject({
        Bucket: RAW_BUCKET,
        Key: videoKey
      }).promise().then(data => {
        require('fs').writeFileSync(inputVideoPath, data.Body);
      }),
      s3.getObject({
        Bucket: PROCESSED_BUCKET,
        Key: subtitleKey
      }).promise().then(data => {
        require('fs').writeFileSync(inputSubtitlePath, data.Body);
      })
    ]);

    // Generate output path
    const outputKey = `dubbed/${jobId}/${targetLanguage}.mp4`;
    const outputPath = `/tmp/${outputKey.split('/').pop()}`;

    // Run Python script
    await new Promise((resolve, reject) => {
      const process = spawn('python3', [
        'dubbing.py',
        inputVideoPath,
        inputSubtitlePath,
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

    // Upload dubbed video to S3
    await s3.putObject({
      Bucket: PROCESSED_BUCKET,
      Key: outputKey,
      Body: require('fs').readFileSync(outputPath),
      ContentType: 'video/mp4'
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
    require('fs').unlinkSync(inputVideoPath);
    require('fs').unlinkSync(inputSubtitlePath);
    require('fs').unlinkSync(outputPath);

  } catch (error: any) {
    console.error('Error in dubbing handler:', error);
    
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