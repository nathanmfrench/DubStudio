import os
import json
import time
import boto3
from typing import Optional
from datetime import datetime
from elevenlabs.client import ElevenLabs
from botocore.exceptions import ClientError

# Initialize AWS clients
s3 = boto3.client('s3')
secrets_manager = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])

# Cache for secrets (Lambda instance reuse)
secret_cache = {}

def get_secret(secret_name: str) -> str:
    """Retrieve secret from AWS Secrets Manager with caching"""
    if secret_name in secret_cache:
        return secret_cache[secret_name]
    
    try:
        response = secrets_manager.get_secret_value(SecretId=secret_name)
        if 'SecretString' in response:
            secret = response['SecretString']
            # Handle JSON-formatted secrets or raw strings
            try:
                secret_data = json.loads(secret)
                if 'ELEVENLABS_API_KEY' in secret_data:
                    secret_cache[secret_name] = secret_data['ELEVENLABS_API_KEY']
                else:
                    raise ValueError("Secret missing ELEVENLABS_API_KEY field")
            except json.JSONDecodeError:
                secret_cache[secret_name] = secret
        else:
            secret_cache[secret_name] = response['SecretBinary']
        
        return secret_cache[secret_name]
    
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = f"Secrets Manager Error ({error_code}): {e.response['Error']['Message']}"
        raise Exception(error_msg) from e

def get_elevenlabs_client() -> ElevenLabs:
    """Initialize ElevenLabs client with secret from AWS Secrets Manager"""
    secret_name = os.environ['ELEVENLABS_SECRET_NAME']
    api_key = get_secret(secret_name)
    
    return ElevenLabs(api_key=api_key)

def wait_for_dubbing_completion(dubbing_id: str, user_id: str, video_id: str) -> bool:
    """Wait for the dubbing process to complete"""
    client = get_elevenlabs_client()
    
    while True:
        try:
            metadata = client.dubbing.get_dubbing_project_metadata(dubbing_id)
            print(f"Dubbing metadata response: {metadata}")

            # Update DynamoDB
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

            if metadata.status == 'dubbed':
                return True
            if metadata.error:
                return False

            time.sleep(5)
        except Exception as e:
            print(f"Error checking dubbing status: {str(e)}")
            return False

def download_dubbed_file(dubbing_id: str, target_language: str) -> str:
    """Download the dubbed file from ElevenLabs"""
    client = get_elevenlabs_client()
    output_path = f'/tmp/output-{dubbing_id}.mp4'
    
    try:
        with open(output_path, 'wb') as f:
            dubbed_file = client.dubbing.get_dubbed_file(dubbing_id, language_code=target_language)
            for chunk in dubbed_file:
                f.write(chunk)
        return output_path
    except Exception as e:
        print(f"Error downloading dubbed file: {str(e)}")
        raise

def handler(event, context):
    try:
        # Retrieve ElevenLabs client first to validate secret
        client = get_elevenlabs_client()
        
        # Rest of your original handler code remains the same
        print(f"Raw event received: {json.dumps(event)}")
        user_id = event['userId']
        video_id = event['videoId']
        print(f"Extracted user_id: {user_id}, video_id: {video_id}")
        
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        print(f"Parsed body: {json.dumps(body)}")
        
        # ... rest of your original handler code ...

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