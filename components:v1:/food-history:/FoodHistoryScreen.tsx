// =============================================================================
// FOOD HISTORY SCREEN - NEW COMPONENT
// Implements US-041 to US-045: Individual food tracking history
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

// Domain services
import { FoodHistoryService } from '../domain/food/FoodHistoryService';
import { MealPlanService } from '../domain/meal-planning/MealPlanService';

// Shared types
import { Food, FoodLog, COLORS } from '../types';

interface FoodHistoryEntry {
  id: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  reaction?: 'yum' | 'good' | 'meh' | 'yuck';
  amount?: 'none' | 'some' | 'most' | 'all';
  allergy?: 'none' | 'mild' | 'severe';
  notes?: string;
  isToday: boolean;
}

interface FoodStats {
  firstIntroduced: string;
  totalServings: number;
  favoriteMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  averageAmount: string;
  lastServed: string;
}

interface Props {
  food: Food;
  babyId: string;
  foodHistoryService: FoodHistoryService;
  mealPlanService: MealPlanService;
  onClose: () => void;
  onEditTodayLog?: () => void; // Navigate back to logging modal
}

const REACTION_EMOJIS = {
  yum: '😍',
  good: '😊',
  meh: '😐',
  yuck: '🤢',
};

const MEAL_ICONS = {
  breakfast: '🥐',
  lunch: '🍱',
  dinner: '🌙',
  snack: '🍪',
};

export const FoodHistoryScreen: React.FC<Props> = ({
  food,
  babyId,
  foodHistoryService,
  mealPlanService,
  onClose,
  onEditTodayLog,
}) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FoodStats | null>(null);
  const [history, setHistory] = useState<FoodHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFoodHistory();
  }, [food.id, babyId]);

  const loadFoodHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // US-041: Load stats and history
      const [statsData, historyData] = await Promise.all([
        foodHistoryService.getFoodStats(babyId, food.id),
        foodHistoryService.getFoodHistory(babyId, food.id),
      ]);

      setStats(statsData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load food history:', err);
      setError('Failed to load food history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // US-044: Edit today's log if present
  const handleEditTodayLog = () => {
    if (onEditTodayLog) {
      onEditTodayLog();
    } else {
      Alert.alert(
        'Edit Log',
        'Go to Today View to edit this food log.',
        [{ text: 'OK' }]
      );
    }
  };

  // Render stats section (US-041)
  const renderStats = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>First Introduced</Text>
          <Text style={styles.statValue}>
            {new Date(stats.firstIntroduced).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Servings</Text>
          <Text style={styles.statValue}>{stats.totalServings}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Favorite Meal</Text>
          <Text style={styles.statValue}>
            {MEAL_ICONS[stats.favoriteMealType]}{' '}
            {stats.favoriteMealType.charAt(0).toUpperCase() + stats.favoriteMealType.slice(1)}
          </Text>
        </View>
      </View>
    );
  };

  // Render history timeline (US-042, US-043)
  const renderHistory = () => {
    if (history.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No feeding history yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start logging meals to track {food.name}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Feeding History</Text>
        {history.map((entry, index) => (
          <View key={entry.id} style={styles.historyCard}>
            {/* Date and Meal Type */}
            <View style={styles.historyHeader}>
              <View style={styles.historyDateRow}>
                <Text style={styles.historyIcon}>
                  {MEAL_ICONS[entry.mealType]}
                </Text>
                <View>
                  <Text style={styles.historyDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.historyMeal}>
                    {entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1)}
                  </Text>
                </View>
              </View>

              {/* US-044: Edit button for today's log */}
              {entry.isToday && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={handleEditTodayLog}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reaction and Amount */}
            <View style={styles.historyDetails}>
              {entry.reaction && (
                <View style={styles.historyBadge}>
                  <Text style={styles.badgeEmoji}>
                    {REACTION_EMOJIS[entry.reaction]}
                  </Text>
                  <Text style={styles.badgeText}>
                    {entry.reaction.charAt(0).toUpperCase() + entry.reaction.slice(1)}
                  </Text>
                </View>
              )}

              {entry.amount && (
                <View style={styles.historyBadge}>
                  <Text style={styles.badgeText}>
                    {entry.amount.charAt(0).toUpperCase() + entry.amount.slice(1)}
                  </Text>
                </View>
              )}

              {entry.allergy && entry.allergy !== 'none' && (
                <View style={[styles.historyBadge, styles.allergyBadge]}>
                  <Text style={styles.badgeText}>⚠️ {entry.allergy}</Text>
                </View>
              )}
            </View>

            {/* Notes */}
            {entry.notes && (
              <Text style={styles.historyNotes}>{entry.notes}</Text>
            )}

            {/* Timeline connector (except for last item) */}
            {index < history.length - 1 && (
              <View style={styles.timelineConnector} />
            )}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food History</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accentOrange} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food History</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadFoodHistory}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Food Info */}
        <View style={styles.foodSection}>
          <Text style={styles.foodEmoji}>{food.emoji}</Text>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.category && (
            <Text style={styles.foodCategory}>{food.category}</Text>
          )}
        </View>

        {/* Stats Cards */}
        {renderStats()}

        {/* History Timeline */}
        {renderHistory()}
      </ScrollView>
    </View>
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
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.background,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.background,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Food Section
  foodSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foodEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 4,
  },
  foodCategory: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 8,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
  },

  // History Section
  historySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.foreground,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIcon: {
    fontSize: 24,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  historyMeal: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.accentOrange,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.background,
  },
  historyDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  allergyBadge: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.error,
  },
  badgeEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  historyNotes: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  timelineConnector: {
    position: 'absolute',
    left: 34,
    bottom: -16,
    width: 2,
    height: 16,
    backgroundColor: COLORS.border,
  },

  // Empty State
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.mutedForeground,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: 'center',
  },
});