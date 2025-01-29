import os
import time
from typing import Optional
from elevenlabs.client import ElevenLabs
import boto3


# Get secret from AWS
secrets_client = boto3.client('secretsmanager')
secret = secrets_client.get_secret_value(SecretId='ELEVENLABS_API_KEY')
ELEVENLABS_API_KEY = secret['SecretString']

if not ELEVENLABS_API_KEY:
    raise ValueError("ELEVENLABS_API_KEY not found in AWS Secrets Manager")

client = ElevenLabs(api_key=ELEVENLABS_API_KEY)

def download_dubbed_file(dubbing_id: str, language_code: str) -> str:
    """
    Downloads the dubbed file for a given dubbing ID and language code.

    Args:
        dubbing_id: The ID of the dubbing project.
        language_code: The language code for the dubbing.

    Returns:
        The file path to the downloaded dubbed file.
    """
    dir_path = f"output/{dubbing_id}"
    os.makedirs(dir_path, exist_ok=True)

    file_path = f"{dir_path}/{language_code}.mp4"
    with open(file_path, "wb") as file:
        for chunk in client.dubbing.get_dubbed_file(dubbing_id, language_code):
            file.write(chunk)

    return file_path

def wait_for_dubbing_completion(dubbing_id: str, verbose: bool = True) -> bool:
    """
    Waits for the dubbing process to complete by periodically checking the status.

    Args:
        dubbing_id (str): The dubbing project id.
        verbose (bool): Whether to print status updates.

    Returns:
        bool: True if the dubbing is successful, False otherwise.
    """
    MAX_ATTEMPTS = 120
    CHECK_INTERVAL = 10  # In seconds

    for attempt in range(MAX_ATTEMPTS):
        try:
            metadata = client.dubbing.get_dubbing_project_metadata(dubbing_id)
            if metadata.status == "dubbed":
                if verbose:
                    print(f"Dubbing completed successfully after {attempt * CHECK_INTERVAL} seconds")
                return True
            elif metadata.status == "dubbing":
                if verbose:
                    print(f"Dubbing in progress ({attempt + 1}/{MAX_ATTEMPTS})... {metadata.status}")
                time.sleep(CHECK_INTERVAL)
            else:
                if verbose:
                    print(f"Dubbing failed: {metadata.error_message}")
                return False
        except Exception as e:
            if verbose:
                print(f"Error checking dubbing status: {str(e)}")
            return False

    if verbose:
        print(f"Dubbing timed out after {MAX_ATTEMPTS * CHECK_INTERVAL} seconds")
    return False

def create_dub_from_file(
    input_file_path: str,
    file_format: str,
    source_language: str,
    target_language: str,
    verbose: bool = True
) -> Optional[str]:
    """
    Dubs an audio or video file from one language to another and saves the output.

    Args:
        input_file_path (str): The file path of the audio or video to dub.
        file_format (str): The file format of the input file.
        source_language (str): The language of the input file.
        target_language (str): The target language to dub into.
        verbose (bool): Whether to print status updates.

    Returns:
        Optional[str]: The file path of the dubbed file or None if operation failed.
    """
    if not os.path.isfile(input_file_path):
        raise FileNotFoundError(f"The input file does not exist: {input_file_path}")

    if verbose:
        print(f"Starting dubbing process for {input_file_path}")
        print(f"Source language: {source_language}")
        print(f"Target language: {target_language}")

    try:
        with open(input_file_path, "rb") as audio_file:
            response = client.dubbing.dub_a_video_or_an_audio_file(
                file=(os.path.basename(input_file_path), audio_file, file_format),
                target_lang=target_language,
                source_lang=source_language,
                num_speakers=1,
                watermark=True, #set to false when I upgrade to creator+
            )

        dubbing_id = response.dubbing_id
        if verbose:
            print(f"Dubbing initiated with ID: {dubbing_id}")

        if wait_for_dubbing_completion(dubbing_id, verbose):
            output_file_path = download_dubbed_file(dubbing_id, target_language)
            if verbose:
                print(f"Dubbing completed and saved to: {output_file_path}")
            return output_file_path
        else:
            if verbose:
                print("Dubbing process failed")
            return None

    except Exception as e:
        if verbose:
            print(f"Error during dubbing process: {str(e)}")
        return None

def test_dubbing(input_file: str, source_lang: str, target_lang: str):
    """
    Test function to run a dubbing process with detailed logging.
    """
    print("\n=== Starting Dubbing Test ===")
    print(f"Input file: {input_file}")
    print(f"Source language: {source_lang}")
    print(f"Target language: {target_lang}")
    
    # Determine file format based on extension
    file_format = {
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.wav': 'audio/wav',
    }.get(os.path.splitext(input_file)[1].lower(), 'audio/mpeg')
    
    print(f"Detected file format: {file_format}")
    
    try:
        result = create_dub_from_file(
            input_file,
            file_format,
            source_lang,
            target_lang,
            verbose=True
        )
        
        if result:
            print("\n✅ Test completed successfully!")
            print(f"Output file: {result}")
            
            # Verify the output file exists and has content
            if os.path.exists(result) and os.path.getsize(result) > 0:
                print(f"Output file size: {os.path.getsize(result)} bytes")
            else:
                print("⚠️ Warning: Output file is empty or does not exist")
        else:
            print("\n❌ Test failed: No output file was generated")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")

if __name__ == "__main__":
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)
    
    # Example test cases
    test_cases = [
        {
            "input_file": "example.mp4",
            "source_lang": "en",
            "target_lang": "es",
        },
        # Add more test cases as needed
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n=== Running Test Case {i} ===")
        test_dubbing(**test_case) 