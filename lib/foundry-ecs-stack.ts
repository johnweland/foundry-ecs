import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICoreStackProps } from '../bin/stack-config';
import * as resourceGroup from 'aws-cdk-lib/aws-resourcegroups';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";

export class FoundryEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ICoreStackProps) {
    super(scope, id, props);
    cdk.Tags.of(this).add('project', props.project);
    cdk.Tags.of(this).add('stage', props.stage);

    /** 
     * Resource Group
     *
     * @memberof FoundryEcsStack
     * @type {resourceGroup.CfnGroup}
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-resourcegroups-readme.html
     */
    new resourceGroup.CfnGroup(this, `ResourceGroup`, {
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

    /** 
     *
     * @memberof FoundryEcsStack
     * @type {cdk.CfnOutput}
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cdk-lib.CfnOutput.html 
     */
    new cdk.CfnOutput(this, 'ResourceGroupName', {
      value: `${props.stage}-${props.project}`,
      description: 'Resource Group Name',
      exportName: `${props.stage}-${props.project}-resource-group`
    })

    /** 
     * VPC
     *
     * @memberof FoundryEcsStack
     * @type {ec2.Vpc}
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html
     */
    const vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 3 // Default is all AZs in region
    });


    /** 
     * ECS Cluster
     *
     * @memberof FoundryEcsStack
     * @type {ecs.Cluster}
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-readme.html
     */
    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc: vpc
    });

    /** 
     * ECS Fargate Service
     *
     * @memberof FoundryEcsStack
     * @type {ecs_patterns.ApplicationLoadBalancedFargateService}
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ecs-patterns-readme.html
     */
    new ecs_patterns.ApplicationLoadBalancedFargateService(this, "Service", {
      cluster: cluster, // Required
      cpu: 512, // Default is 256
      desiredCount: 6, // Default is 1
      taskImageOptions: { image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample") },
      memoryLimitMiB: 2048, // Default is 512
      publicLoadBalancer: true // Default is true
    });
  }
}
