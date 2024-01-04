import { Stack, Tags, App, CfnOutput } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ICoreStackProps } from '../bin/stack-config';


export class NetworkStack extends Stack {
  constructor(scope: App, id: string, props: ICoreStackProps) {
    super(scope, id, props);
    Tags.of(this).add('project', props.project);
    Tags.of(this).add('stage', props.stage);

    const vpc = new Vpc(this, 'VPC', {
      maxAzs: 2,
    });

    new CfnOutput(this, 'VPCID', {
      value: vpc.vpcId,
      description: 'VPC ID',
      exportName: `${props.stage}-${props.project}-vpc-id`
    })

    new CfnOutput(this, 'VPCAvailabilityZones', {
      value: vpc.availabilityZones.toString(),
      description: 'VPC Availability Zones',
      exportName: `${props.stage}-${props.project}-vpc-azs`
    })

    new CfnOutput(this, 'VPCPublicSubnets', {
      value: vpc.publicSubnets.map((subnet) => subnet.subnetId).toString(),
      description: 'VPC Public Subnets',
      exportName: `${props.stage}-${props.project}-vpc-public-subnets`
    })
  }
}