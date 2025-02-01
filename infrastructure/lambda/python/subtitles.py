import os
import boto3
import uuid
import subprocess
from urllib.parse import urlparse
from tempfile import NamedTemporaryFile
import time

s3 = boto3.client('s3')
transcribe = boto3.client('transcribe')
translate = boto3.client('translate')
dynamodb = boto3.resource('dynamodb').Table(os.environ['VIDEOS_TABLE_NAME'])

def handler(event, context):
    temp_files = [
        '/tmp/original.srt',
        '/tmp/translated.srt'
    ]
    input_video = ''
    output_video = ''
    
    try:
        # Get input parameters from event
        video_key = event['s3Key']
        user_id = event['userId']
        video_id = event['videoId']
        source_lang = event['sourceLanguage']
        target_lang = event['targetLanguage']
        caption = event.get('caption', '')
        
        # Temporary files
        input_video = f"/tmp/{os.path.basename(video_key)}"
        output_video = f"/tmp/subtitled_{os.path.basename(video_key)}"
        temp_files.extend([input_video, output_video])
        
        # Download video from S3
        s3.download_file(os.environ['BUCKET_NAME'], video_key, input_video)
        
        # Update status to PROCESSING
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression="SET subtitleStatus = :status",
            ExpressionAttributeValues={':status': 'PROCESSING'}
        )
        
        # --- Audio Extraction ---
        with NamedTemporaryFile(suffix='.mp3') as audio_file:
            subprocess.run([
                './ffmpeg', '-i', input_video, 
                '-vn', '-acodec', 'libmp3lame', 
                audio_file.name
            ], check=True)
            
            # Upload audio to S3 for Transcribe
            audio_key = f"audio/{video_id}.mp3"
            s3.upload_file(audio_file.name, os.environ['BUCKET_NAME'], audio_key)
        
        # --- Transcription ---
        job_name = f"transcribe-{video_id}-{uuid.uuid4().hex[:8]}"
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f"s3://{os.environ['BUCKET_NAME']}/{audio_key}"},
            MediaFormat='mp3',
            LanguageCode=source_lang,
            Subtitles={'Formats': ['srt']}
        )
        
        # Wait for transcription completion
        while True:
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
                break
            time.sleep(10)
        
        # Get SRT file
        srt_uri = status['TranscriptionJob']['Subtitles']['SubtitleFileUris'][0]
        parsed_uri = urlparse(srt_uri)
        s3.download_file(parsed_uri.netloc.split('.')[0], parsed_uri.path.lstrip('/'), '/tmp/original.srt')
        
        # --- Translation ---
        translated_srt = '/tmp/translated.srt'
        with open('/tmp/original.srt', 'r') as f_in, open(translated_srt, 'w') as f_out:
            for line in f_in:
                if line.strip() and not line.strip().isdigit() and '-->' not in line:
                    res = translate.translate_text(
                        Text=line,
                        SourceLanguageCode=source_lang.split('-')[0],
                        TargetLanguageCode=target_lang
                    )
                    f_out.write(res['TranslatedText'] + '\n')
                else:
                    f_out.write(line)
        
        # --- Burn Subtitles ---
        subprocess.run([
            './ffmpeg', '-i', input_video,
            '-vf', f"subtitles={translated_srt}:force_style='FontName=Arial,FontSize=24'",
            '-c:a', 'copy',
            output_video
        ], check=True)
        
        # Upload processed video
        output_key = f"subtitled/{os.path.basename(video_key)}"
        s3.upload_file(output_video, os.environ['BUCKET_NAME'], output_key)
        
        # Update DynamoDB
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression="SET subtitleStatus = :status, subtitleFileKey = :key",
            ExpressionAttributeValues={
                ':status': 'COMPLETED',
                ':key': output_key
            }
        )
        
        return {'status': 'success'}
    
    except Exception as e:
        dynamodb.update_item(
            Key={'userId': user_id, 'videoId': video_id},
            UpdateExpression="SET subtitleStatus = :status, #err = :error",
            ExpressionAttributeNames={
                '#err': 'error'
            },
            ExpressionAttributeValues={
                ':status': 'FAILED',
                ':error': str(e)
            }
        )
        raise e
    
    finally:
        print("Starting cleanup of temporary files")
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"Deleted temporary file: {file_path}")
                else:
                    print(f"File not found, skipping deletion: {file_path}")
            except Exception as cleanup_error:
                print(f"Error cleaning up {file_path}: {str(cleanup_error)}")
        
        # Additional check for any remaining .srt or .mp3 files
        for f in os.listdir('/tmp'):
            if f.endswith(('.srt', '.mp3', '.mp4')):
                try:
                    full_path = os.path.join('/tmp', f)
                    os.remove(full_path)
                    print(f"Cleaned residual file: {full_path}")
                except Exception as e:
                    print(f"Error cleaning residual file {full_path}: {str(e)}")
        
        print("Cleanup completed")