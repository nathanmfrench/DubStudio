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

    const rawVideosBucket = new s3.Bucket(this, 'RawVideosBucket', {
      bucketName: `dubstudio-raw-videos-${accountId}-${env}`,
      versioned: false,
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
          'https://dubstudio.voxium.tech',
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
      }],
      lifecycleRules: [
        {
          expiration: Duration.days(1),
          prefix: 'uploads/',
          abortIncompleteMultipartUploadAfter: Duration.hours(24),
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const processedVideosBucket = new s3.Bucket(this, 'ProcessedVideosBucket', {
      bucketName: `dubstudio-processed-videos-${accountId}-${env}`,
      versioned: false,
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
          'https://dubstudio.voxium.tech',
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
      }],
      lifecycleRules: [
        {
          expiration: Duration.days(2),
          prefix: 'subtitled/',
        },
        {
          expiration: Duration.days(2),
          prefix: 'dubbed/',
        }
      ],
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development, change to RETAIN for production
      autoDeleteObjects: true, // For development, remove for production
    });

    // Create DynamoDB table for videos
    const videosTable = new dynamodb.Table(this, 'DubStudioVideosTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      timeToLiveAttribute: 'ttl', // Optional: for cleanup of old records
    });

    // Create DynamoDB table for jobs
    const jobsTable = new dynamodb.Table(this, 'DubStudioJobsTable', {
      tableName: `dubstudio-jobs-${accountId}-${env}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES // Enable streams for status tracking
    });

    // Add GSI for status queries
    jobsTable.addGlobalSecondaryIndex({
      indexName: 'status-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Add GSI for user's jobs by creation time
    jobsTable.addGlobalSecondaryIndex({
      indexName: 'user-jobs-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL
    });

    // Output the jobs table name
    new cdk.CfnOutput(this, 'JobsTableName', {
      value: jobsTable.tableName,
      description: 'Name of the jobs table'
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'DubStudioUserPool', {
      userPoolName: 'DubStudioUserPool',
      signInAliases: {
        username: false,
        email: true
      },
      autoVerify: { 
        email: true,
        phone: true 
      },
      standardAttributes: {
        email: { required: true, mutable: true },
        phoneNumber: { required: false, mutable: true }
      },
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_AND_PHONE_WITHOUT_MFA,
      removalPolicy: cdk.RemovalPolicy.DESTROY // Change to RETAIN for production
    });

    // Create Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'DubStudioUserPoolClient', {
      userPool,
      authFlows: {
        userSrp: true,
        userPassword: true,
        adminUserPassword: false,
        custom: false
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      enableTokenRevocation: true
    });

    const dubbywubbyLogGroup = new logs.LogGroup(this, 'DubbyWubbyLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY // Optional: auto-delete logs on stack deletion
    });
   
    // Common Lambda configuration
    const commonLambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      logGroup: dubbywubbyLogGroup,
      timeout: cdk.Duration.minutes(1),
      environment: {
        NODE_ENV: 'production',
        RAW_VIDEOS_BUCKET: rawVideosBucket.bucketName,
        PROCESSED_VIDEOS_BUCKET: processedVideosBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName,
        LOG_LEVEL: 'DEBUG'
      },
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    // Create Python Lambda layer for subtitle and dubbing
    const processingLayer = new lambda.LayerVersion(this, 'ProcessingLayer', {
      code: lambda.Code.fromAsset('lambda/layers/processing'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: 'Layer containing dependencies for video processing'
    });

    // Create Lambda functions
    const subtitleHandler = new lambda.Function(this, 'SubtitleFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'dist/handlers/videos/subtitle.handler',
      layers: [processingLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        NODE_ENV: 'production',
        RAW_VIDEOS_BUCKET: rawVideosBucket.bucketName,
        PROCESSED_VIDEOS_BUCKET: processedVideosBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName,
        LOG_LEVEL: 'DEBUG'
      },
    });

    const dubbingHandler = new lambda.Function(this, 'DubbingFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'dist/handlers/videos/dubbing.handler',
      layers: [processingLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        NODE_ENV: 'production',
        RAW_VIDEOS_BUCKET: rawVideosBucket.bucketName,
        PROCESSED_VIDEOS_BUCKET: processedVideosBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName,
        LOG_LEVEL: 'DEBUG',
        ELEVENLABS_SECRET_NAME: 'ELEVENLABS_API_KEY'
      },
    });

    // Grant the dubbing handler permission to read the secret
    dubbingHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [elevenLabsSecret.secretArn]
    }));

    const videoUploadHandler = new lambda.Function(this, 'VideoUploadFunction', {
      ...commonLambdaConfig,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'dist/handlers/videos/upload.handler',
    });

    const videoStatusHandler = new lambda.Function(this, 'VideoStatusFunction', {
      ...commonLambdaConfig,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'dist/handlers/videos/status.handler',
    });

    const videoProcessHandler = new lambda.Function(this, 'VideoProcessFunction', {
      ...commonLambdaConfig,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'dist/handlers/videos/process.handler',
      environment: {
        ...commonLambdaConfig.environment,
        SUBTITLE_FUNCTION: subtitleHandler.functionName,
        DUBBING_FUNCTION: dubbingHandler.functionName,
      },
    });

    // Grant Lambda functions access to jobs table
    jobsTable.grantReadWriteData(videoUploadHandler);
    jobsTable.grantReadWriteData(videoProcessHandler);
    jobsTable.grantReadWriteData(videoStatusHandler);
    jobsTable.grantReadData(subtitleHandler);
    jobsTable.grantReadData(dubbingHandler);

    // Grant S3 permissions
    rawVideosBucket.grantRead(subtitleHandler);
    rawVideosBucket.grantRead(dubbingHandler);
    processedVideosBucket.grantWrite(subtitleHandler);
    processedVideosBucket.grantWrite(dubbingHandler);

    // Grant Lambda invoke permissions
    subtitleHandler.grantInvoke(videoProcessHandler);
    dubbingHandler.grantInvoke(videoProcessHandler);

    // Grant necessary permissions for the upload handler
    videoUploadHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:PutObjectAcl',
        's3:GetObjectAcl'
      ],
      resources: [
        rawVideosBucket.arnForObjects('uploads/*')
      ]
    }));

    // Add bucket policy to allow presigned URL uploads
    const bucketPolicy = new s3.BucketPolicy(this, 'AllowPresignedUrlUploads', {
      bucket: rawVideosBucket
    });

    bucketPolicy.document.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ArnPrincipal(videoUploadHandler.role!.roleArn)],
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:GetBucketTagging'
      ],
      resources: [
        rawVideosBucket.arnForObjects('uploads/*'),
        rawVideosBucket.bucketArn
      ]
    }));

    // Grant DynamoDB permissions
    videosTable.grantWriteData(videoUploadHandler);

    // Add CORS rule for uploads
    rawVideosBucket.addCorsRule({
      allowedMethods: [
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.GET,
        s3.HttpMethods.HEAD
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
      resources: [rawVideosBucket.arnForObjects('uploads/*')]
    }));

    videoProcessHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [processedVideosBucket.arnForObjects('subtitled/*')]
    }));

    videoUploadHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:GetUser'],
      resources: [userPool.userPoolArn]
    }));

    // Create API Gateway with Cognito authorizer
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio video processing',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
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
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(dubbywubbyLogGroup)
      }
    });

    // Create Cognito authorizer
    const apiAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'DubStudioApiAuthorizer', {
      cognitoUserPools: [userPool]
    });

    // Default method options with Cognito authorizer
    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer: apiAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Create API resources and methods
    const apiV1 = api.root.addResource('v1');
    const apiVideos = apiV1.addResource('videos');
    const apiVideoId = apiVideos.addResource('{videoId}');
    const apiVideoStatus = apiVideoId.addResource('status');
    const apiVideoProcess = apiVideoId.addResource('process');

    // Add methods with proper CORS headers and scopes
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
    new cdk.CfnOutput(this, 'DubStudioApiUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });

    new cdk.CfnOutput(this, 'DubStudioRegion', {
      value: this.region,
      description: 'The AWS Region',
    });

    // Add outputs for the frontend
    new cdk.CfnOutput(this, 'RawVideosBucketName', {
      value: rawVideosBucket.bucketName,
      description: 'Name of the raw videos bucket'
    });

    new cdk.CfnOutput(this, 'ProcessedVideosBucketName', {
      value: processedVideosBucket.bucketName,
      description: 'Name of the processed videos bucket'
    });

  }
} 