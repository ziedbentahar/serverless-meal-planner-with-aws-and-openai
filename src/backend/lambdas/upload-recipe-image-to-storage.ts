import { S3 } from "aws-sdk";
import axios from "axios";
import slugify from "slugify";

const s3 = new S3({ region: process.env.AWS_REGION });

export const handler = async (event: {
  recipeName: string;
  recipeImageUrl: string;
}) => {
  const { recipeImageUrl, recipeName } = event;

  const { data } = await axios.get(recipeImageUrl, { responseType: "stream" });
  const mediaIdentifier = slugify(recipeName, {
    replacement: "-",
    trim: true,
    lower: true,
  });

  await s3
    .upload({
      Bucket: process.env.STORAGE_BUCKET_NAME,
      Key: `images/${mediaIdentifier}`,
      ContentType: "image/jpeg",
      Body: data,
    })
    .promise();

  return {
    statusCode: 200,
    mediaData: {
      mediaIdentifier,
      recipeName,
    },
  };
};
