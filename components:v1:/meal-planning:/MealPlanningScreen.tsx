import React, { useEffect, useState } from 'react';
import { SafeAreaView, View } from 'react-native';

// UI (presentational view + modals)
import TodayView, { Food, MealPlan } from './TodayView';
import FoodSelectionModal from '../food-selection/FoodSelectionModal';
import FoodLoggingModal from '../food-logging/FoodLoggingModal';
import FoodHistoryScreen from '../food-history/FoodHistoryScreen';

// Services (stubs are fine)
import { MealPlanService } from '../../domain/meal-planning/MealPlanService';
import { FoodService } from '../../domain/food/FoodService';
import { BabyProfileService } from '../../domain/baby/BabyProfileService';
import { FoodHistoryService } from '../../domain/food/FoodHistoryService';

// If you DON'T have a shared types/colors file in Snack, uncomment:
// const COLORS = { background: '#FFFFFF' };
// If you DO have one (recommended), replace line above with:
// import { COLORS } from '../../types';

const mealPlanService = new MealPlanService();
const foodService = new FoodService();
const babyProfileService = new BabyProfileService();
const foodHistoryService = new FoodHistoryService();

const accountId = 'acct_demo';
const baby = { id: 'baby_demo', name: 'Emma', ageMonths: 8 };

export default function MealPlanningScreen() {
  const today = new Date().toISOString().slice(0, 10);

  // Data state
  const [meals, setMeals] = useState<MealPlan[]>([]);

  // Modal state
  const [showSelect, setShowSelect] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);
  const [historyFood, setHistoryFood] = useState<Food | null>(null);

  const reloadDay = async () => {
    const data = await mealPlanService.getMealPlansForDay(accountId, baby.id, today);
    setMeals(data);
  };

  useEffect(() => { reloadDay(); }, []);

  // Handlers for TodayView buttons
  const onLogMeal = (meal: MealPlan) => { setSelectedMeal(meal); setShowLog(true); };
  const onViewLog = (meal: MealPlan) => { setSelectedMeal(meal); setShowLog(true); };
  const onCompleteLog = (meal: MealPlan) => { setSelectedMeal(meal); setShowLog(true); };
  const onAddMore = (meal: MealPlan) => { setSelectedMeal(meal); setShowSelect(true); };
  const onDidntMake = async (meal: MealPlan) => { await mealPlanService.markMealAsSkipped(meal.id); await reloadDay(); };

  const onAddUnplanned = async (date: string) => {
    const res = await mealPlanService.createMeal(accountId, baby.id, date, 'snack', `idemp_${Date.now()}`);
    if (res.ok && res.meal) { setSelectedMeal(res.meal); setShowSelect(true); }
  };

  // Chip action sheet hooks
  const onOpenFoodHistory = (food: Food) => setHistoryFood(food);
  const onRemoveFoodFromMeal = async (food: Food, meal: MealPlan) => {
    await mealPlanService.removeFoodFromMeal(meal.id, food.id);
    await reloadDay();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' /* COLORS?.background */ }}>
      <TodayView
        date={today}
        meals={meals}
        babyName={baby.name}
        babyAgeMonths={baby.ageMonths}
        onLogMeal={onLogMeal}
        onAddMore={onAddMore}
        onDidntMake={onDidntMake}
        onViewLog={onViewLog}
        onCompleteLog={onCompleteLog}
        onOpenFoodHistory={onOpenFoodHistory}
        onRemoveFoodFromMeal={onRemoveFoodFromMeal}
        onAddUnplanned={onAddUnplanned}
      />

      {selectedMeal && showSelect && (
        <FoodSelectionModal
          visible={showSelect}
          onClose={() => setShowSelect(false)}
          onSuccess={async () => { setShowSelect(false); await reloadDay(); }}
          accountId={accountId}
          babyId={baby.id}
          babyAgeMonths={baby.ageMonths}
          meal={selectedMeal}
          foodService={foodService}
          mealPlanService={mealPlanService}
          knownAllergens={[]}
        />
      )}

      {selectedMeal && showLog && (
        <FoodLoggingModal
          visible={showLog}
          onClose={() => setShowLog(false)}
          onSuccess={async () => { setShowLog(false); await reloadDay(); }}
          meal={selectedMeal}
          accountId={accountId}
          babyId={baby.id}
          mealPlanService={mealPlanService}
          babyProfileService={babyProfileService}
          onUpdateBabyAllergens={() => {}}
          onOpenFoodHistory={onOpenFoodHistory}
          isFirstTimeLogging={false}
        />
      )}

      {historyFood && (
        <FoodHistoryScreen
          food={historyFood}
          babyId={baby.id}
          foodHistoryService={foodHistoryService}
          mealPlanService={mealPlanService}
          onClose={() => setHistoryFood(null)}
          onEditTodayLog={() => { setHistoryFood(null); if (selectedMeal) setShowLog(true); }}
        />
      )}
    </SafeAreaView>
  );
}
