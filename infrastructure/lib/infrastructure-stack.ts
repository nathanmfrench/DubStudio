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
        userSrp: false
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

    const commonBundlingConfig = {
      image: lambda.Runtime.NODEJS_18_X.bundlingImage,
      environment: {
        NODE_ENV: 'production'
      },
      command: [
        'bash', '-c',
        [
          'cp -r /asset-input/src/* /asset-output/',
          'cp -r /asset-input/node_modules /asset-output/',
          'cp /asset-input/package.json /asset-output/'
        ].join(' && ')
      ],
      workingDirectory: '/asset-input',
      user: 'root'
    };
    
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'videos/upload.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda'), {
        bundling: commonBundlingConfig
      }),
      environment: {
        BUCKET_NAME: bucket.bucketName,
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
        TABLE_NAME: videosTable.tableName
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
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
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });
    // Create IAM role for API Gateway execution
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayExecutionRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')
      ]
    });

    // Add explicit permission to invoke Lambda functions
    apiGatewayRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: [uploadHandler.functionArn, processHandler.functionArn, statusHandler.functionArn]
      })
    );

    // Grant permissions to Lambda functions
    bucket.grantReadWrite(uploadHandler);
    videosTable.grantReadWriteData(uploadHandler);
    videosTable.grantReadWriteData(processHandler);
    videosTable.grantReadWriteData(statusHandler);

    // Add CloudWatch Logs permissions
    uploadHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    processHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    statusHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    // Create CloudWatch log group for API Gateway
    const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: '/aws/apigateway/dubstudio',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Grant API Gateway permissions to write to the log group
    apiLogGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'DubStudioApi', {
      restApiName: 'DubStudio API',
      description: 'API for DubStudio video processing',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization']
      },
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true
      }
    });

    // Create authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'DubStudioAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(0)
    });

    // Default method options with authorizer
    const defaultMethodOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizationScopes: ['aws.cognito.signin.user.admin']
    };

    // Create API resources
    const v1 = api.root.addResource('v1');
    const videos = v1.addResource('videos');
    const videoProcess = v1.addResource('process');
    const videoStatus = v1.addResource('status');

    // Video endpoints (with authorizer)
    videos.addMethod('POST', 
      new apigateway.LambdaIntegration(uploadHandler, {
        proxy: true,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }]
      }), 
      {
        ...defaultMethodOptions,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }]
      }
    );

    videoProcess.addMethod('POST', 
      new apigateway.LambdaIntegration(processHandler, {
        proxy: true,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }]
      }), 
      {
        ...defaultMethodOptions,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }]
      }
    );

    videoStatus.addMethod('GET', 
      new apigateway.LambdaIntegration(statusHandler, {
        proxy: true,
        passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }]
      }), 
      {
        ...defaultMethodOptions,
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }]
      }
    );

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