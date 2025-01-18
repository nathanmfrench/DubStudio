import os
import json
import time
import boto3
from typing import Optional
from elevenlabs import Client

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])
client = Client(api_key=os.environ['ELEVENLABS_API_KEY'])

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
        body = json.loads(event['body'])
        user_id = event['userId']
        video_id = event['videoId']
        source_language = body.get('sourceLanguage', 'en')
        target_language = body.get('targetLanguage')
        
        if not target_language:
            raise ValueError("Missing targetLanguage parameter")
            
        # Download video from S3
        input_path = f'/tmp/input-{video_id}.mp4'
        s3.download_file(
            os.environ['UPLOAD_BUCKET_NAME'],
            f'uploads/{user_id}/{video_id}-test.mp4',
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
        
        # Wait for completion and update status
        if wait_for_dubbing_completion(dubbing_id, user_id, video_id):
            output_path = download_dubbed_file(dubbing_id, target_language)
            
            # Upload to S3
            output_key = f'processed/{user_id}/{video_id}-dubbed.mp4'
            s3.upload_file(
                output_path,
                os.environ['UPLOAD_BUCKET_NAME'],
                output_key,
                ExtraArgs={'ContentType': 'video/mp4'}
            )
            
            # Update status to completed
            dynamodb.update_item(
                Key={'userId': user_id, 'videoId': video_id},
                UpdateExpression='SET #status = :status, #progress = :progress, #updatedAt = :updatedAt, #outputs = :outputs',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#progress': 'progress',
                    '#updatedAt': 'updatedAt',
                    '#outputs': 'outputs'
                },
                ExpressionAttributeValues={
                    ':status': 'COMPLETED',
                    ':progress': 100,
                    ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                    ':outputs': [{
                        'type': 'dubbed',
                        'url': f's3://{os.environ["UPLOAD_BUCKET_NAME"]}/{output_key}'
                    }]
                }
            )
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Video dubbing completed',
                    'videoId': video_id,
                    'status': 'COMPLETED'
                })
            }
        else:
            raise Exception('Dubbing failed')
            
    except Exception as e:
        # Update status to failed
        if 'user_id' in locals() and 'video_id' in locals():
            dynamodb.update_item(
                Key={'userId': user_id, 'videoId': video_id},
                UpdateExpression='SET #status = :status, #progress = :progress, #updatedAt = :updatedAt',
                ExpressionAttributeNames={
                    '#status': 'status',
                    '#progress': 'progress',
                    '#updatedAt': 'updatedAt'
                },
                ExpressionAttributeValues={
                    ':status': 'FAILED',
                    ':progress': 0,
                    ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
                }
            )
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        } 