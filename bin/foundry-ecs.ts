#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { coreStackProps } from './stack-config';
import { FoundryEcsStack } from '../lib/foundry-ecs-stack';

const app = new cdk.App();
const { stage, project } = coreStackProps;

new FoundryEcsStack(app, `${stage}-${project}Stack`, {
  description: 'Foundry ECS Stack',
  ...coreStackProps
});