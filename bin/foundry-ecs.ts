#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { coreStackProps } from './stack-config';
import { FoundryStack } from '../lib/foundry-stack';

const app = new cdk.App();
const { stage, project } = coreStackProps;

new FoundryStack(app, `${stage}-${project}Stack`, {
  description: 'Foundry VTT on ECS',
  ...coreStackProps
})