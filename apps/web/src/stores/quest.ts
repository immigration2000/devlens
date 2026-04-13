import { create } from "zustand";
import api, { Quest } from "@/lib/api";

export interface QuestState {
  quests: Quest[];
  selectedQuest: Quest | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setQuests: (quests: Quest[]) => void;
  selectQuest: (quest: Quest) => void;
  clearSelection: () => void;
  fetchQuests: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  quests: [],
  selectedQuest: null,
  isLoading: false,
  error: null,

  setQuests: (quests) =>
    set({
      quests,
      error: null,
    }),

  selectQuest: (quest) =>
    set({
      selectedQuest: quest,
    }),

  clearSelection: () =>
    set({
      selectedQuest: null,
    }),

  setLoading: (loading) =>
    set({
      isLoading: loading,
    }),

  setError: (error) =>
    set({
      error,
    }),

  fetchQuests: async () => {
    set({ isLoading: true, error: null });
    try {
      const quests = await api.listQuests();
      set({ quests, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch quests";
      set({ error: errorMessage, isLoading: false });
    }
  },
}));

export default useQuestStore;
