import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Import the existing ElevenLabs API key secret
    const elevenLabsSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 
      'DubStudioElevenLabsSecret', 
      'ELEVENLABS_API_KEY'
    );

    // Create S3 bucket for video uploads with proper CORS
    const videoBucket = new s3.Bucket(this, 'DubStudioVideoBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      autoDeleteObjects: true, // For development only
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'], // Restrict this in production
          allowedHeaders: ['*'],
          exposedHeaders: [
            'ETag',
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2'
          ],
        },
      ],
    });

    // Create DynamoDB table for videos
    const videosTable = new dynamodb.Table(this, 'DubStudioVideosTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      timeToLiveAttribute: 'ttl', // Optional: for cleanup of old records
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'DubStudioUserPool', {
      userPoolName: 'dubstudio-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        tier: new cognito.StringAttribute({ mutable: true }), // For user subscription tier
        credits: new cognito.NumberAttribute({ mutable: true }), // For usage tracking
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
    });

    // Create Cognito User Pool Client
    const userPoolClient = userPool.addClient('DubStudioUserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['exp://localhost:19000/--/*'], // Update with your Expo callback URLs
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // Common Lambda configuration
    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        NODE_ENV: 'production',
        BUCKET_NAME: videoBucket.bucketName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    // Create Lambda functions
    const videoUploadHandler = new lambda.Function(this, 'DubStudioVideoUploadHandler', {
      ...commonLambdaConfig,
      handler: 'videos/upload.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')), // Changed to "dist"
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonLambdaConfig.environment,
        VIDEOS_TABLE_NAME: videosTable.tableName,
      },
    });

    const videoStatusHandler = new lambda.Function(this, 'DubStudioVideoStatusHandler', {
      ...commonLambdaConfig,
      handler: 'videos/status.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonLambdaConfig.environment,
        VIDEOS_TABLE_NAME: videosTable.tableName,
      },
    });

    // Create Python dubbing handler with layer for dependencies
    const dubbingLayer = new lambda.LayerVersion(this, 'DubStudioDubbingLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/python'), {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'mkdir -p /asset-output/python/lib/python3.9/site-packages && pip install -r requirements.txt -t /asset-output/python/lib/python3.9/site-packages/'
          ],
        }
      }),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: 'Dependencies for dubbing handler',
    });

    const videoDubbingHandler = new lambda.Function(this, 'DubStudioVideoDubbingHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'dubbing.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/python')),
      layers: [dubbingLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        VIDEOS_TABLE_NAME: videosTable.tableName,
        BUCKET_NAME: videoBucket.bucketName,
        ELEVENLABS_SECRET_NAME: elevenLabsSecret.secretName,
      },
    });

    const videoProcessHandler = new lambda.Function(this, 'DubStudioVideoProcessHandler', {
      ...commonLambdaConfig,
      handler: 'videos/process.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/dist')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonLambdaConfig.environment,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        DUBBING_FUNCTION_NAME: videoDubbingHandler.functionName,
      },
    });

    // Grant necessary permissions
    videoBucket.grantReadWrite(videoUploadHandler);
    videoBucket.grantReadWrite(videoDubbingHandler);
    videosTable.grantReadWriteData(videoUploadHandler);
    videosTable.grantReadWriteData(videoStatusHandler);
    videosTable.grantReadWriteData(videoProcessHandler);
    videosTable.grantReadWriteData(videoDubbingHandler);
    elevenLabsSecret.grantRead(videoDubbingHandler);
    videoDubbingHandler.grantInvoke(videoProcessHandler);

    // Create API Gateway with CORS
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio video processing',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        maxAge: cdk.Duration.days(1),
      },
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // Create Cognito authorizer
    const apiAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'DubStudioApiAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Default method options with authorizer
    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['aws.cognito.signin.user.admin'],
    };

    // Create API resources and methods
    const apiV1 = api.root.addResource('v1');
    const apiVideos = apiV1.addResource('videos');
    const apiVideoId = apiVideos.addResource('{videoId}');
    const apiVideoStatus = apiVideoId.addResource('status');
    const apiVideoProcess = apiVideoId.addResource('process');

    // Add methods with proper CORS headers
    apiVideos.addMethod(
      'POST',
      new apigateway.LambdaIntegration(videoUploadHandler),
      defaultMethodOptions
    );

    apiVideoStatus.addMethod(
      'GET',
      new apigateway.LambdaIntegration(videoStatusHandler),
      defaultMethodOptions
    );

    apiVideoProcess.addMethod(
      'POST',
      new apigateway.LambdaIntegration(videoProcessHandler),
      defaultMethodOptions
    );

    // Output important values
    new cdk.CfnOutput(this, 'DubStudioUserPoolId', {
      value: userPool.userPoolId,
      description: 'The ID of the Cognito User Pool',
    });

    new cdk.CfnOutput(this, 'DubStudioUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'The ID of the Cognito User Pool Client',
    });

    new cdk.CfnOutput(this, 'DubStudioApiUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });

    new cdk.CfnOutput(this, 'DubStudioRegion', {
      value: this.region,
      description: 'The AWS Region',
    });
  }
} 