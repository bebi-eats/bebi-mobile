import { Food, FoodHistoryEntry, FoodStats } from '../../types';

export class FoodHistoryService {
  async getFoodStats(babyId: string, food: Food): Promise<FoodStats> {
    return {
      firstIntroduced: null,
      totalServings: 0,
      lastServedDaysAgo: null,
    };
  }

  async getFoodHistory(babyId: string, food: Food): Promise<FoodHistoryEntry[]> {
    return []; // empty list is fine for MVP
  }
}
