import React from 'react';
import { SafeAreaView } from 'react-native';
import MealPlanningScreen from './components/meal-planning/MealPlanningScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MealPlanningScreen />
    </SafeAreaView>
  );
}
