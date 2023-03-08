import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import {
  Fail,
  LogLevel,
  Map,
  Pass,
  StateMachine,
  Succeed,
} from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

interface StateMachineProps extends NestedStackProps {
  applicationName: string;
  receipeImageLambda: IFunction;
  mealPlanRecipesLambda: IFunction;
  uploadImageToStorageLambda: IFunction;
  sendEmailLambda: IFunction;
}

export class MealPlannerStateMachine extends NestedStack {
  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props?: StateMachineProps) {
    super(scope, id, props);

    const {
      applicationName,
      mealPlanRecipesLambda,
      receipeImageLambda,
      uploadImageToStorageLambda,
      sendEmailLambda,
    } = props!;

    const failState = new Fail(this, "fail");
    const successState = new Succeed(this, "success");

    const definition = new LambdaInvoke(this, "generate-meal-plan", {
      lambdaFunction: mealPlanRecipesLambda,
      retryOnServiceExceptions: true,
    })
      .addCatch(failState)
      .next(
        new Map(this, "generate-recipe-images", {
          itemsPath: "$.Payload.mealPlan",
          resultPath: "$.taskresult",
        })
          .iterator(
            new LambdaInvoke(this, "generate-recipe-image", {
              lambdaFunction: receipeImageLambda,
              retryOnServiceExceptions: true,
            }).next(
              new LambdaInvoke(this, "upload-recipe-image-to-storage", {
                lambdaFunction: uploadImageToStorageLambda,
                inputPath: "$.Payload",
              })
            )
          )
          .addCatch(failState)
      )
      .next(
        new Pass(this, "transform-result", {
          parameters: {
            ["mailTo.$"]: "$.Payload.mailTo",
            ["mealPlan.$"]: "$.Payload.mealPlan",
            ["media.$"]: "$.taskresult[*].Payload.mediaData",
          },
        })
      )
      .next(
        new LambdaInvoke(this, "send-meal-plan-email", {
          lambdaFunction: sendEmailLambda,
        }).addCatch(failState)
      )
      .next(successState);

    this.stateMachine = new StateMachine(
      this,
      `${applicationName}-state-machine`,
      {
        definition,
        logs: {
          destination: new LogGroup(this, "step-function-log-group", {
            retention: RetentionDays.THREE_DAYS,
          }),
          includeExecutionData: true,
          level: LogLevel.ERROR,
        },
      }
    );
  }
}
