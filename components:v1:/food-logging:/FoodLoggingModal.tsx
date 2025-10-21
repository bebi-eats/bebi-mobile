// components/v1/FoodLoggingModal.tsx
// Component 3: Food Logging (final clean merge)
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { MealPlanService } from '../domain/meal-planning/MealPlanService';
import { BabyProfileService } from '../domain/baby/BabyProfileService';
import { Food, MealPlan, Allergy, FoodLog, COLORS } from '../types';

type Reaction = 'yum' | 'good' | 'meh' | 'yuck';
type Amount = 'none' | 'some' | 'most' | 'all';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  meal: MealPlan;
  accountId: string;
  babyId: string;
  mealPlanService: MealPlanService;
  babyProfileService: BabyProfileService;
  onUpdateBabyAllergens: (allergen: string) => void;
  onOpenFoodHistory: (food: Food) => void;   // wire in step 4
  isFirstTimeLogging: boolean;
  isFirstFoodEver?: boolean;
  onDismissFirstFoodTooltip?: () => void;
}

const REACTIONS = [
  { value: 'yum', emoji: '😍', label: 'Yum' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'meh', emoji: '😐', label: 'Meh' },
  { value: 'yuck', emoji: '🤢', label: 'Yuck' },
] as const;

const AMOUNTS = [
  { value: 'none', label: 'None' },
  { value: 'some', label: 'Some' },
  { value: 'most', label: 'Most' },
  { value: 'all', label: 'All' },
] as const;

export default function FoodLoggingModal(props: Props) {
  const {
    visible, onClose, onSuccess, meal, accountId, babyId,
    mealPlanService, babyProfileService, onUpdateBabyAllergens,
    onOpenFoodHistory, isFirstTimeLogging, isFirstFoodEver,
    onDismissFirstFoodTooltip
  } = props;

  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [notes, setNotes] = useState('');
  const [removedFoods, setRemovedFoods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [allergyDetected, setAllergyDetected] = useState<{ food: Food; severity: 'mild'|'severe' }|null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showFirstFoodTooltip, setShowFirstFoodTooltip] = useState(false);

  // init
  useEffect(() => {
    if (!visible || !meal) return;
    const logs = meal.planned_foods.map(pf => ({
      food: pf.food,
      logged: !!pf.logged,
      reaction: pf.reaction,
      amount: pf.amount,
      allergy: pf.allergy ?? 'none'
    }));
    setFoodLogs(logs);
    setRemovedFoods([]);
    setNotes(meal.notes || '');
    setAllergyDetected(null);
  }, [visible, meal]);

  useEffect(() => { if (visible && isFirstTimeLogging) setShowTooltip(true); }, [visible, isFirstTimeLogging]);
  useEffect(() => { if (visible && isFirstFoodEver && foodLogs.length) setShowFirstFoodTooltip(true); }, [visible, isFirstFoodEver, foodLogs]);

  const mealStatus = useMemo<'planned'|'partial'|'complete'>(() => {
    const active = foodLogs.filter(l => !removedFoods.includes(l.food.id));
    if (active.length === 0) return 'planned';
    const logged = active.filter(l => l.logged).length;
    if (logged === 0) return 'planned';
    if (logged === active.length) return 'complete';
    return 'partial';
  }, [foodLogs, removedFoods]);

  const hasAnyInteraction = useMemo(() =>
    foodLogs.some(l => !removedFoods.includes(l.food.id) && (l.reaction || l.amount || l.allergy !== 'none')),
  [foodLogs, removedFoods]);

  const updateLog = (foodId: string, upd: Partial<FoodLog>) => {
    setFoodLogs(ls => ls.map(l => {
      if (l.food.id !== foodId) return l;
      const next = { ...l, ...upd, logged: true };
      if (upd.allergy === 'mild' || upd.allergy === 'severe') {
        setAllergyDetected({ food: l.food, severity: upd.allergy });
      }
      return next;
    }));
  };

  const removeFood = (id: string) => setRemovedFoods(a => [...a, id]);
  const restoreFood = (id: string) => setRemovedFoods(a => a.filter(x => x !== id));

  const handleAllergyAck = async () => {
    const a = allergyDetected;
    if (!a) return;
    await babyProfileService.addAllergen(babyId, a.food.name);
    onUpdateBabyAllergens(a.food.name);
    setAllergyDetected(null);
  };

  const saveLogs = async (markComplete: boolean) => {
    setSaving(true);
    try {
      const logs = foodLogs.filter(l => !removedFoods.includes(l.food.id));
      const key = `log_meal_${accountId}_${babyId}_${meal.date}_${meal.meal_type}_${Date.now()}`;
      const ok = await mealPlanService.logMeal(meal.id, logs, notes, markComplete, key);
      if (!ok) throw new Error('save failed');
      // achievements on actually logged
      await mealPlanService.trackFoodsForAchievements(
        babyId, logs.filter(l => l.logged).map(l => l.food), 'logged'
      );
      await onSuccess();
      handleClose();
    } catch (e) {
      Alert.alert('Error', markComplete ? 'Failed to complete log.' : 'Failed to save progress.');
    } finally { setSaving(false); }
  };

  const handleDidntMake = () => {
    Alert.alert("Didn't Make This Meal?", "This will skip logging but keep the meal in your plan.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Skip Logging', onPress: async () => { await mealPlanService.markMealAsSkipped(meal.id); await onSuccess(); handleClose(); } }
    ]);
  };

  const handleClose = () => {
    setFoodLogs([]); setNotes(''); setRemovedFoods([]);
    setAllergyDetected(null); setShowTooltip(false); setShowFirstFoodTooltip(false);
    onClose();
  };

  // UI bits
  const LogCard = (log: FoodLog) => {
    const removed = removedFoods.includes(log.food.id);
    if (removed) {
      return (
        <View key={log.food.id} style={S.removedCard}>
          <View style={S.removedHeader}>
            <Text style={S.foodEmoji}>{log.food.emoji}</Text>
            <Text style={S.removedText}>{log.food.name} (removed)</Text>
          </View>
          <TouchableOpacity style={S.restoreButton} onPress={() => restoreFood(log.food.id)}>
            <Text style={S.restoreButtonText}>Restore</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View key={log.food.id} style={S.logCard}>
        <View style={S.logHeader}>
          <TouchableOpacity style={S.foodInfo} onPress={() => onOpenFoodHistory(log.food)}>
            <Text style={S.foodEmoji}>{log.food.emoji}</Text>
            <Text style={S.foodName}>{log.food.name}</Text>
            <Text style={S.historyLink}>ⓘ History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.removeButton} onPress={() => removeFood(log.food.id)}>
            <Text style={S.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={S.fieldLabel}>How did they react?</Text>
        <View style={S.buttonRow}>
          {REACTIONS.map(r => (
            <TouchableOpacity key={r.value} style={[S.reactionButton, log.reaction === r.value && S.reactionButtonActive]}
              onPress={() => updateLog(log.food.id, { reaction: r.value as Reaction })}>
              <Text style={S.reactionEmoji}>{r.emoji}</Text><Text style={S.reactionLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={S.fieldLabel}>How much did they eat?</Text>
        <View style={S.buttonRow}>
          {AMOUNTS.map(a => (
            <TouchableOpacity key={a.value} style={[S.optionButton, log.amount === a.value && S.optionButtonActive]}
              onPress={() => updateLog(log.food.id, { amount: a.value as Amount })}>
              <Text style={[S.optionText, log.amount === a.value && S.optionTextActive]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={S.fieldLabel}>Allergic Reaction?</Text>
        <View style={S.buttonRow}>
          {['none','mild','severe'].map(a => (
            <TouchableOpacity key={a}
              style={[S.optionButton, log.allergy === a && S.optionButtonActive, (a==='mild'||a==='severe') && log.allergy===a && S.allergyButtonActive]}
              onPress={() => updateLog(log.food.id, { allergy: a as Allergy })}>
              <Text style={[S.optionText, log.allergy === a && S.optionTextActive]}>{a[0].toUpperCase()+a.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {log.logged && meal.completed && (
          <View style={S.loggedBadge}><Text style={S.loggedBadgeText}>✓ Logged</Text></View>
        )}
      </View>
    );
  };

  const Footer = () => {
    if (saving) {
      return (<View style={S.footer}><View style={[S.saveButton, S.saveButtonDisabled]}><ActivityIndicator size="small" color={COLORS.background}/></View></View>);
    }
    if (meal.completed) {
      return (<View style={S.footer}>
        <TouchableOpacity style={S.primaryButton} onPress={() => saveLogs(true)}><Text style={S.primaryButtonText}>Update Log</Text></TouchableOpacity>
      </View>);
    }
    if (mealStatus === 'partial' && hasAnyInteraction) {
      return (<View style={S.footer}>
        <TouchableOpacity style={S.secondaryButton} onPress={() => saveLogs(false)}><Text style={S.secondaryButtonText}>Save Progress</Text></TouchableOpacity>
        <TouchableOpacity style={S.primaryButton} onPress={() => saveLogs(true)}><Text style={S.primaryButtonText}>Complete Log</Text></TouchableOpacity>
      </View>);
    }
    return (<View style={S.footer}>
      <TouchableOpacity style={[S.saveButton, !hasAnyInteraction && S.saveButtonDisabled]} disabled={!hasAnyInteraction} onPress={() => saveLogs(true)}>
        <Text style={S.saveButtonText}>{hasAnyInteraction ? 'Complete Log' : 'Start Logging'}</Text>
      </TouchableOpacity>
    </View>);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={S.container}>
        <View style={S.header}>
          <TouchableOpacity onPress={handleClose}><Text style={S.closeButton}>✕</Text></TouchableOpacity>
          <Text style={S.headerTitle}>Log {meal.meal_type[0].toUpperCase()+meal.meal_type.slice(1)}</Text>
          <TouchableOpacity onPress={handleDidntMake}><Text style={S.skipButton}>Didn't Make</Text></TouchableOpacity>
        </View>

        <ScrollView style={S.content}>
          {foodLogs.map(LogCard)}
          <View style={S.notesSection}>
            <Text style={S.notesLabel}>Notes (optional)</Text>
            <TextInput style={S.notesInput} placeholder="Add notes about this meal..." value={notes} onChangeText={setNotes} multiline numberOfLines={4} textAlignVertical="top" />
          </View>
        </ScrollView>

        <Footer/>

        {/* Allergy modal */}
        {allergyDetected && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setAllergyDetected(null)}>
            <View style={S.allergyModalOverlay}>
              <View style={S.allergyModalCard}>
                <Text style={S.allergyModalIcon}>⚠️</Text>
                <Text style={S.allergyModalTitle}>Allergic Reaction Detected</Text>
                <Text style={S.allergyModalText}>We recommend contacting your medical professional about this {allergyDetected.severity} reaction to {allergyDetected.food.name}.</Text>
                <Text style={S.allergyModalSubtext}>This allergen will be added to your baby's profile.</Text>
                <TouchableOpacity style={S.allergyModalButton} onPress={handleAllergyAck}>
                  <Text style={S.allergyModalButtonText}>I Understand</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Tooltips */}
        {showTooltip && (
          <View style={S.tooltipOverlay}>
            <View style={S.tooltipCard}>
              <Text style={S.tooltipText}>Track what baby ate, reactions, and allergies.</Text>
              <TouchableOpacity style={S.tooltipButton} onPress={() => setShowTooltip(false)}>
                <Text style={S.tooltipButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {showFirstFoodTooltip && (
          <View style={S.firstFoodTooltipOverlay}>
            <View style={S.firstFoodTooltipCard}>
              <Text style={S.firstFoodTooltipTitle}>ⓘ New Food</Text>
              <Text style={S.firstFoodTooltipText}>Introduce one new food at a time and watch for reactions.</Text>
              <TouchableOpacity style={S.firstFoodTooltipButton} onPress={() => { setShowFirstFoodTooltip(false); onDismissFirstFoodTooltip?.(); }}>
                <Text style={S.firstFoodTooltipButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:16,backgroundColor:COLORS.primary,borderBottomWidth:1,borderBottomColor:COLORS.border},
  closeButton:{fontSize:24,color:COLORS.background,padding:8},
  headerTitle:{fontSize:18,fontWeight:'600',color:COLORS.background},
  skipButton:{fontSize:14,color:COLORS.background,padding:8},
  content:{flex:1,padding:16},
  logCard:{backgroundColor:COLORS.secondary,borderRadius:12,padding:16,marginBottom:16,borderWidth:1,borderColor:COLORS.border},
  logHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  foodInfo:{flexDirection:'row',alignItems:'center',gap:8,flex:1},
  foodEmoji:{fontSize:32},
  foodName:{fontSize:18,fontWeight:'600',color:COLORS.foreground},
  historyLink:{fontSize:14,color:COLORS.accentOrange,marginLeft:'auto'},
  removeButton:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.error,alignItems:'center',justifyContent:'center'},
  removeButtonText:{fontSize:18,color:COLORS.background},
  removedCard:{backgroundColor:COLORS.muted,borderRadius:12,padding:16,marginBottom:16,borderWidth:1,borderColor:COLORS.border,opacity:0.6},
  removedHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  removedText:{fontSize:16,color:COLORS.mutedForeground,textDecorationLine:'line-through'},
  restoreButton:{paddingVertical:8,paddingHorizontal:16,backgroundColor:COLORS.accentOrange,borderRadius:8,alignSelf:'flex-start'},
  restoreButtonText:{fontSize:14,fontWeight:'600',color:COLORS.background},
  fieldLabel:{fontSize:14,fontWeight:'600',color:COLORS.foreground,marginBottom:8},
  buttonRow:{flexDirection:'row',gap:8,marginBottom:16,flexWrap:'wrap'},
  reactionButton:{flex:1,minWidth:70,paddingVertical:12,paddingHorizontal:8,borderRadius:8,borderWidth:2,borderColor:COLORS.border,backgroundColor:COLORS.background,alignItems:'center'},
  reactionButtonActive:{borderColor:COLORS.accentOrange,backgroundColor:'#FFF5F0'},
  reactionEmoji:{fontSize:24,marginBottom:4},
  reactionLabel:{fontSize:12,color:COLORS.foreground},
  optionButton:{flex:1,minWidth:70,paddingVertical:12,borderRadius:8,borderWidth:2,borderColor:COLORS.border,backgroundColor:COLORS.background,alignItems:'center'},
  optionButtonActive:{borderColor:COLORS.accentOrange,backgroundColor:'#FFF5F0'},
  allergyButtonActive:{borderColor:COLORS.error,backgroundColor:COLORS.errorBg},
  optionText:{fontSize:14,color:COLORS.foreground},
  optionTextActive:{fontWeight:'600'},
  loggedBadge:{marginTop:8,paddingVertical:6,paddingHorizontal:12,backgroundColor:'#D4EDDA',borderRadius:8,alignSelf:'flex-start'},
  loggedBadgeText:{fontSize:12,fontWeight:'600',color:'#22C55E'},
  notesSection:{marginBottom:16},
  notesLabel:{fontSize:14,fontWeight:'600',color:COLORS.foreground,marginBottom:8},
  notesInput:{backgroundColor:COLORS.background,borderRadius:8,borderWidth:1,borderColor:COLORS.border,padding:12,fontSize:14,color:COLORS.foreground,minHeight:100},
  footer:{flexDirection:'row',padding:16,gap:12,borderTopWidth:1,borderTopColor:COLORS.border},
  saveButton:{flex:1,paddingVertical:16,borderRadius:8,backgroundColor:COLORS.foreground,alignItems:'center',justifyContent:'center'},
  saveButtonDisabled:{backgroundColor:COLORS.muted,opacity:0.5},
  saveButtonText:{fontSize:16,fontWeight:'600',color:COLORS.background},
  primaryButton:{flex:1,paddingVertical:16,borderRadius:8,backgroundColor:COLORS.foreground,alignItems:'center',justifyContent:'center'},
  primaryButtonText:{fontSize:16,fontWeight:'600',color:COLORS.background},
  secondaryButton:{flex:1,paddingVertical:16,borderRadius:8,backgroundColor:COLORS.background,borderWidth:1,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  secondaryButtonText:{fontSize:16,fontWeight:'500',color:COLORS.foreground},
  allergyModalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',alignItems:'center',padding:16},
  allergyModalCard:{backgroundColor:COLORS.background,borderRadius:16,padding:24,width:'100%',maxWidth:400,alignItems:'center'},
  allergyModalIcon:{fontSize:48,marginBottom:16},
  allergyModalTitle:{fontSize:20,fontWeight:'700',color:COLORS.error,marginBottom:12,textAlign:'center'},
  allergyModalText:{fontSize:16,color:COLORS.foreground,textAlign:'center',marginBottom:8,lineHeight:22},
  allergyModalSubtext:{fontSize:14,color:COLORS.mutedForeground,textAlign:'center',marginBottom:24,lineHeight:20},
  allergyModalButton:{paddingVertical:14,paddingHorizontal:32,borderRadius:8,backgroundColor:COLORS.error},
  allergyModalButtonText:{fontSize:16,fontWeight:'600',color:COLORS.background},
  tooltipOverlay:{position:'absolute',top:80,left:16,right:16,zIndex:1000},
  tooltipCard:{backgroundColor:COLORS.primary,borderRadius:12,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:8},
  tooltipText:{fontSize:14,color:COLORS.background,marginBottom:12,lineHeight:20},
  tooltipButton:{paddingVertical:8,paddingHorizontal:16,backgroundColor:COLORS.accentOrange,borderRadius:8,alignSelf:'flex-end'},
  tooltipButtonText:{fontSize:14,fontWeight:'600',color:COLORS.background},
  firstFoodTooltipOverlay:{position:'absolute',bottom:100,left:16,right:16,zIndex:1000},
  firstFoodTooltipCard:{backgroundColor:COLORS.accentOrange,borderRadius:12,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8,elevation:8},
  firstFoodTooltipTitle:{fontSize:16,fontWeight:'700',color:COLORS.background,marginBottom:8},
  firstFoodTooltipText:{fontSize:14,color:COLORS.background,marginBottom:12,lineHeight:20},
  firstFoodTooltipButton:{paddingVertical:8,paddingHorizontal:16,backgroundColor:COLORS.background,borderRadius:8,alignSelf:'flex-end'},
  firstFoodTooltipButtonText:{fontSize:14,fontWeight:'600',color:COLORS.accentOrange},
});
