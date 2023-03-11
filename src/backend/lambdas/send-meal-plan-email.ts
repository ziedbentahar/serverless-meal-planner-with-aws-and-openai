import { Context } from "aws-lambda";
import { SES } from "aws-sdk";
import { SendTemplatedEmailRequest } from "aws-sdk/clients/ses";
import { GeneratedMealPlan } from "types";

const ses = new SES({ region: process.env.AWS_REGION });

export const handler = async (event: GeneratedMealPlan, context: Context) => {
  const mealPlan = event.mealPlan.map((meal) => {
    return {
      day: meal.day,
      recipeName: meal.recipeName,
      ingredients: meal.recipeIngredients?.join(", "),
      instructions: meal.recipeInstructions.join(" "),
      media: `${process.env.MEDIA_URL}/${
        event.media.find((m) => m.recipeName === meal.recipeName)!
          .mediaIdentifier
      }`,
    };
  });

  const emailParams: SendTemplatedEmailRequest = {
    Destination: {
      ToAddresses: [event.mailTo],
    },
    Source: process.env.SOURCE_EMAIL,
    Template: "meal-plan",
    TemplateData: JSON.stringify({
      mealPlan,
    }),
  };

  await ses.sendTemplatedEmail(emailParams).promise();

  return {
    statusCode: 200,
  };
};
