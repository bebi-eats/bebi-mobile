// src/domain/meal-planning/MealPlanService.stub.ts

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface PlannedFood {
  food: { id: string; name: string; emoji: string };
  logged?: boolean;
}

export interface MealPlan {
  id: string;
  baby_id: string;
  date: string;
  meal_type: MealType;
  planned_foods: PlannedFood[];
  status?: 'planned' | 'partial' | 'complete';
  is_onboarding_demo?: boolean;
  display_order?: number;
  served_time?: string;
  created_at: string;
}

export interface CopySelection {
  sourceMealId: string;
  destDate: string;
  destMealType: MealType;
}

// In-memory storage
const meals: MealPlan[] = [];
let mealIdCounter = 1;

export class MealPlanServiceStub {
  async getMealPlansForWeek(babyId: string, weekKey: string): Promise<MealPlan[]> {
    console.log('📥 getMealPlansForWeek:', { babyId, weekKey });
    
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const filtered = meals.filter(m => {
      const mealDate = new Date(m.date);
      return m.baby_id === babyId && 
             mealDate >= monday && 
             mealDate <= sunday;
    });
    
    console.log('📤 Found meals:', filtered.length);
    return filtered;
  }

  async createMeal(
    accountId: string, 
    babyId: string, 
    date: string, 
    mealType: MealType, 
    idempotencyKey: string
  ): Promise<{ ok: boolean; meal?: MealPlan }> {
    console.log('➕ createMeal:', { accountId, babyId, date, mealType });
    
    const existing = meals.find(m => 
      m.baby_id === babyId && 
      m.date === date && 
      m.meal_type === mealType
    );
    
    if (existing) {
      console.log('✅ Meal already exists (idempotent)');
      return { ok: true, meal: existing };
    }

    const newMeal: MealPlan = {
      id: `meal_${mealIdCounter++}`,
      baby_id: babyId,
      date,
      meal_type: mealType,
      planned_foods: [],
      status: 'planned',
      display_order: { breakfast: 1, lunch: 2, dinner: 3, snack: 4 }[mealType],
      created_at: new Date().toISOString(),
    };

    meals.push(newMeal);
    console.log('✅ Created meal:', newMeal.id);
    return { ok: true, meal: newMeal };
  }

  async removeFoodFromMeal(mealId: string, foodId: string): Promise<boolean> {
    console.log('🗑️ removeFoodFromMeal:', { mealId, foodId });
    
    const meal = meals.find(m => m.id === mealId);
    if (!meal) {
      console.log('❌ Meal not found');
      return false;
    }

    meal.planned_foods = meal.planned_foods.filter(p => p.food.id !== foodId);
    console.log('✅ Removed food, remaining:', meal.planned_foods.length);
    return true;
  }

  async deleteMeal(mealId: string): Promise<boolean> {
    console.log('🗑️ deleteMeal:', mealId);
    
    const index = meals.findIndex(m => m.id === mealId);
    if (index === -1) {
      console.log('❌ Meal not found');
      return false;
    }

    meals.splice(index, 1);
    console.log('✅ Deleted meal');
    return true;
  }

  async copyMeals(
    accountId: string,
    babyId: string,
    selections: CopySelection[],
    idempotencyKey: string
  ): Promise<boolean> {
    // stub only – pretend the operation succeeds
    console.log('copyMeals', { accountId, babyId, selections: selections.length });
    return true;
  }
  // Add this method to MealPlanServiceStub class
async updateMealFoods(mealId: string, foods: any[], idempotencyKey: string): Promise<boolean> {
  console.log('📝 updateMealFoods:', { mealId, foodCount: foods.length });
  
  const meal = meals.find(m => m.id === mealId);
  if (!meal) {
    console.log('❌ Meal not found');
    return false;
  }

  meal.planned_foods = foods.map(food => ({ food }));
  console.log('✅ Updated meal foods:', meal.planned_foods.length);
  return true;
}

async createMealWithFoods(
  accountId: string,
  babyId: string,
  date: string,
  mealType: MealType,
  foods: any[],
  idempotencyKey: string
): Promise<boolean> {
  console.log('➕ createMealWithFoods:', { date, mealType, foodCount: foods.length });
  
  const result = await this.createMeal(accountId, babyId, date, mealType, idempotencyKey);
  if (result.ok && result.meal) {
    await this.updateMealFoods(result.meal.id, foods, idempotencyKey);
    return true;
  }
  return false;
}

async trackFoodsForAchievements(babyId: string, foods: any[], source: 'planned' | 'logged'): Promise<void> {
  console.log('🏆 trackFoodsForAchievements:', { babyId, foodCount: foods.length, source });
  // Placeholder for achievement tracking
}
} // <-- this closes "export class MealPlanServiceStub"
