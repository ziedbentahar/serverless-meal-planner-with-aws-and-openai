import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { MealPlannerApiGateway } from "./apigateway";
import { EmailService } from "./email-service";
import { Lambdas } from "./lambdas";
import { MediaStorage } from "./media-storage";
import { MealPlannerStateMachine } from "./state-machine";

export class ServerlessMealPlanner extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const applicationName = "serverless-meal-planner";

    const hostedZoneDomainName = this.node.tryGetContext(
      "hostedZoneDomainName"
    );

    const mediaStorage = new MediaStorage(this, "storage", {
      applicationName,
    });

    const emailService = new EmailService(this, "email-service", {
      applicationName,
      hostedZoneDomainName,
    });

    const lambdas = new Lambdas(this, "lambdas", {
      applicationName,
      mediaBucket: mediaStorage.bucket,
      mediaUrl: mediaStorage.mediaUrl,
      mailFrom: emailService.mailFrom,
    });

    const stateMachine = new MealPlannerStateMachine(this, "state-machine", {
      applicationName,
      mealPlanRecipesLambda: lambdas.mealPlanRecipesLambda,
      receipeImageLambda: lambdas.receipeImageLambda,
      uploadImageToStorageLambda: lambdas.uploadImageToStorageLambda,
      sendEmailLambda: lambdas.sendEmailLambda,
    });

    const apiGateway = new MealPlannerApiGateway(this, "apigateway", {
      applicationName,
      targetStateMachine: stateMachine.stateMachine,
    });
  }
}
