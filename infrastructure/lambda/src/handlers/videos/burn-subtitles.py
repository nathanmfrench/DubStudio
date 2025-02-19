import os
import boto3
from subtitle_utils import SubtitleStyle

s3 = boto3.client('s3')

def handler(event, context):
    temp_files = []
    input_video = ''
    output_video = ''
    
    try:
        # Get input parameters from event
        video_key = event['videoKey']
        srt_key = event['srtKey']
        subtitle_style = event.get('subtitleStyle', {})
        
        # Setup temporary files
        input_video = f"/tmp/{os.path.basename(video_key)}"
        input_srt = f"/tmp/{os.path.basename(srt_key)}"
        output_video = f"/tmp/subtitled_{os.path.basename(video_key)}"
        temp_files.extend([input_video, input_srt, output_video])
        
        # Download video and SRT from S3
        s3.download_file(os.environ['RAW_VIDEOS_BUCKET'], video_key, input_video)
        s3.download_file(os.environ['PROCESSED_VIDEOS_BUCKET'], srt_key, input_srt)
        
        # Initialize subtitle styler
        subtitle_style = SubtitleStyle(
            style_params=subtitle_style,
            video_path=input_video
        )
        
        # Get FFMPEG style string
        style_string = subtitle_style.get_ffmpeg_style()
        
        # Burn subtitles using FFMPEG
        ffmpeg_cmd = [
            'ffmpeg', '-i', input_video,
            '-vf', f"subtitles={input_srt}:{style_string}",
            '-c:a', 'copy',  # Copy audio stream as is
            '-c:v', 'libx264',  # Use H.264 codec for video
            '-preset', 'medium',  # Balance between quality and encoding speed
            '-crf', '23',  # Constant Rate Factor (18-28 is visually lossless)
            '-movflags', '+faststart',  # Enable fast start for web playback
            '-y',  # Overwrite output file if it exists
            output_video
        ]
        
        # Execute FFMPEG command
        os.system(' '.join(ffmpeg_cmd))
        
        # Upload processed video
        output_key = f"subtitled/{os.path.basename(video_key)}"
        s3.upload_file(
            output_video,
            os.environ['PROCESSED_VIDEOS_BUCKET'],
            output_key,
            ExtraArgs={'ContentType': 'video/mp4'}
        )
        
        return {
            'statusCode': 200,
            'body': {
                'videoKey': output_key
            }
        }
    
    except Exception as e:
        print(f"Error in burn-subtitles: {str(e)}")
        raise e
    
    finally:
        # Cleanup temporary files
        for file_path in temp_files:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as cleanup_error:
                print(f"Error cleaning up {file_path}: {str(cleanup_error)}") 