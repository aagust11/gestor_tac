import { create } from 'zustand';

export const useAppStore = create((set) => ({
  salutacio: 'Benvingut/da al Gestor TAC',
  setSalutacio: (salutacio) => set({ salutacio })
}));
