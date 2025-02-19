import os
import boto3
import uuid
from urllib.parse import urlparse
from tempfile import NamedTemporaryFile
import time

s3 = boto3.client('s3')
transcribe = boto3.client('transcribe')
translate = boto3.client('translate')

def handler(event, context):
    temp_files = ['/tmp/original.srt', '/tmp/translated.srt']
    input_video = ''
    
    try:
        # Get input parameters from event
        video_key = event['videoKey']
        source_lang = event['sourceLanguage']
        target_lang = event['targetLanguage']
        
        # Temporary files
        input_video = f"/tmp/{os.path.basename(video_key)}"
        temp_files.append(input_video)
        
        # Download video from S3
        s3.download_file(os.environ['RAW_VIDEOS_BUCKET'], video_key, input_video)
        
        # --- Audio Extraction ---
        with NamedTemporaryFile(suffix='.mp3') as audio_file:
            os.system(f'ffmpeg -i {input_video} -vn -acodec libmp3lame {audio_file.name}')
            
            # Upload audio to S3 for Transcribe
            audio_key = f"audio/{uuid.uuid4()}.mp3"
            s3.upload_file(audio_file.name, os.environ['PROCESSED_VIDEOS_BUCKET'], audio_key)
        
        # --- Transcription ---
        job_name = f"transcribe-{uuid.uuid4()}-{target_lang}"
        
        # Start transcription with a unique output key
        transcribe.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': f"s3://{os.environ['PROCESSED_VIDEOS_BUCKET']}/{audio_key}"},
            MediaFormat='mp3',
            LanguageCode=source_lang,
            Subtitles={'Formats': ['srt']},
            OutputBucketName=os.environ['PROCESSED_VIDEOS_BUCKET'],
            OutputKey=f"transcripts/{job_name}"
        )
        
        # Wait for transcription completion
        while True:
            status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
            if status['TranscriptionJob']['TranscriptionJobStatus'] in ['COMPLETED', 'FAILED']:
                break
            time.sleep(5)
        
        if status['TranscriptionJob']['TranscriptionJobStatus'] == 'FAILED':
            raise Exception('Transcription job failed')
        
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
        
        # Upload translated SRT to S3 with 1-day expiration
        srt_key = f"srt/{uuid.uuid4()}.srt"
        s3.upload_file(
            translated_srt,
            os.environ['PROCESSED_VIDEOS_BUCKET'],
            srt_key,
            ExtraArgs={
                'ContentType': 'text/plain',
                'Expires': int(time.time()) + 86400  # 24 hours from now
            }
        )
        
        return {
            'statusCode': 200,
            'body': {
                'srtKey': srt_key
            }
        }
    
    except Exception as e:
        print(f"Error in generate-srt for language {target_lang}: {str(e)}")
        raise e
    
    finally:
        # Cleanup temporary files
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as cleanup_error:
                print(f"Error cleaning up {file_path}: {str(cleanup_error)}") 