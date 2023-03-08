#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ServerlessMealPlanner } from "../lib/serverless-mealplanner-stack";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new ServerlessMealPlanner(app, ServerlessMealPlanner.name, {
  env,
});
