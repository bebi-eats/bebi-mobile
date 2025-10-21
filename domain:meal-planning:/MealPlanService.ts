// domain/meal-planning/MealPlanService.ts
import { Food, FoodLog, MealPlan } from '../../types';

export class MealPlanService {
  async getMealPlansForDay(accountId: string, babyId: string, yyyyMmDd: string): Promise<MealPlan[]> {
    // return 3 meals + optional snack; planned_foods with { food, logged? }
    return [];
  }

  async createMeal(accountId: string, babyId: string, yyyyMmDd: string, mealType: 'breakfast'|'lunch'|'dinner'|'snack', idempotencyKey: string):
    Promise<{ ok: boolean; meal?: MealPlan }> {
    return { ok: true, meal: { id: 'new', date: yyyyMmDd, meal_type: mealType, planned_foods: [] } as MealPlan };
  }

  async removeFoodFromMeal(mealId: string, foodId: string): Promise<boolean> {
    return true;
  }

  async markMealAsSkipped(mealId: string): Promise<boolean> {
    return true;
  }

  async updateMealFoods(mealId: string, foods: Food[]): Promise<boolean> {
    return true;
  }

  async logMeal(mealId: string, logs: FoodLog[], notes: string, markComplete: boolean, idempotencyKey: string): Promise<boolean> {
    return true;
  }

  async trackFoodsForAchievements(babyId: string, foods: Food[], event: 'planned'|'logged'): Promise<void> {
    // noop for MVP; console.log is fine
  }
}
