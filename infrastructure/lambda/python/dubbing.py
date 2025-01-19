import os
import json
import time
import boto3
from typing import Optional
from datetime import datetime

from elevenlabs.client import ElevenLabs

# do we need to import the dubbing stuff here?


s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])
client = ElevenLabs(api_key=os.environ['ELEVENLABS_API_KEY'])

def wait_for_dubbing_completion(dubbing_id: str, user_id: str, video_id: str) -> bool:
    """Wait for the dubbing process to complete."""
    while True:
        # Get metadata response (DubbingMetadataResponse object)
        metadata = client.dubbing.get_dubbing_project_metadata(dubbing_id)
        print(f"Dubbing metadata response: {metadata}")  # Debug print
        
        # Update DynamoDB to show we're processing
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression='SET #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames={
                '#status': 'status',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues={
                ':status': 'PROCESSING',
                ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z')
            }
        )
        
        # Check the status field from DubbingMetadataResponse
        if metadata.status == 'dubbed':  # Explicitly check for 'dubbed' status
            return True
        elif metadata.error is not None:
            return False
            
        time.sleep(5)  # Wait 5 seconds before checking again

def download_dubbed_file(dubbing_id: str, target_language: str) -> str:
    """Download the dubbed file from ElevenLabs."""
    output_path = f'/tmp/output-{dubbing_id}.mp4'
    with open(output_path, 'wb') as f:
        dubbed_file = client.dubbing.get_dubbed_file(dubbing_id, language_code=target_language)
        for chunk in dubbed_file:
            f.write(chunk)
    return output_path

def handler(event, context):
    try:
        # Parse input
        print(f"Raw event received: {json.dumps(event)}")  # Log entire event
        user_id = event['userId']
        video_id = event['videoId']
        print(f"Extracted user_id: {user_id}, video_id: {video_id}")
        
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        print(f"Parsed body: {json.dumps(body)}")  # Log parsed body
        
        source_language = body.get('sourceLanguage', 'en')
        # Handle both singular and plural parameter names
        target_language = body.get('targetLanguage')
        target_languages = body.get('targetLanguages', [])
        
        # If singular parameter is provided, convert to list format
        if target_language:
            target_languages = [target_language]
            
        print(f"Extracted languages - source: {source_language}, target: {target_languages}")
        
        if not target_languages:
            print("No target languages found in request body")
            raise ValueError("Missing targetLanguages parameter")
            
        # Validate language codes
        supported_languages = {'en', 'hi', 'pt', 'zh', 'es', 'fr', 'de', 'ja', 'ar', 'ru', 'ko', 'id', 'it', 'nl', 'tr', 'pl', 'sv', 'fil', 'ms', 'ro', 'uk', 'el', 'cs', 'da', 'fi', 'bg', 'hr', 'sk', 'ta'}
        if target_language not in supported_languages:
            raise ValueError(f"Unsupported target language: {target_language}")
        if source_language not in supported_languages:
            raise ValueError(f"Unsupported source language: {source_language}")
            
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
                source_lang=source_language,
                num_speakers=1,
                watermark=True
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
        
        # Update DynamoDB with success status
        dynamodb.update_item(
            TableName=os.environ['VIDEOS_TABLE_NAME'],
            Key={
                'userId': user_id,
                'videoId': video_id
            },
            UpdateExpression='SET #status = :status, #updatedAt = :updatedAt REMOVE #error',
            ExpressionAttributeNames={
                '#status': 'status',
                '#updatedAt': 'updatedAt',
                '#error': 'error'
            },
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':updatedAt': datetime.now().isoformat()
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Video dubbing completed',
                'videoId': video_id,
                'status': 'COMPLETED',
                'targetLanguage': target_language
            })
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        # Update DynamoDB with failed status
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression='SET #status = :status, #updatedAt = :updatedAt, #error = :error',
            ExpressionAttributeNames={
                '#status': 'status',
                '#updatedAt': 'updatedAt',
                '#error': 'error'
            },
            ExpressionAttributeValues={
                ':status': 'FAILED',
                ':updatedAt': time.strftime('%Y-%m-%dT%H:%M:%S.000Z'),
                ':error': str(e)
            }
        )
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        } 