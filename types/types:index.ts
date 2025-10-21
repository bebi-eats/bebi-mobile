export type MealType = 'breakfast'|'lunch'|'dinner'|'snack';

export interface Food { id: string; name: string; emoji: string; }
export type Reaction = 'yum'|'good'|'meh'|'yuck';
export type Amount = 'none'|'some'|'most'|'all';
export type Allergy = 'none'|'mild'|'severe';

export interface PlannedFood {
  food: Food;
  logged?: boolean;
  reaction?: Reaction;
  amount?: Amount;
  allergy?: Allergy;
}

export interface MealPlan {
  id: string;
  date: string;                // YYYY-MM-DD
  meal_type: MealType;
  planned_foods: PlannedFood[];
  completed?: boolean;         // true if fully logged
  status?: 'planned'|'partial'|'complete'; // optional override
  notes?: string;
}

export interface FoodLog {
  food: Food;
  logged?: boolean;
  reaction?: Reaction;
  amount?: Amount;
  allergy?: Allergy;
}

export interface FoodStats {
  firstIntroduced: string | null;   // YYYY-MM-DD
  totalServings: number;
  lastServedDaysAgo: number | null;
}

export interface FoodHistoryEntry {
  date: string;   // YYYY-MM-DD
  reaction?: Reaction;
  amount?: Amount;
  allergy?: Allergy;
  notes?: string;
}

export const COLORS = {
  background: '#FFFFFF',
  foreground: '#111827',
  primary: '#111827',
  secondary: '#FFFFFF',
  border: '#E5E7EB',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  accentOrange: '#F97316',
};
