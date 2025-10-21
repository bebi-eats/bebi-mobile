export class BabyProfileService {
  async addAllergen(babyId: string, allergen: string): Promise<boolean> {
    console.log('addAllergen (stub)', { babyId, allergen });
    return true;
  }
}
