import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import * as path from 'path';
import * as logs from 'aws-cdk-lib/aws-logs';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the ElevenLabs API key parameter
    const elevenLabsApiKey = new cdk.CfnParameter(this, 'ElevenLabsApiKey', {
      type: 'String',
      description: 'API key for ElevenLabs',
      noEcho: true // This ensures the key is not shown in logs
    });

    // Create VPC
    const vpc = new ec2.Vpc(this, 'DubStudioVPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        }
      ],
    });

    // Create VPC Endpoints
    const apiEndpoint = vpc.addInterfaceEndpoint('ApiGatewayEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
    });

    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // Add VPC Endpoints for SSM
    vpc.addInterfaceEndpoint('SSMEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
    });

    vpc.addInterfaceEndpoint('SSMMessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
    });

    vpc.addInterfaceEndpoint('EC2MessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
    });

    // Create security group for the EC2 instance
    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'TestInstanceSecurityGroup', {
      vpc,
      description: 'Security group for test EC2 instance',
      allowAllOutbound: true,
    });

    // Allow SSH access from your IP
    ec2SecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // Create the EC2 instance
    const testInstance = new ec2.Instance(this, 'TestInstance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cachedInContext: false,
      }),
      securityGroup: ec2SecurityGroup,
      keyName: 'dubstudio-test-key',
      role: new iam.Role(this, 'TestInstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess'),
        ],
        inlinePolicies: {
          'CognitoAccess': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'cognito-idp:AdminConfirmSignUp',
                  'cognito-idp:AdminInitiateAuth',
                  'cognito-idp:InitiateAuth'
                ],
                resources: ['*']
              })
            ]
          })
        }
      }),
    });

    // Output the instance ID
    new cdk.CfnOutput(this, 'TestInstanceId', {
      value: testInstance.instanceId,
      description: 'ID of the test EC2 instance',
    });

    // Output the instance's private IP
    new cdk.CfnOutput(this, 'TestInstancePrivateIp', {
      value: testInstance.instancePrivateIp,
      description: 'Private IP of the test EC2 instance',
    });

    // Create S3 bucket for video uploads
    const uploadBucket = new s3.Bucket(this, 'VideoUploadBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      autoDeleteObjects: true, // For development only
    });

    // Create DynamoDB table for videos
    const videosTable = new dynamodb.Table(this, 'VideosTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'videoId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
    });

    // Create Cognito User Pool (if not using existing one)
    const userPool = new cognito.UserPool(this, 'DubStudioUserPool', {
      userPoolName: 'dubstudio-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'DubStudioUserPoolClient', {
      userPool,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        custom: true,
        userSrp: true
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
      },
      preventUserExistenceErrors: true
    });

    // Create IAM role for API Gateway CloudWatch logging
    const apiGatewayLoggingRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ]
    });

    // Create REST API
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio application',
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      },
      cloudWatchRole: true, // Let API Gateway create and use its own role
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(new logs.LogGroup(this, 'ApiGatewayAccessLogs')),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true
        })
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'Access-Control-Allow-Origin',
          'Access-Control-Allow-Headers',
          'Access-Control-Allow-Methods',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1)
      },
    });

    // Create Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'DubStudioAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5)
    });

    // Create API resources
    const v1 = api.root.addResource('v1');

    // Auth endpoints
    const auth = v1.addResource('auth');
    const refreshToken = auth.addResource('refresh-token');

    // User endpoints
    const users = v1.addResource('users');
    const userId = users.addResource('{userId}');
    const userAnalytics = userId.addResource('analytics');
    const userAccounts = userId.addResource('accounts');

    // Video endpoints
    const videos = v1.addResource('videos');
    const videoId = videos.addResource('{videoId}');
    const videoProcess = videoId.addResource('process');
    const videoStatus = videoId.addResource('status');

    // Account endpoints
    const accounts = v1.addResource('accounts');
    const accountId = accounts.addResource('{accountId}');

    // Analytics endpoints
    const analytics = v1.addResource('analytics');
    const analyticsSummary = analytics.addResource('summary');
    const analyticsAccounts = analytics.addResource('accounts');
    const analyticsVideos = analytics.addResource('videos');

    const commonBundlingConfig = {
      image: lambda.Runtime.NODEJS_18_X.bundlingImage,
      environment: {
        NODE_ENV: 'production',
      },
      command: [
        'bash', '-c',
        [
          'cp -r /asset-input/dist/videos/* /asset-output/',
          'cp -r /asset-input/node_modules /asset-output/',
          'cp /asset-input/package.json /asset-output/'
        ].join(' && ')
      ],
      workingDirectory: '/asset-input',
      user: 'root'
    };

    // Create Lambda functions
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/upload.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig,
      }),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        BUCKET_NAME: uploadBucket.bucketName,
        PROCESS_FUNCTION_NAME: `${this.stackName}-ProcessHandler`,
      },
    });

    // Grant DynamoDB permissions to upload handler
    videosTable.grantWriteData(uploadHandler);

    const processHandler = new lambda.Function(this, 'ProcessHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/process.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig
      }),
      environment: {
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        DUBBING_FUNCTION_NAME: `${this.stackName}-DubbingHandler`,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'lambda:InvokeFunction'
          ],
          resources: ['*']
        })
      ]
    });

    // Create Python dubbing function
    const dubbingHandler = new lambda.Function(this, 'DubbingHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'dubbing.handler',
      code: lambda.Code.fromAsset('lambda/python', {
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && ' +
            'cp dubbing.py /asset-output/'
          ],
          user: 'root'
        }
      }),
      environment: {
        UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
        VIDEOS_TABLE_NAME: videosTable.tableName,
        ELEVENLABS_API_KEY: elevenLabsApiKey.valueAsString
      },
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
    });

    // Grant permissions to dubbing handler
    uploadBucket.grantReadWrite(dubbingHandler);
    videosTable.grantReadWriteData(dubbingHandler);

    // Update process handler's Lambda invoke permission to target specific function
    processHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [dubbingHandler.functionArn]
      })
    );

    const statusHandler = new lambda.Function(this, 'StatusHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/status.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig
      }),
      environment: {
        VIDEOS_TABLE_NAME: videosTable.tableName,
      },
    });

    // Grant permissions
    uploadBucket.grantReadWrite(uploadHandler);
    uploadBucket.grantRead(processHandler);
    videosTable.grantReadWriteData(processHandler);
    videosTable.grantReadData(statusHandler);

    // Connect Lambda functions to API endpoints
    videos.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: [
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.PROFILE.scopeName
      ]
    });

    videoProcess.addMethod('POST', new apigateway.LambdaIntegration(processHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: [
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.PROFILE.scopeName
      ]
    });

    videoStatus.addMethod('GET', new apigateway.LambdaIntegration(statusHandler), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: [
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.PROFILE.scopeName
      ]
    });

    // Add methods for other endpoints
    auth.addMethod('POST', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }));

    refreshToken.addMethod('POST', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }));

    users.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    userAnalytics.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    analyticsSummary.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Output values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'The ID of the Cognito User Pool',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'The ID of the Cognito User Pool Client',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'The URL of the API Gateway',
    });
  }
} 