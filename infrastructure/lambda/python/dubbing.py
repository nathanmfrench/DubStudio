import os
import json
import time
import boto3
from typing import Optional
from elevenlabs.client import ElevenLabs

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])
client = ElevenLabs(api_key=os.environ['ELEVENLABS_API_KEY'])

def wait_for_dubbing_completion(dubbing_id: str, user_id: str, video_id: str) -> bool:
    """Wait for the dubbing process to complete while updating status."""
    while True:
        status = client.dubbing.get_dubbing_status(dubbing_id)
        progress = status.progress or 0
        
        # Update DynamoDB with current progress
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression='SET #status = :status, #progress = :progress, #updatedAt = :updatedAt',
            ExpressionAttributeNames={
                '#status': 'status',
                '#progress': 'progress',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues={
                ':status': 'PROCESSING',
                ':progress': progress,
                ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            }
        )
        
        if status.status == 'done':
            return True
        elif status.status == 'failed':
            return False
            
        time.sleep(5)  # Wait 5 seconds before checking again

def download_dubbed_file(dubbing_id: str, target_language: str) -> str:
    """Download the dubbed file from ElevenLabs."""
    output_path = f'/tmp/output-{dubbing_id}.mp4'
    with open(output_path, 'wb') as f:
        dubbed_video = client.dubbing.get_dubbed_video(dubbing_id)
        for chunk in dubbed_video:
            f.write(chunk)
    return output_path

def handler(event, context):
    try:
        # Parse input
        user_id = event['userId']
        video_id = event['videoId']
        body = event['body']
        source_language = body.get('sourceLanguage', 'en')  # Default to English
        target_language = body.get('targetLanguage')
        
        if not target_language:
            raise ValueError("Missing targetLanguage parameter")
            
        # Get video details from DynamoDB
        video_record = dynamodb.get_item(
            Key={'userId': user_id, 'videoId': video_id}
        ).get('Item')
        
        if not video_record or 'fileName' not in video_record:
            raise ValueError("Video record not found or missing fileName")
            
        # Download video from S3
        input_path = f'/tmp/input-{video_id}.mp4'
        s3.download_file(
            os.environ['BUCKET_NAME'],
            f'{user_id}/{video_id}/{video_record["fileName"]}',
            input_path
        )
        
        # Start dubbing process
        with open(input_path, 'rb') as video_file:
            response = client.dubbing.dub_a_video_or_an_audio_file(
                file=(f'{video_id}.mp4', video_file, 'video/mp4'),
                target_lang=target_language,
                mode='automatic',
                source_lang=source_language,
                num_speakers=1,
                watermark=False
            )
            dubbing_id = response.dubbing_id
        
        # Wait for dubbing to complete
        success = wait_for_dubbing_completion(dubbing_id, user_id, video_id)
        
        if not success:
            # Update DynamoDB with failed status
            dynamodb.update_item(
                Key={'userId': user_id, 'videoId': video_id},
                UpdateExpression='SET #status = :status, #updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues={
                    ':status': 'FAILED',
                    ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                }
            )
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Dubbing process failed'})
            }
        
        # Download the dubbed file
        output_path = download_dubbed_file(dubbing_id, target_language)
        
        # Upload to S3
        s3.upload_file(
            output_path,
            os.environ['BUCKET_NAME'],
            f'{user_id}/{video_id}/dubbed_{target_language}.mp4'
        )
        
        # Update DynamoDB with completed status
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression='SET #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames={
                '#status': 'status',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Video dubbing completed successfully',
                'videoId': video_id,
                'targetLanguage': target_language
            })
        }
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        # Update DynamoDB with failed status
        if 'user_id' in locals() and 'video_id' in locals():
            dynamodb.update_item(
                Key={'userId': user_id, 'videoId': video_id},
                UpdateExpression='SET #status = :status, #updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues={
                    ':status': 'FAILED',
                    ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                }
            )
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        } 