// app/TodayScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';

// UI
import TodayView, { Food, MealPlan } from '../components/v1/TodayView';
import FoodSelectionModal from '../components/v1/FoodSelectionModal';
import FoodLoggingModal from '../components/v1/FoodLoggingModal';
import FoodHistoryScreen from '../components/v1/FoodHistoryScreen';

// Services (your stubs)
import { MealPlanService } from '../domain/meal-planning/MealPlanService';
import { FoodService } from '../domain/food/FoodService';
import { BabyProfileService } from '../domain/baby/BabyProfileService';
import { FoodHistoryService } from '../domain/food/FoodHistoryService';

// Types / theme (COLORS, etc.)
import { COLORS } from '../types';

// ----- TEMP: simple fake wiring you can replace anytime -----
const mealPlanService = new MealPlanService();
const foodService = new FoodService();
const babyProfileService = new BabyProfileService();
const foodHistoryService = new FoodHistoryService();

const accountId = 'acct_demo';
const baby = { id: 'baby_demo', name: 'Emma', ageMonths: 8 };

export default function TodayScreen() {
  const todayISO = new Date().toISOString().slice(0, 10);

  // Data you’d normally fetch from the service:
  const [meals, setMeals] = useState<MealPlan[]>([]);

  // Selection / logging modal state
  const [showSelect, setShowSelect] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);

  // History modal state
  const [historyFood, setHistoryFood] = useState<Food | null>(null);

  // Helpers
  const reloadDay = async () => {
    const data = await mealPlanService.getMealPlansForDay(accountId, baby.id, todayISO);
    setMeals(data);
  };

  React.useEffect(() => {
    reloadDay();
  }, []);

  // ====== TodayView handlers (buttons) ======

  const handleLogMeal = (meal: MealPlan) => {
    setSelectedMeal(meal);
    setShowLog(true);
  };

  const handleViewLog = (meal: MealPlan) => {
    setSelectedMeal(meal);
    setShowLog(true); // C3 shows “Update Log” when meal.completed === true
  };

  const handleCompleteLog = (meal: MealPlan) => {
    setSelectedMeal(meal);
    setShowLog(true); // Use C3 footer “Complete Log”
  };

  const handleAddMore = (meal: MealPlan) => {
    setSelectedMeal(meal);
    setShowSelect(true);
  };

  const handleDidntMake = async (meal: MealPlan) => {
    await mealPlanService.markMealAsSkipped(meal.id);
    await reloadDay();
  };

  const handleAddUnplanned = async (date: string) => {
    // Minimal unplanned flow: create snack meal if none then open selector
    const res = await mealPlanService.createMeal(accountId, baby.id, date, 'snack', `idemp_${Date.now()}`);
    if (res.ok && res.meal) {
      setSelectedMeal(res.meal);
      setShowSelect(true);
    } else {
      Alert.alert('Error', 'Could not create unplanned meal.');
    }
  };

  // ====== Chip action sheet hooks (from TodayView) ======

  const handleOpenFoodHistory = (food: Food) => setHistoryFood(food);

  const handleRemoveFoodFromMeal = async (food: Food, meal: MealPlan) => {
    await mealPlanService.removeFoodFromMeal(meal.id, food.id);
    await reloadDay();
  };

  // ====== Props for the modals ======
  const selectionProps = selectedMeal && {
    visible: showSelect,
    onClose: () => setShowSelect(false),
    onSuccess: async () => { setShowSelect(false); await reloadDay(); },
    accountId,
    babyId: baby.id,
    babyAgeMonths: baby.ageMonths,
    meal: selectedMeal,
    foodService,
    mealPlanService,
    // If you support allergens now:
    knownAllergens: [],
  };

  const loggingProps = selectedMeal && {
    visible: showLog,
    onClose: () => setShowLog(false),
    onSuccess: async () => { setShowLog(false); await reloadDay(); },
    meal: selectedMeal,
    accountId,
    babyId: baby.id,
    mealPlanService,
    babyProfileService,
    onUpdateBabyAllergens: async () => {}, // no-op for MVP
    onOpenFoodHistory: handleOpenFoodHistory,
    isFirstTimeLogging: false,
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS?.background || '#FFF' }}>
      <TodayView
        date={todayISO}
        meals={meals}
        babyName={baby.name}
        babyAgeMonths={baby.ageMonths}
        onLogMeal={handleLogMeal}
        onAddMore={handleAddMore}
        onDidntMake={handleDidntMake}
        onViewLog={handleViewLog}
        onCompleteLog={handleCompleteLog}
        onOpenFoodHistory={handleOpenFoodHistory}
        onRemoveFoodFromMeal={handleRemoveFoodFromMeal}
        onAddUnplanned={handleAddUnplanned}
      />

      {/* C2: Food Selection */}
      {selectionProps && <FoodSelectionModal {...selectionProps} />}

      {/* C3: Food Logging */}
      {loggingProps && <FoodLoggingModal {...loggingProps} />}

      {/* C4: Food History (full-screen modal style) */}
      {historyFood && (
        <FoodHistoryScreen
          food={historyFood}
          babyId={baby.id}
          foodHistoryService={foodHistoryService}
          mealPlanService={mealPlanService}
          onClose={() => setHistoryFood(null)}
          onEditTodayLog={() => {
            setHistoryFood(null);
            if (selectedMeal) setShowLog(true);
          }}
        />
      )}
    </View>
  );
}
