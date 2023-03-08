export type GeneratedMealPlan = {
  media: Media[];
  mealPlan: MealPlan[];
  mailTo: string;
};

export type MealPlan = {
  day: string;
  recipeName: string;
  recipeIngredients: string[];
  recipeInstructions: string[];
};

export type Media = {
  mediaIdentifier: string;
  recipeName: string;
};

export type MealPlanRequest = {
  email: string;
  dietaryRestrictions: string[];
  ingredients: string[];
};
