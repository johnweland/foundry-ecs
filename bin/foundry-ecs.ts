#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { coreStackProps } from './stack-config';
import { NetworkStack } from '../lib/network-stack';
import { FilesystemStack } from '../lib/filesystem-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();
const { stage, project } = coreStackProps;

new NetworkStack(app, `${stage}-${project}NetworkStack`, {
  description: 'VPC',
  ...coreStackProps
})

new FilesystemStack(app, `${stage}-${project}FilesystemStack`, {
  description: 'EFS',
  ...coreStackProps
})

new EcsStack(app, `${stage}-${project}EcsStack`, {
  description: 'Foundry VTT on ECS',
  ...coreStackProps
})