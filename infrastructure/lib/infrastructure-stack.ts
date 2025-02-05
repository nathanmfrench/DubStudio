import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { truncate } from 'fs/promises';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const env = process.env.CDK_ENV || 'dev';
    const accountId = process.env.CDK_ACCOUNT_ID; // Your AWS account ID

    // Import the existing ElevenLabs API key secret
    const elevenLabsSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 
      'DubStudioElevenLabsSecret', 
      'ELEVENLABS_API_KEY'
    );

    // Create S3 bucket for video uploads with proper CORS
    const bucket = new s3.Bucket(this, 'DubStudioStorage', {
      bucketName: `dubstudio-videos-${accountId}-${env}`,
      versioned: true,
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
          s3.HttpMethods.DELETE,
        ],
        allowedOrigins: [
          'http://localhost:19000',
          'http://localhost:19001',
          'exp://localhost:19000',
          'exp://localhost:19001',
        ],
        allowedHeaders: ['*'],
        exposedHeaders: [
          'ETag',
          'x-amz-server-side-encryption',
          'x-amz-request-id',
          'x-amz-id-2',
          'Content-Type',
          'Content-Length'
        ],
      }],
      lifecycleRules: [
        {
          expiration: Duration.days(30),
          prefix: 'raw/',
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true
    });

    const rawBucket = new s3.Bucket(this, 'RawVideosBucket', {
      bucketName: `dubstudio-raw-videos-${accountId}-${env}`,
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
        ],
        allowedOrigins: [
          'http://localhost:19000',
          'http://localhost:19001',
          'exp://localhost:19000',
          'exp://localhost:19001',
        ],
        allowedHeaders: ['*'],
        exposedHeaders: [
          'ETag',
          'x-amz-server-side-encryption',
          'x-amz-request-id',
          'x-amz-id-2',
          'Content-Type',
          'Content-Length'
        ],
      }],
      lifecycleRules: [
        {
          expiration: Duration.days(30),
          prefix: 'raw/',
          abortIncompleteMultipartUploadAfter: Duration.days(1),
        }
      ],
      versioned: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true
    });

    const processedBucket = new s3.Bucket(this, 'ProcessedVideosBucket', {
      bucketName: `dubstudio-processed-videos-${accountId}-${env}`,
      cors: [{
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
        ],
        allowedOrigins: [
          'http://localhost:19000',
          'http://localhost:19001',
          'exp://localhost:19000',
          'exp://localhost:19001',
        ],
        allowedHeaders: ['*'],
        exposedHeaders: [
          'ETag',
          'x-amz-server-side-encryption',
          'x-amz-request-id',
          'x-amz-id-2',
          'Content-Type',
          'Content-Length'
        ],
      }],
      lifecycleRules: [{
        expiration: Duration.days(30),
        prefix: 'videos/'
      }],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true
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
      userPoolName: 'DubStudioUsers',
      signInAliases: {
        username: false,
        email: true
      },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false }
      },
      selfSignUpEnabled: true,
      customAttributes: {
        tier: new cognito.StringAttribute({ mutable: true }),
        credits: new cognito.NumberAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Add domain to user pool
    const domain = userPool.addDomain('DubStudioAuthDomain', {
      cognitoDomain: {
        domainPrefix: 'dubstudio-auth'
      }
    });

    // Create a simple user pool client without custom scopes
    const userPoolClient = new cognito.UserPoolClient(this, 'DubStudioUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true,
        adminUserPassword: false,
        userPassword: false,
        custom: false
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: [
          'exp://localhost:19000/--/*',
          'dubstudio://*'
        ],
        logoutUrls: [
          'exp://localhost:19000/--/*',
          'dubstudio://*'
        ]
      },
      preventUserExistenceErrors: true,
      generateSecret: false
    });

    const exampleLambdaLogGroup = new logs.LogGroup(this, 'ExampleLambdaLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY // Optional: auto-delete logs on stack deletion
    });
   
    // Common Lambda configuration
    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      logGroup: exampleLambdaLogGroup,
      environment: {
        NODE_ENV: 'production',
        BUCKET_NAME: bucket.bucketName,
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
        BUCKET_NAME: bucket.bucketName,
        ELEVENLABS_SECRET_NAME: elevenLabsSecret.secretName,
      },
    });

    // 1. Define subtitle handler FIRST
    const subtitleHandler = new lambda.Function(this, 'DubStudioSubtitleHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'subtitles.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/python')),
      layers: [dubbingLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008,
      environment: {
        VIDEOS_TABLE_NAME: videosTable.tableName,
        BUCKET_NAME: bucket.bucketName, 
      },
    });

    // 2. THEN define process handler
    const videoProcessHandler = new lambda.Function(this, 'DubStudioVideoProcessHandler', {
      ...commonLambdaConfig,
      handler: 'dist/videos/process.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonLambdaConfig.environment,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        DUBBING_FUNCTION_NAME: videoDubbingHandler.functionName,
        SUBTITLE_FUNCTION_NAME: subtitleHandler.functionName
      },
    });

    // 3. Add invocation permission
    videoDubbingHandler.grantInvoke(videoProcessHandler);
    subtitleHandler.grantInvoke(videoProcessHandler) // ✅ Allows process to trigger subtitle
    // Grant necessary permissions
    bucket.grantReadWrite(videoUploadHandler);
    bucket.grantReadWrite(videoDubbingHandler);
    videosTable.grantReadWriteData(videoUploadHandler);
    videosTable.grantReadWriteData(videoStatusHandler);
    videosTable.grantReadWriteData(videoProcessHandler);
    videosTable.grantReadWriteData(videoDubbingHandler);
    elevenLabsSecret.grantRead(videoDubbingHandler);
    bucket.grantReadWrite(subtitleHandler);
    videosTable.grantReadWriteData(subtitleHandler);

    // Add explicit permissions for presigned URL generation
    videoUploadHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:PutObjectAcl',
        's3:GetObjectAcl',
        's3:ListBucket'
      ],
      resources: [
        bucket.arnForObjects('*'),
        bucket.bucketArn
      ]
    }));

    // Add bucket policy to allow presigned URL uploads
    const bucketPolicy = new s3.BucketPolicy(this, 'AllowPresignedUrlUploads', {
      bucket: bucket
    });

    bucketPolicy.document.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ArnPrincipal(videoUploadHandler.role!.roleArn)],
      actions: [
        's3:PutObject',
        's3:GetObject'
      ],
      resources: [bucket.arnForObjects('*')]
    }));

    // Add CORS rule specifically for presigned URLs
    bucket.addCorsRule({
      allowedMethods: [
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.GET
      ],
      allowedOrigins: [
        'http://localhost:19000',
        'http://localhost:19001',
        'exp://localhost:19000',
        'exp://localhost:19001',
        'dubstudio://*'
      ],
      allowedHeaders: ['*'],
      exposedHeaders: [
        'ETag',
        'x-amz-server-side-encryption',
        'x-amz-request-id',
        'x-amz-id-2',
        'Content-Type',
        'Content-Length'
      ],
      maxAge: 3600
    });

    videoProcessHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:DeleteObject'],
      resources: [rawBucket.arnForObjects('uploads/*')]
    }));

    videoProcessHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [processedBucket.arnForObjects('videos/*')]
    }));

    videoUploadHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:GetUser'],
      resources: [userPool.userPoolArn]
    }));

    // Create API Gateway with CORS
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio video processing',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // Restrict in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ],
        maxAge: cdk.Duration.days(1)
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

    // Add explicit authorizer scopes for API Gateway
    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['openid', 'email', 'profile']
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

    // After creating the authorizer
    console.log('Cognito Authorizer ID:', apiAuthorizer.authorizerId);

    // When adding methods
    console.log(`Configuring POST /v1/videos with auth:`, {
      authType: 'COGNITO', 
      authorizerId: apiAuthorizer.authorizerId,
      userPoolArn: userPool.userPoolArn
    });

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