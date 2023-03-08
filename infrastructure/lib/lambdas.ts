import { Duration, NestedStack, NestedStackProps } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  Architecture,
  IFunction,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
const resolve = require("path").resolve;

interface LambdasProps extends NestedStackProps {
  applicationName: string;
  mediaBucket: IBucket;
  mediaUrl: string;
}

const AWSParametersAndSecretsLambdaExtension: {
  [region: string]: { LayerArn: string };
} = {
  "us-east-1": {
    LayerArn:
      "arn:aws:lambda:us-east-1:177933569100:layer:AWS-Parameters-and-Secrets-Lambda-Extension:2",
  },
  "us-east-2": {
    LayerArn:
      "arn:aws:lambda:us-east-2:590474943231:layer:AWS-Parameters-and-Secrets-Lambda-Extension:2",
  },
  "eu-west-1": {
    LayerArn:
      "arn:aws:lambda:eu-west-1:015030872274:layer:AWS-Parameters-and-Secrets-Lambda-Extension:2",
  },
  "eu-west-2": {
    LayerArn:
      "arn:aws:lambda:eu-west-2:133256977650:layer:AWS-Parameters-and-Secrets-Lambda-Extension:2",
  },
  "eu-west-3": {
    LayerArn:
      "arn:aws:lambda:eu-west-3:780235371811:layer:AWS-Parameters-and-Secrets-Lambda-Extension:2",
  },
};

const x = AWSParametersAndSecretsLambdaExtension["eu-west-2"].LayerArn;

export class Lambdas extends NestedStack {
  readonly receipeImageLambda: IFunction;
  readonly mealPlanRecipesLambda: IFunction;
  readonly uploadImageToStorageLambda: IFunction;
  readonly sendEmailLambda: IFunction;

  constructor(scope: Construct, id: string, props?: LambdasProps) {
    super(scope, id, props);

    const { applicationName, mediaBucket, mediaUrl } = props!;

    const secret = new Secret(this, "open-ai-api-key-secret", {
      secretName: "open-ai-api-key-secret",
    });

    const lambdaConfig = {
      memorySize: 512,
      timeout: Duration.seconds(60),
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.X86_64,
      logRetention: RetentionDays.THREE_DAYS,
      handler: "handler",
    };

    this.mealPlanRecipesLambda = new NodejsFunction(
      this,
      `generate-meal-plan-recipes`,
      {
        ...lambdaConfig,
        entry: resolve("../src/backend/lambdas/generate-meal-plan-recipes.ts"),
        functionName: `${applicationName}-generate-meal-plan-recipes`,
        environment: {
          OPEN_AI_API_SECRET_NAME: secret.secretName,
        },
        layers: [
          LayerVersion.fromLayerVersionArn(
            this,
            "secrets-extension-recipe-generator",
            AWSParametersAndSecretsLambdaExtension[this.region].LayerArn
          ),
        ],
      }
    );

    secret.grantRead(this.mealPlanRecipesLambda);

    this.receipeImageLambda = new NodejsFunction(
      this,
      `generate-image-for-recipe`,
      {
        ...lambdaConfig,
        entry: resolve("../src/backend/lambdas/generate-image-for-recipe.ts"),
        functionName: `${applicationName}-generate-image-for-recipe`,
        environment: {
          OPEN_AI_API_SECRET_NAME: secret.secretName,
        },
        layers: [
          LayerVersion.fromLayerVersionArn(
            this,
            "secrets-extension-image-generator",
            AWSParametersAndSecretsLambdaExtension[this.region].LayerArn
          ),
        ],
      }
    );

    secret.grantRead(this.receipeImageLambda);

    this.uploadImageToStorageLambda = new NodejsFunction(
      this,
      `upload-recipe-image-to-storage`,
      {
        ...lambdaConfig,
        entry: resolve(
          "../src/backend/lambdas/upload-recipe-image-to-storage.ts"
        ),
        functionName: `${applicationName}-upload-recipe-image-to-storage`,
        environment: {
          STORAGE_BUCKET_NAME: mediaBucket.bucketName,
        },
      }
    );

    mediaBucket.grantPut(this.uploadImageToStorageLambda);

    this.sendEmailLambda = new NodejsFunction(this, `send-meal-plan-email`, {
      ...lambdaConfig,
      entry: resolve("../src/backend/lambdas/send-meal-plan-email.ts"),
      functionName: `${applicationName}-send-meal-plan-email`,
      environment: {
        MEDIA_URL: mediaUrl,
      },
    });

    this.sendEmailLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ["ses:SendTemplatedEmail"],
        resources: ["*"],
        effect: Effect.ALLOW,
      })
    );
  }
}
