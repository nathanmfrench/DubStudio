Command for creating a user
aws cognito-idp sign-up --client-id 2rk19ojdq41tmc3oqh9oglguvv --username test@example.com --password Test123! --user-attributes Name=email,Value=test@example.com

command for confirming a user
aws cognito-idp admin-confirm-sign-up --user-pool-id us-east-1_FLRMSPSAv --username test@example.com

command for getting an auth token
aws cognito-idp initiate-auth --client-id 2rk19ojdq41tmc3oqh9oglguvv --auth-flow USER_PASSWORD_AUTH --auth-parameters USERNAME=test@example.com,PASSWORD=Test123! > auth_response.json && cat auth_response.json

use the ID token from here (im not sure if we should be getting the access token here, but the ID token is what works)
TOKEN=$(cat auth_response.json | jq -r '.AuthenticationResult.IdToken') && echo $TOKEN > token.txt

test the endpoint to get an upload URL (change endpoint and potentially filename if needed)
curl -X POST 'https://alrytq3pud.execute-api.us-east-1.amazonaws.com/prod/v1/videos' \
  -H "Authorization: Bearer $(cat token.txt)" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.mp4",
    "sourceLanguage": "en",
    "targetLanguages": ["es", "fr"]
  }'

Check the api gateway logs
aws logs get-log-events --log-group-name "API-Gateway-Execution-Logs_alrytq3pud/prod" --log-stream-name $(aws logs describe-log-streams --log-group-name "API-Gateway-Execution-Logs_alrytq3pud/prod" --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text) | jq '.events[].message'

