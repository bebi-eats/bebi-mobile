// components/v1/TodayView.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food { id: string; name: string; emoji: string; }
export interface MealPlan {
  id: string;
  date: string;
  meal_type: MealType;
  planned_foods: Array<{ food: Food; logged?: boolean }>;
  status?: 'planned' | 'partial' | 'complete';
}

interface Props {
  date: string;
  meals: MealPlan[];
  babyName: string;
  babyAgeMonths: number;

  // parent handlers
  onLogMeal: (meal: MealPlan) => void;
  onAddMore: (meal: MealPlan) => void;
  onDidntMake: (meal: MealPlan) => void;
  onViewLog: (meal: MealPlan) => void;
  onCompleteLog: (meal: MealPlan) => void;

  // NEW: used by the action sheet on chip tap
  onOpenFoodHistory: (food: Food) => void;
  onRemoveFoodFromMeal: (food: Food, meal: MealPlan) => void;

  // Add unplanned food flow
  onAddUnplanned: (date: string) => void;
}

const MEAL_TYPE_CONFIG: Record<MealType, { emoji: string; label: string }> = {
  breakfast: { emoji: '🥣', label: 'Breakfast' },
  lunch: { emoji: '🥗', label: 'Lunch' },
  dinner: { emoji: '🍽️', label: 'Dinner' },
  snack: { emoji: '🍎', label: 'Snack' },
};

const STATUS_CONFIG = {
  planned: { label: 'Planned', color: '#6B7280', bg: '#F3F4F6' },
  partial: { label: 'Partial', color: '#F59E0B', bg: '#FEF3C7' },
  complete: { label: 'Complete', color: '#10B981', bg: '#D1FAE5' },
} as const;

