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
    const bucket = new s3.Bucket(this, 'VideoUploadBucket', {
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

    // Create Cognito User Pool Client
    const userPoolClient = userPool.addClient('DubStudioUserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
      generateSecret: false,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ]
    });

    // Create IAM role for API Gateway CloudWatch logging
    const apiGatewayLoggingRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ]
    });

    // Common bundling configuration for Lambda functions
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
        bundling: commonBundlingConfig
      }),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        PROCESS_FUNCTION_NAME: `${this.stackName}-ProcessHandler`,
        TABLE_NAME: videosTable.tableName
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });

    const processHandler = new lambda.Function(this, 'ProcessHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/process.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig
      }),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: videosTable.tableName,
        DUBBING_FUNCTION_NAME: `${this.stackName}-DubbingHandler`
      },
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['lambda:InvokeFunction'],
          resources: ['*']
        })
      ]
    });

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
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: videosTable.tableName,
        ELEVENLABS_API_KEY: elevenLabsApiKey.valueAsString
      },
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024
    });

    const statusHandler = new lambda.Function(this, 'StatusHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/status.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig
      }),
      environment: {
        TABLE_NAME: videosTable.tableName
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256
    });

    // Grant permissions
    bucket.grantReadWrite(uploadHandler);
    bucket.grantReadWrite(processHandler);
    bucket.grantReadWrite(dubbingHandler);
    videosTable.grantReadWriteData(uploadHandler);
    videosTable.grantReadWriteData(processHandler);
    videosTable.grantReadWriteData(dubbingHandler);
    videosTable.grantReadData(statusHandler);

    // Update process handler's Lambda invoke permission to target specific function
    processHandler.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [dubbingHandler.functionArn]
      })
    );

    // Create REST API
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio application',
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
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
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1)
      },
      deployOptions: {
        stageName: 'prod',
        description: 'Production stage'
      }
    });

    // Create Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'DubStudioAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Default authorization for protected endpoints
    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: [
        cognito.OAuthScope.OPENID.scopeName,
        cognito.OAuthScope.EMAIL.scopeName,
        cognito.OAuthScope.PROFILE.scopeName
      ]
    };

    // Create API resources
    const v1 = api.root.addResource('v1');

    // Video endpoints (with authorizer)
    const videos = v1.addResource('videos');
    const videoId = videos.addResource('{videoId}');
    const videoProcess = videoId.addResource('process');
    const videoStatus = videoId.addResource('status');

    // Add methods with authorizer
    videos.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler), defaultMethodOptions);
    videoProcess.addMethod('POST', new apigateway.LambdaIntegration(processHandler), defaultMethodOptions);
    videoStatus.addMethod('GET', new apigateway.LambdaIntegration(statusHandler), defaultMethodOptions);

    // Public endpoints (no authorizer)
    const auth = v1.addResource('auth');
    const refreshToken = auth.addResource('refresh-token');

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

    // Protected endpoints (with authorizer)
    const users = v1.addResource('users');
    const userId = users.addResource('{userId}');
    const userAnalytics = userId.addResource('analytics');
    const userAccounts = userId.addResource('accounts');

    users.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), defaultMethodOptions);

    userAnalytics.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), defaultMethodOptions);

    // Analytics endpoints (with authorizer)
    const analytics = v1.addResource('analytics');
    const analyticsSummary = analytics.addResource('summary');

    analyticsSummary.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
      }],
      requestTemplates: {
        'application/json': '{ "statusCode": 200 }',
      },
    }), defaultMethodOptions);

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