import os
import json
import time
import boto3
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from elevenlabs.client import ElevenLabs
from botocore.exceptions import ClientError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_event(stage: str, action: str = None, **kwargs):
    log_data = {
        'stage': stage,
        'timestamp': datetime.utcnow().isoformat(),
        **({"action": action} if action else {}),
        **kwargs
    }
    logger.info(json.dumps(log_data))

# Initialize AWS clients
s3 = boto3.client('s3')
secrets_manager = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])

# Cache for secrets (Lambda instance reuse)
secret_cache = {}

def get_secret(secret_name: str) -> str:
    """Retrieve secret from AWS Secrets Manager with caching"""
    log_event('PROCESSING', 'fetch_secret', secret_name=secret_name)
    
    if secret_name in secret_cache:
        log_event('PROCESSING', 'use_cached_secret', secret_name=secret_name)
        return secret_cache[secret_name]
    
    try:
        response = secrets_manager.get_secret_value(SecretId=secret_name)
        if 'SecretString' in response:
            secret = response['SecretString']
            try:
                secret_data = json.loads(secret)
                if 'ELEVENLABS_API_KEY' in secret_data:
                    secret_cache[secret_name] = secret_data['ELEVENLABS_API_KEY']
                else:
                    log_event('ERROR', 'missing_api_key_field', secret_name=secret_name)
                    raise ValueError("Secret missing ELEVENLABS_API_KEY field")
            except json.JSONDecodeError:
                secret_cache[secret_name] = secret
        else:
            secret_cache[secret_name] = response['SecretBinary']
        
        log_event('PROCESSING', 'secret_retrieved', secret_name=secret_name)
        return secret_cache[secret_name]
    
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_msg = f"Secrets Manager Error ({error_code}): {e.response['Error']['Message']}"
        log_event('ERROR', 'secrets_manager_error', 
                 error_code=error_code, 
                 error_message=e.response['Error']['Message'])
        raise Exception(error_msg) from e

def get_elevenlabs_client() -> ElevenLabs:
    """Initialize ElevenLabs client with secret from AWS Secrets Manager"""
    log_event('PROCESSING', 'initialize_elevenlabs_client')
    secret_name = os.environ['ELEVENLABS_SECRET_NAME']
    api_key = get_secret(secret_name)
    return ElevenLabs(api_key=api_key)

def wait_for_dubbing_completion(dubbing_id: str, user_id: str, video_id: str) -> bool:
    """Wait for the dubbing process to complete"""
    log_event('PROCESSING', 'check_dubbing_status', 
              dubbing_id=dubbing_id, 
              user_id=user_id, 
              video_id=video_id)
    
    client = get_elevenlabs_client()
    
    while True:
        try:
            metadata = client.dubbing.get_dubbing_project_metadata(dubbing_id)
            log_event('PROCESSING', 'dubbing_status_check', 
                     dubbing_id=dubbing_id, 
                     status=metadata.status)

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
            log_event('PROCESSING', 'updated_dynamodb_status', 
                     user_id=user_id, 
                     video_id=video_id, 
                     status='PROCESSING')

            if metadata.status == 'dubbed':
                log_event('COMPLETE', 'dubbing_finished', dubbing_id=dubbing_id)
                return True
            if metadata.error:
                log_event('ERROR', 'dubbing_failed', 
                         dubbing_id=dubbing_id, 
                         error=metadata.error)
                return False

            time.sleep(5)
        except Exception as e:
            log_event('ERROR', 'status_check_failed', 
                     dubbing_id=dubbing_id, 
                     error=str(e))
            return False

def download_dubbed_file(dubbing_id: str, target_language: str) -> str:
    """Download the dubbed file from ElevenLabs"""
    log_event('PROCESSING', 'download_dubbed_file', 
              dubbing_id=dubbing_id, 
              target_language=target_language)
    
    client = get_elevenlabs_client()
    output_path = f'/tmp/output-{dubbing_id}.mp4'
    
    try:
        with open(output_path, 'wb') as f:
            dubbed_file = client.dubbing.get_dubbed_file(dubbing_id, language_code=target_language)
            for chunk in dubbed_file:
                f.write(chunk)
        log_event('COMPLETE', 'file_downloaded', 
                 dubbing_id=dubbing_id, 
                 output_path=output_path)
        return output_path
    except Exception as e:
        log_event('ERROR', 'download_failed', 
                 dubbing_id=dubbing_id, 
                 error=str(e))
        raise

def handler(event, context):
    log_event('START', 'dubbing_handler', 
              request_id=context.aws_request_id,
              function_name=context.function_name,
              event=event)
    
    try:
        # Retrieve ElevenLabs client first to validate secret
        client = get_elevenlabs_client()
        
        user_id = event['userId']
        video_id = event['videoId']
        log_event('PROCESSING', 'extract_ids', 
                 user_id=user_id, 
                 video_id=video_id)
        
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        log_event('PROCESSING', 'parse_body', body=body)
        
        # Start dubbing process
        source_language = body.get('sourceLanguage', 'en')
        target_language = body.get('targetLanguage')
        
        log_event('PROCESSING', 'start_dubbing', 
                 source_language=source_language,
                 target_language=target_language)
        
        # Add your dubbing logic here
        # ...

        log_event('COMPLETE', 'dubbing_process_finished', 
                 video_id=video_id,
                 target_language=target_language)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Dubbing process completed successfully',
                'videoId': video_id
            })
        }

    except Exception as e:
        log_event('ERROR', 'dubbing_process_failed',
                 error=str(e),
                 stack_trace=getattr(e, '__traceback__', None),
                 user_id=user_id if 'user_id' in locals() else None,
                 video_id=video_id if 'video_id' in locals() else None)
        
        if 'user_id' in locals() and 'video_id' in locals():
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
            log_event('ERROR', 'updated_dynamodb_with_error',
                     user_id=user_id,
                     video_id=video_id,
                     error=str(e))
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }