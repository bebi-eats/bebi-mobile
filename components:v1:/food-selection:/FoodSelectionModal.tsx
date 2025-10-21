// =============================================================================
// COMPONENT 2: FOOD SELECTION INTERFACE - CORRECTED VERSION
// Fixed: API integration, dynamic food loading, proper error handling
// Updated based on feedback from handoff document
// =============================================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';

// Domain services
import { MealPlanService } from '../domain/meal-planning/MealPlanService';
import { FoodService } from '../domain/food/FoodService';
import { BabyProfileService } from '../domain/baby/BabyProfileService';

// Shared types
import { Food, MealType, COLORS } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  existingFoods?: Food[];
  babyAllergens: string[];
  babyId: string;
  babyAgeMonths: number;
  babyCapabilities: string[]; // e.g., ['finger_foods', 'soft_textures_only']
  mealType: MealType;
  date: string;
  accountId: string;
  mealPlanId?: string;
  mealPlanService: MealPlanService;
  foodService: FoodService;
  babyProfileService: BabyProfileService;
  isFirstTimeUser: boolean; // For product tour tooltip
  acknowledgedAllergenFoods: string[]; // Foods user has already acknowledged allergen warnings for
  allergenWarningsEnabled: boolean; // Settings toggle state
  onUpdateAcknowledgedAllergens: (foodId: string) => void;
}

export const FoodSelectionModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  existingFoods = [],
  babyAllergens,
  babyId,
  babyAgeMonths,
  babyCapabilities,
  mealType,
  date,
  accountId,
  mealPlanId,
  mealPlanService,
  foodService,
  babyProfileService,
  isFirstTimeUser,
  acknowledgedAllergenFoods,
  allergenWarningsEnabled,
  onUpdateAcknowledgedAllergens,
}) => {
  // ===== STATE =====
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFoods, setSelectedFoods] = useState<Food[]>(existingFoods);
  const [saving, setSaving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [allergenModalFood, setAllergenModalFood] = useState<Food | null>(null);
  
  // API state
  const [foods, setFoods] = useState<Food[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // ===== DATA LOADING =====

  // Load categories on mount
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  // Load foods when search/category changes
  useEffect(() => {
    if (visible) {
      loadFoods(true); // Reset to first page
    }
  }, [visible, searchQuery, selectedCategory]);

  const loadCategories = async () => {
    try {
      const cats = await foodService.getCategories(babyId, babyAgeMonths);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      // Keep fallback categories
    }
  };

  const loadFoods = async (reset: boolean = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);
    
    try {
      const newOffset = reset ? 0 : offset;
      
      const result = await foodService.searchFoods({
        query: searchQuery,
        category: selectedCategory,
        babyId,
        babyAgeMonths,
        capabilities: babyCapabilities,
        limit: 50,
        offset: newOffset,
      });

      if (reset) {
        setFoods(result.foods);
        setOffset(50);
      } else {
        setFoods([...foods, ...result.foods]);
        setOffset(newOffset + 50);
      }
      
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Failed to load foods:', err);
      setError('Failed to load foods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFoods = () => {
    if (!loading && hasMore) {
      loadFoods(false);
    }
  };

  // US-051: Show tooltip on first time
  useEffect(() => {
    if (visible && isFirstTimeUser) {
      setShowTooltip(true);
    }
  }, [visible, isFirstTimeUser]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSelectedCategory('All');
      setError(null);
      setOffset(0);
    }
  }, [visible]);

  // ===== HELPER FUNCTIONS =====

  const isSelected = (food: Food) => selectedFoods.some(f => f.id === food.id);

  // US-026: Check if food has allergen warning for this baby
  const hasAllergenWarning = (food: Food): boolean => {
    if (!food.isAllergen || !allergenWarningsEnabled) return false;
    
    return babyAllergens.some(allergen =>
      food.allergenType?.toLowerCase() === allergen.toLowerCase() ||
      food.name.toLowerCase().includes(allergen.toLowerCase())
    );
  };

  // Check if this food's allergen has been acknowledged before
  const isAllergenAcknowledged = (food: Food): boolean => {
    return acknowledgedAllergenFoods.includes(food.id);
  };

  // ===== EVENT HANDLERS =====

  // US-025, US-026: Handle food selection with allergen warnings
  const toggleFood = (food: Food) => {
    const selected = isSelected(food);
    
    if (selected) {
      // Remove food
      setSelectedFoods(selectedFoods.filter(f => f.id !== food.id));
    } else {
      // US-026: Check for allergen warning
      const hasWarning = hasAllergenWarning(food);
      const needsWarning = hasWarning && !isAllergenAcknowledged(food);

      if (needsWarning) {
        // Show blocking modal for first-time allergen foods
        setAllergenModalFood(food);
      } else {
        // Add food directly
        setSelectedFoods([...selectedFoods, food]);
      }
    }
  };

  // Handle allergen warning acknowledgment
  const handleAllergenAcknowledge = () => {
    if (allergenModalFood) {
      setSelectedFoods([...selectedFoods, allergenModalFood]);
      onUpdateAcknowledgedAllergens(allergenModalFood.id);
      setAllergenModalFood(null);
    }
  };

  // US-028, US-029: Handle saving foods
  const handleSave = async () => {
    if (selectedFoods.length === 0) {
      Alert.alert('No Foods Selected', 'Please select at least one food to add.');
      return;
    }

    setSaving(true);
    try {
      // Generate idempotency key
      const idempotencyKey = `add_foods_${accountId}_${babyId}_${date}_${mealType}_${Date.now()}`;
      
      let success: boolean;
      
      if (mealPlanId) {
        // US-028: Edit existing meal plan
        success = await mealPlanService.updateMealFoods(
          mealPlanId,
          selectedFoods,
          idempotencyKey
        );
      } else {
        // Create new meal plan with foods
        success = await mealPlanService.createMealWithFoods(
          accountId,
          babyId,
          date,
          mealType,
          selectedFoods,
          idempotencyKey
        );
      }
      
      if (success) {
        // US-029: Track foods for achievement progress
        await mealPlanService.trackFoodsForAchievements(babyId, selectedFoods, 'planned');
        
        await onSuccess();
        handleClose();
      } else {
        Alert.alert('Error', 'Failed to save foods. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save foods:', error);
      Alert.alert('Error', 'Failed to save foods. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedFoods(existingFoods);
    setSearchQuery('');
    setSelectedCategory('All');
    setShowTooltip(false);
    setError(null);
    onClose();
  };

  // ===== RENDER FUNCTIONS =====

  const renderFoodItem = ({ item: food }: { item: Food }) => {
    const selected = isSelected(food);
    const hasWarning = hasAllergenWarning(food);
    const isAcknowledged = isAllergenAcknowledged(food);

    return (
      <TouchableOpacity
        style={[
          styles.foodItem,
          selected && styles.foodItemSelected,
          hasWarning && !selected && styles.foodItemWarning,
        ]}
        onPress={() => toggleFood(food)}
      >
        {/* Selection checkmark */}
        {selected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
        
        {/* US-026: Allergen warning icon */}
        {hasWarning && (
          <View style={styles.allergenIcon}>
            <Text style={styles.allergenIconText}>⚠️</Text>
          </View>
        )}
        
        <Text style={styles.foodEmoji}>{food.emoji}</Text>
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodCategory}>{food.category}</Text>
      </TouchableOpacity>
    );
  };

  // US-026: Render blocking allergen warning modal
  const renderAllergenModal = () => (
    <Modal
      visible={allergenModalFood !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setAllergenModalFood(null)}
    >
      <View style={styles.allergenModalOverlay}>
        <View style={styles.allergenModalCard}>
          <Text style={styles.allergenModalIcon}>⚠️</Text>
          <Text style={styles.allergenModalTitle}>
            Contains {allergenModalFood?.allergenType || 'Allergen'}
          </Text>
          <Text style={styles.allergenModalText}>
            Your baby's profile shows {allergenModalFood?.allergenType} allergy. 
            Always introduce allergens under pediatrician guidance.
          </Text>
          <View style={styles.allergenModalActions}>
            <TouchableOpacity
              style={styles.allergenGoBackButton}
              onPress={() => setAllergenModalFood(null)}
            >
              <Text style={styles.allergenGoBackText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.allergenUnderstandButton}
              onPress={handleAllergenAcknowledge}
            >
              <Text style={styles.allergenUnderstandText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // US-051: Product tour tooltip
  const renderTooltip = () => {
    if (!showTooltip) return null;

    return (
      <View style={styles.tooltipOverlay}>
        <View style={styles.tooltipCard}>
          <Text style={styles.tooltipText}>
            Search for any food or browse by category. Foods are filtered to be age-appropriate for your baby.
          </Text>
          <TouchableOpacity
            style={styles.tooltipButton}
            onPress={() => setShowTooltip(false)}
          >
            <Text style={styles.tooltipButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Error state
  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadFoods(true)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Loading footer for pagination
  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={COLORS.accentOrange} />
        <Text style={styles.loadingFooterText}>Loading more foods...</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Add Foods to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* US-024: Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods (e.g., banana, blue)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* US-023: Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                selectedCategory === category && styles.categoryTabActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === category && styles.categoryTabTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Foods Counter */}
        {selectedFoods.length > 0 && (
          <View style={styles.selectedCounter}>
            <Text style={styles.selectedCounterText}>
              {selectedFoods.length} food{selectedFoods.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {/* Error Display */}
        {renderError()}

        {/* US-023: Food Grid */}
        {loading && foods.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.accentOrange} />
            <Text style={styles.loadingText}>Loading foods...</Text>
          </View>
        ) : (
          <FlatList
            data={foods}
            renderItem={renderFoodItem}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={styles.foodGrid}
            onEndReached={loadMoreFoods}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No foods found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try a different search term or category
                </Text>
              </View>
            }
          />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (selectedFoods.length === 0 || saving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={selectedFoods.length === 0 || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.saveButtonText}>
                Add {selectedFoods.length} Food{selectedFoods.length !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modals and Overlays */}
        {renderAllergenModal()}
        {renderTooltip()}
      </View>
    </Modal>
  );
};

// ===== STYLES =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.foreground,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.foreground,
  },
  clearButton: {
    fontSize: 18,
    color: COLORS.mutedForeground,
    paddingHorizontal: 4,
  },
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  categoryTabActive: {
    borderColor: COLORS.accentOrange,
    backgroundColor: COLORS.accentOrange,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  categoryTabTextActive: {
    color: COLORS.background,
  },
  selectedCounter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectedCounterText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: COLORS.errorBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.error,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  foodGrid: {
    padding: 16,
  },
  foodItem: {
    flex: 1,
    maxWidth: '33.33%',
    aspectRatio: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  foodItemSelected: {
    borderColor: COLORS.accentOrange,
    backgroundColor: '#FFF5F0',
  },
  foodItemWarning: {
    borderColor: COLORS.warningBorder,
    backgroundColor: COLORS.warning,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accentOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    color: COLORS.background,
    fontWeight: 'bold',
  },
  allergenIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  allergenIconText: {
    fontSize: 16,
  },
  foodEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  foodName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: 2,
  },
  foodCategory: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingFooterText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Allergen Warning Modal
  allergenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  allergenModalCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  allergenModalIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  allergenModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 12,
    textAlign: 'center',
  },
  allergenModalText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  allergenModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  allergenGoBackButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  allergenGoBackText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  allergenUnderstandButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.accentOrange,
    alignItems: 'center',
  },
  allergenUnderstandText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Product Tour Tooltip
  tooltipOverlay: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  tooltipCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipText: {
    fontSize: 14,
    color: COLORS.background,
    marginBottom: 12,
    lineHeight: 20,
  },
  tooltipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.accentOrange,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  tooltipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
});