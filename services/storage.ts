import AsyncStorage from '@react-native-async-storage/async-storage';
import { TravelSchedule } from './ia/generator';

const STORAGE_KEY = '@wise_traveler_history';

export interface SavedTrip {
  id: string;
  city: string;
  days: number;
  date: string; // Nova informação
  schedule: TravelSchedule;
}

export const tripStorage = {
  // Salvar novo roteiro
  async save(trip: SavedTrip) {
    try {
      const stored = await this.getAll();
      const newHistory = [trip, ...stored]; // Adiciona no topo
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Erro ao salvar", e);
    }
  },

  // Pegar todos
  async getAll(): Promise<SavedTrip[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (e) {
      return [];
    }
  },

  // Limpar (opcional, para testes)
  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
};