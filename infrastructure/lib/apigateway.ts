import { NestedStack, NestedStackProps } from "aws-cdk-lib";
import {
  AwsIntegration,
  JsonSchemaType,
  Model,
  PassthroughBehavior,
  RequestValidator,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import {
  Effect,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";

interface MealPlannerApiGatewayProps extends NestedStackProps {
  applicationName: string;
  targetStateMachine: StateMachine;
}

export class MealPlannerApiGateway extends NestedStack {
  constructor(
    scope: Construct,
    id: string,
    props?: MealPlannerApiGatewayProps
  ) {
    super(scope, id, props);

    const { applicationName, targetStateMachine } = props!;

    const apigatewayName = `${applicationName}-apigateway`;

    var api = new RestApi(this, "restapi", {
      restApiName: apigatewayName,
    });
    const resource = api.root.addResource("mealplan");

    const credentialsRole = new Role(this, "api-gateway-role", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });

    credentialsRole.attachInlinePolicy(
      new Policy(this, "api-gateway-policy", {
        statements: [
          new PolicyStatement({
            actions: ["states:StartExecution"],
            effect: Effect.ALLOW,
            resources: [targetStateMachine.stateMachineArn],
          }),
        ],
      })
    );

    const model = new Model(this, "mealplan-request-model-validator", {
      restApi: api,
      contentType: "application/json",
      modelName: "mealplanrequest",
      schema: {
        type: JsonSchemaType.OBJECT,
        required: ["email", "ingredients"],
        properties: {
          email: { type: JsonSchemaType.STRING, format: "email" },
          ingredients: {
            type: JsonSchemaType.ARRAY,
            minItems: 3,
            maxItems: 10,
            items: {
              type: JsonSchemaType.STRING,
            },
          },
        },
      },
    });

    resource.addMethod(
      "POST",
      new AwsIntegration({
        service: "states",
        action: "StartExecution",
        integrationHttpMethod: "POST",
        options: {
          credentialsRole,
          requestTemplates: {
            "application/json": JSON.stringify({
              stateMachineArn: targetStateMachine.stateMachineArn,
              input: "$util.escapeJavaScript($input.json('$'))",
            }),
          },
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": JSON.stringify({ success: true }),
              },
            },
          ],
          passthroughBehavior: PassthroughBehavior.NEVER,
        },
      }),
      {
        methodResponses: [{ statusCode: "200" }],
        requestValidator: new RequestValidator(this, "request-validation", {
          restApi: api,
          validateRequestBody: true,
          requestValidatorName: "body-validator",
        }),
        requestModels: {
          "application/json": model,
        },
      }
    );
  }
}
