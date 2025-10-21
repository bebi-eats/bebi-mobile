import { Food } from '../../types';

export class FoodService {
  async searchFoods(params: {
    query?: string;
    category?: string;
    babyAgeMonths?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ foods: Food[]; hasMore: boolean }> {
    // MVP: return a few sample foods so the UI works
    const sample: Food[] = [
      { id: 'banana', name: 'Banana', emoji: '🍌' },
      { id: 'avocado', name: 'Avocado', emoji: '🥑' },
      { id: 'oatmeal', name: 'Oatmeal', emoji: '🥣' },
    ];
    return { foods: sample, hasMore: false };
  }

  async getCategories(babyAgeMonths?: number): Promise<string[]> {
    return ['Produce', 'Proteins', 'Grains', 'Dairy', 'Fats'];
  }
}
