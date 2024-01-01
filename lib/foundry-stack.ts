import { Stack, Tags, App, CfnOutput, Duration } from 'aws-cdk-lib';
import { CfnGroup } from 'aws-cdk-lib/aws-resourcegroups';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, FargateTaskDefinition, LogDrivers, ContainerDefinition, ContainerImage, Secret as ecsSecret } from 'aws-cdk-lib/aws-ecs';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Distribution, SecurityPolicyProtocol, CachePolicy, OriginProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront'
import { LoadBalancerV2Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { ICoreStackProps } from '../bin/stack-config';


export class FoundryStack extends Stack {
  constructor(scope: App, id: string, props: ICoreStackProps) {
    super(scope, id, props);
    Tags.of(this).add('project', props.project);
    Tags.of(this).add('stage', props.stage);

    /** 
     * Resource Group
     *
     * @memberof ResourceGroup
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-resourcegroups-readme.html
     */
    new CfnGroup(this, `ResourceGroup`, {
      name: `${props.stage}-${props.project}`,
      resourceQuery: {
        type: 'TAG_FILTERS_1_0',
        query: {
          resourceTypeFilters: [
            "AWS::AllSupported"
          ],
          tagFilters: [
            {
              key: "project",
              values: [
                `${props.project}`
              ]
            },
            {
              key: "stage",
              values: [
                `${props.stage}`
              ]
            }
          ]
        }
      }
    });

    new CfnOutput(this, 'ResourceGroupName', {
      value: `${props.stage}-${props.project}`,
      description: 'Resource Group Name',
      exportName: `${props.stage}-${props.project}-resource-group`
    })

    /** 
     * Secret Manager
     *
     * @memberof SecretManager
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-secretsmanager-readme.html
     */
    const secret = Secret.fromSecretCompleteArn(this, "FoundrySecret", 'arn:aws:secretsmanager:us-east-2:334037273999:secret:foundry-data-YrCi56')

    /** 
     * VPC
     *
     * @memberof Ec2
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html
     */
    const vpc = new Vpc(this, 'Vpc', { maxAzs: 2 });

    /**
     * @memberof Efs
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-efs-readme.html
     */
    const fileSystem = new FileSystem(this, 'MyEfsFileSystem', {
      vpc,
      encrypted: true,
      lifecyclePolicy: LifecyclePolicy.AFTER_14_DAYS,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      throughputMode: ThroughputMode.BURSTING
    });

    fileSystem.addToResourcePolicy(
      new PolicyStatement({
        actions: ['elasticfilesystem:ClientMount'],
        principals: [new AnyPrincipal()],
        conditions: {
          Bool: {
            'elasticfilesystem:AccessedViaMountTarget': 'true'
          }
        }
      })
    )

    /**
    * @memberof Ecs
    * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
    */
    const cluster = new Cluster(this, 'DefaultEcsCluster', { vpc: vpc })

    /**
     * @memberof Ecs
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
     */
    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 4096,
      cpu: 2048,
      volumes: [
        {
          name: "efs",
          efsVolumeConfiguration: {
            fileSystemId: fileSystem.fileSystemId,
          }
        }
      ]
    });

    /**
     * @memberof Ecs
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
     */
    const containerDefinition = new ContainerDefinition(this, "ContainerDefinition", {
      containerName: "foundryvtt",
      image: ContainerImage.fromRegistry("felddy/foundryvtt:release"),
      taskDefinition,
      logging: LogDrivers.awsLogs({ streamPrefix: "foundryvtt" }),
      secrets: {
        FOUNDRY_USERNAME: ecsSecret.fromSecretsManager(secret, "foundry-username"),
        FOUNDRY_PASSWORD: ecsSecret.fromSecretsManager(secret, "foundryvtt-password"),
        FOUNDRY_ADMIN_KEY: ecsSecret.fromSecretsManager(secret, "foundryvtt-admin-key")
      }
    });

    containerDefinition.addMountPoints(
      {
        sourceVolume: "efs",
        containerPath: "/data",
        readOnly: false
      }
    )

    containerDefinition.addPortMappings({
      containerPort: 30000
    });

    /**
     * @memberof EcsPatterns
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html
     */
    const albFargateService = new ApplicationLoadBalancedFargateService(this, 'ECSFargate', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      publicLoadBalancer: true,
    });

    albFargateService.targetGroup.setAttribute('deregistration_delay.timeout_seconds', '30');
    albFargateService.targetGroup.configureHealthCheck({
      path: "/api/status",
      port: "30000",
      healthyHttpCodes: "200",
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 2,
      timeout: Duration.seconds(5),
      interval: Duration.seconds(10),
    });

    fileSystem.grantRootAccess(albFargateService.taskDefinition.taskRole.grantPrincipal);
    fileSystem.connections.allowDefaultPortFrom(albFargateService.service.connections);


    /**
     * @memberof CloudFront
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cdk-lib.CfnOutput.html
     */
    // const distribution = new Distribution(this, 'CloudFront', {
    //   comment: `The ${props.stage} Cloud Front Distribution for the ${props.project} service.`,
    //   minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    //   defaultBehavior: {
    //     cachePolicy: CachePolicy.CACHING_OPTIMIZED,
    //     origin: new LoadBalancerV2Origin(albFargateService.loadBalancer, {
    //       protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
    //       httpPort: 80
    //     })
    //   },
    // });

    // new CfnOutput(this, 'CloudFrontDomainName', {
    //   value: distribution.domainName,
    //   description: 'CloudFront Domain Name',
    //   exportName: `${props.stage}-${props.project}-cloudfront-domain-name`
    // })
  }
}