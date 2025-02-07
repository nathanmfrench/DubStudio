import os
import json
import boto3
from elevenlabs import set_api_key
from botocore.exceptions import ClientError

def get_secret():
    secret_name = os.environ['ELEVENLABS_SECRET_NAME']
    region_name = os.environ.get('AWS_REGION', 'us-east-1')

    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e
    else:
        if 'SecretString' in get_secret_value_response:
            return get_secret_value_response['SecretString']
        else:
            raise ValueError("Secret value is not a string")

def handler(event, context):
    try:
        # Get ElevenLabs API key from Secrets Manager
        elevenlabs_api_key = get_secret()
        set_api_key(elevenlabs_api_key)

        # Rest of your dubbing code here
        # ...

    except Exception as e:
        print(f"Error in dubbing handler: {str(e)}")
        raise 