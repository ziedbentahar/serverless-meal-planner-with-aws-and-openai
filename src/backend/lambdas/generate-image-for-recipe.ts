import { OpenAIApi } from "openai";
import { getSecretValue } from "shared/secrets-provider";

const openai = new OpenAIApi();

export const handler = async (event: { recipeName: string }) => {
  const { recipeName } = event;

  const apiKey = await getSecretValue(process.env.OPEN_AI_API_SECRET_NAME);

  const response = await openai.createImage(
    {
      prompt: `${recipeName}`,
      n: 1,
      size: "512x512",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  const recipeImageUrl = response.data.data[0]?.url;

  return {
    statusCode: 200,
    recipeImageUrl,
    recipeName,
  };
};
