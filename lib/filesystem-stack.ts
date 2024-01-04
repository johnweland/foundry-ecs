import { Stack, Tags, App, CfnOutput, Fn } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { FileSystem, LifecyclePolicy, PerformanceMode, ThroughputMode } from 'aws-cdk-lib/aws-efs';
import { PolicyStatement, AnyPrincipal } from 'aws-cdk-lib/aws-iam';
import { ICoreStackProps } from '../bin/stack-config';


export class FilesystemStack extends Stack {
  constructor(scope: App, id: string, props: ICoreStackProps) {
    super(scope, id, props);
    Tags.of(this).add('project', props.project);
    Tags.of(this).add('stage', props.stage);

    const vpc = Vpc.fromVpcAttributes(this, 'VPC', {
      vpcId: Fn.importValue(`${props.stage}-${props.project}-vpc-id`),
      availabilityZones: Fn.split(',', Fn.importValue(`${props.stage}-${props.project}-vpc-azs`)),
      publicSubnetIds: Fn.split(',', Fn.importValue(`${props.stage}-${props.project}-vpc-public-subnets`)),
    });

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
    new CfnOutput(this, 'FileSystemId', {
      value: fileSystem.fileSystemId,
      description: 'EFS FileSystem ID',
      exportName: `${props.stage}-${props.project}-efs-id`
    })

    new CfnOutput(this, 'FileSystemSG', {
      value: fileSystem.connections.securityGroups[0].securityGroupId,
      description: 'EFS FileSystem Security Group',
      exportName: `${props.stage}-${props.project}-efs-sg`
    })
  }
}