export const TodayView: React.FC<Props> = ({
  date,
  meals,
  babyName,
  babyAgeMonths,
  onLogMeal,
  onAddMore,
  onDidntMake,
  onViewLog,
  onCompleteLog,
  onOpenFoodHistory,
  onRemoveFoodFromMeal,
  onAddUnplanned
}) => {

  // simple in-file "action sheet" for chip taps
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetFood, setSheetFood] = useState<Food | null>(null);
  const [sheetMeal, setSheetMeal] = useState<MealPlan | null>(null);
  const openSheet = (food: Food, meal: MealPlan) => { setSheetFood(food); setSheetMeal(meal); setSheetVisible(true); };
  const closeSheet = () => { setSheetVisible(false); setSheetFood(null); setSheetMeal(null); };

  const byType = useMemo(() => {
    const m: Partial<Record<MealType, MealPlan>> = {};
    meals.forEach(meal => { m[meal.meal_type] = meal; });
    return m;
  }, [meals]);

  const totalMeals = useMemo(
    () => ['breakfast','lunch','dinner','snack'].filter(mt => byType[mt as MealType]?.planned_foods?.length).length,
    [byType]
  );
  const loggedMeals = useMemo(
    () => ['breakfast','lunch','dinner','snack'].filter(mt => byType[mt as MealType]?.status === 'complete').length,
    [byType]
  );

  const renderMealCard = (mealType: MealType) => {
    const meal = byType[mealType];
    const cfg = MEAL_TYPE_CONFIG[mealType];

    if (!meal || meal.planned_foods.length === 0) {
      return (
        <View key={mealType} style={S.mealCard}>
          <View style={S.mealHeader}>
            <View style={S.mealTitleRow}>
              <Text style={S.mealEmoji}>{cfg.emoji}</Text>
              <Text style={S.mealTitle}>{cfg.label}</Text>
            </View>
          </View>
          <View style={S.emptyMealContent}><Text style={S.emptyMealText}>No meal planned</Text></View>
        </View>
      );
    }

    // derive status from logged flags if not provided
    const allLogged = meal.planned_foods.every(p => p.logged);
    const someLogged = meal.planned_foods.some(p => p.logged);
    const status: 'planned'|'partial'|'complete' =
      meal.status ?? (allLogged ? 'complete' : someLogged ? 'partial' : 'planned');
    const sc = STATUS_CONFIG[status];

    return (
      <View key={mealType} style={S.mealCard}>
        <View style={S.mealHeader}>
          <View style={S.mealTitleRow}>
            <Text style={S.mealEmoji}>{cfg.emoji}</Text>
            <Text style={S.mealTitle}>{cfg.label}</Text>
          </View>
          <View style={[S.statusBadge, { backgroundColor: sc.bg }]}><Text style={[S.statusText, { color: sc.color }]}>{sc.label}</Text></View>
        </View>

        <View style={S.foodChipsContainer}>
          {meal.planned_foods.map((pf, i) => (
            <TouchableOpacity key={`${pf.food.id}-${i}`} style={S.foodChip} onPress={() => openSheet(pf.food, meal)}>
              <Text style={S.foodChipEmoji}>{pf.food.emoji}</Text>
              <Text style={S.foodChipName}>{pf.food.name}</Text>
              <Text style={S.foodChipStatus}>{pf.logged ? '✓' : 'ⓘ'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={S.mealActions}>
          {status === 'planned' && (
            <>
              <TouchableOpacity style={[S.actionButton, S.primaryButton]} onPress={() => onLogMeal(meal)}><Text style={S.primaryButtonText}>Log Meal</Text></TouchableOpacity>
              <TouchableOpacity style={[S.actionButton, S.secondaryButton]} onPress={() => onDidntMake(meal)}><Text style={S.secondaryButtonText}>Didn’t Make</Text></TouchableOpacity>
              <TouchableOpacity style={[S.actionButton, S.secondaryButton]} onPress={() => onAddMore(meal)}><Text style={S.secondaryButtonText}>Add More</Text></TouchableOpacity>
            </>
          )}

          {status === 'partial' && (
            <>
              <TouchableOpacity style={[S.actionButton, S.primaryButton]} onPress={() => onCompleteLog(meal)}><Text style={S.primaryButtonText}>Complete Log</Text></TouchableOpacity>
              <TouchableOpacity style={[S.actionButton, S.secondaryButton]} onPress={() => onAddMore(meal)}><Text style={S.secondaryButtonText}>Add More</Text></TouchableOpacity>
            </>
          )}

          {status === 'complete' && (
            <>
              <TouchableOpacity style={[S.actionButton, S.primaryButton]} onPress={() => onViewLog(meal)}><Text style={S.primaryButtonText}>View Log</Text></TouchableOpacity>
              <TouchableOpacity style={[S.actionButton, S.secondaryButton]} onPress={() => onAddMore(meal)}><Text style={S.secondaryButtonText}>Add More</Text></TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={S.container}>
      <View style={S.header}>
        <Text style={S.headerTitle}>
          {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' — '}
          {babyName} ({babyAgeMonths} months)
        </Text>
      </View>

      <View style={S.progressSection}>
        <Text style={S.progressText}>Today’s Progress</Text>
        <Text style={S.progressCount}>{loggedMeals} of {totalMeals} meals logged</Text>
        <View style={S.progressBar}>
          <View style={[S.progressFill, { width: totalMeals ? `${(loggedMeals/totalMeals)*100}%` : '0%' }]} />
        </View>
      </View>

      <View style={S.mealsSection}>
        {renderMealCard('breakfast')}
        {renderMealCard('lunch')}
        {renderMealCard('dinner')}
        {byType.snack && renderMealCard('snack')}
      </View>

      <TouchableOpacity style={S.addUnplannedButton} onPress={() => onAddUnplanned(date)}>
        <Text style={S.addUnplannedText}>+ Add Unplanned Food/Meal</Text>
      </TouchableOpacity>

      {/* CHIP ACTION SHEET */}
      <Modal visible={sheetVisible} transparent animationType="fade" onRequestClose={closeSheet}>
        <View style={S.sheetOverlay}>
          <View style={S.sheetCard}>
            <Text style={S.sheetTitle}>{sheetFood?.emoji} {sheetFood?.name}</Text>
            <TouchableOpacity style={S.sheetAction} onPress={() => { if (sheetFood) onOpenFoodHistory(sheetFood); closeSheet(); }}>
              <Text style={S.sheetActionText}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={S.sheetAction} onPress={() => { if (sheetFood && sheetMeal) onRemoveFoodFromMeal(sheetFood, sheetMeal); closeSheet(); }}>
              <Text style={S.sheetActionText}>Remove from Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.sheetAction, S.sheetCancel]} onPress={closeSheet}>
              <Text style={[S.sheetActionText, S.sheetCancelText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const S = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#FFFFFF' },
  header:{ padding:16, borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  headerTitle:{ fontSize:18, fontWeight:'600', color:'#111827' },
  progressSection:{ padding:16, borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  progressText:{ fontSize:14, color:'#6B7280', marginBottom:4 },
  progressCount:{ fontSize:16, fontWeight:'600', color:'#111827', marginBottom:8 },
  progressBar:{ height:8, backgroundColor:'#F3F4F6', borderRadius:4, overflow:'hidden' },
  progressFill:{ height:'100%', backgroundColor:'#10B981', borderRadius:4 },
  mealsSection:{ padding:16 },
  mealCard:{ backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E5E7EB', borderRadius:12, padding:16, marginBottom:16 },
  mealHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  mealTitleRow:{ flexDirection:'row', alignItems:'center' },
  mealEmoji:{ fontSize:24, marginRight:8 },
  mealTitle:{ fontSize:18, fontWeight:'600', color:'#111827' },
  statusBadge:{ paddingHorizontal:12, paddingVertical:4, borderRadius:12 },
  statusText:{ fontSize:12, fontWeight:'600' },
  emptyMealContent:{ paddingVertical:24, alignItems:'center' },
  emptyMealText:{ fontSize:14, color:'#9CA3AF' },
  foodChipsContainer:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 },
  foodChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F3F4F6', paddingHorizontal:12, paddingVertical:8, borderRadius:20, gap:6 },
  foodChipEmoji:{ fontSize:16 },
  foodChipName:{ fontSize:14, color:'#111827' },
  foodChipStatus:{ fontSize:14, marginLeft:4 },
  mealActions:{ flexDirection:'row', gap:8 },
  actionButton:{ flex:1, paddingVertical:12, borderRadius:8, alignItems:'center' },
  primaryButton:{ backgroundColor:'#111827' },
  primaryButtonText:{ color:'#FFFFFF', fontSize:14, fontWeight:'600' },
  secondaryButton:{ backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E5E7EB' },
  secondaryButtonText:{ color:'#111827', fontSize:14, fontWeight:'600' },
  addUnplannedButton:{ margin:16, paddingVertical:14, backgroundColor:'#FFFFFF', borderWidth:2, borderColor:'#111827', borderRadius:8, alignItems:'center' },
  addUnplannedText:{ fontSize:16, fontWeight:'600', color:'#111827' },

  // Sheet
  sheetOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheetCard:{ backgroundColor:'#FFF', borderTopLeftRadius:16, borderTopRightRadius:16, padding:16 },
  sheetTitle:{ fontSize:16, fontWeight:'700', marginBottom:8 },
  sheetAction:{ paddingVertical:14 },
  sheetActionText:{ fontSize:16, color:'#111827' },
  sheetCancel:{ borderTopWidth:1, borderTopColor:'#E5E7EB', marginTop:8 },
  sheetCancelText:{ color:'#6B7280' },
});

export default TodayView;
