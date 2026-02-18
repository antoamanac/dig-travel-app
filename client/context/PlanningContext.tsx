import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PlannedActivity {
  id: string;
  title: string;
  time: string;
  duration: string;
  category: string;
  price: number;
  currency: string;
  isBreak?: boolean;
  paymentStatus?: "pending" | "paid";
  isCustom?: boolean;
  note?: string;
  sourceActivityId?: string;
}

interface DayPlan {
  date: string;
  dayLabel: string;
  activities: PlannedActivity[];
}

interface SavedPlanning {
  cityId: string;
  cityName: string;
  currency: string;
  planning: DayPlan[];
  createdAt: string;
  totalPrice: number;
}

interface PlanningContextType {
  currentPlanning: SavedPlanning | null;
  savePlanning: (planning: SavedPlanning) => Promise<void>;
  loadPlanning: () => Promise<SavedPlanning | null>;
  clearPlanning: () => Promise<void>;
  updateActivity: (dayIndex: number, activityId: string, newActivity: PlannedActivity) => Promise<void>;
  removeActivity: (dayIndex: number, activityId: string) => Promise<void>;
  addCustomActivity: (dayIndex: number, activity: PlannedActivity) => Promise<void>;
  updatePaymentStatus: (dayIndex: number, activityId: string, status: "pending" | "paid") => Promise<void>;
  updateNote: (dayIndex: number, activityId: string, note: string) => Promise<void>;
  hasPlanning: boolean;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

const PLANNING_STORAGE_KEY = "@dig_travel_planning";

export function PlanningProvider({ children }: { children: React.ReactNode }) {
  const [currentPlanning, setCurrentPlanning] = useState<SavedPlanning | null>(null);
  const [hasPlanning, setHasPlanning] = useState(false);

  useEffect(() => {
    loadPlanning();
  }, []);

  const savePlanning = useCallback(async (planning: SavedPlanning) => {
    try {
      await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(planning));
      setCurrentPlanning(planning);
      setHasPlanning(true);
    } catch (error) {
      console.error("Failed to save planning:", error);
    }
  }, []);

  const loadPlanning = useCallback(async (): Promise<SavedPlanning | null> => {
    try {
      const stored = await AsyncStorage.getItem(PLANNING_STORAGE_KEY);
      if (stored) {
        const planning = JSON.parse(stored) as SavedPlanning;
        setCurrentPlanning(planning);
        setHasPlanning(true);
        return planning;
      }
      setHasPlanning(false);
      return null;
    } catch (error) {
      console.error("Failed to load planning:", error);
      setHasPlanning(false);
      return null;
    }
  }, []);

  const clearPlanning = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PLANNING_STORAGE_KEY);
      setCurrentPlanning(null);
      setHasPlanning(false);
    } catch (error) {
      console.error("Failed to clear planning:", error);
    }
  }, []);

  const updateActivity = useCallback(async (dayIndex: number, activityId: string, newActivity: PlannedActivity) => {
    if (!currentPlanning) return;
    
    try {
      const updatedPlanning = { ...currentPlanning };
      const dayPlan = updatedPlanning.planning[dayIndex];
      
      if (dayPlan) {
        const activityIndex = dayPlan.activities.findIndex(a => a.id === activityId);
        if (activityIndex !== -1) {
          const oldActivity = dayPlan.activities[activityIndex];
          dayPlan.activities[activityIndex] = {
            ...newActivity,
            time: oldActivity.time,
            duration: oldActivity.duration,
          };
          
          // Recalculate total price
          let totalPrice = 0;
          updatedPlanning.planning.forEach(day => {
            day.activities.forEach(act => {
              if (!act.isBreak) {
                totalPrice += act.price;
              }
            });
          });
          updatedPlanning.totalPrice = totalPrice;
          
          await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedPlanning));
          setCurrentPlanning(updatedPlanning);
        }
      }
    } catch (error) {
      console.error("Failed to update activity:", error);
    }
  }, [currentPlanning]);

  const removeActivity = useCallback(async (dayIndex: number, activityId: string) => {
    if (!currentPlanning) return;
    
    try {
      const updatedPlanning = { ...currentPlanning };
      const dayPlan = updatedPlanning.planning[dayIndex];
      
      if (dayPlan) {
        dayPlan.activities = dayPlan.activities.filter(a => a.id !== activityId);
        
        // Recalculate total price
        let totalPrice = 0;
        updatedPlanning.planning.forEach(day => {
          day.activities.forEach(act => {
            if (!act.isBreak) {
              totalPrice += act.price;
            }
          });
        });
        updatedPlanning.totalPrice = totalPrice;
        
        await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedPlanning));
        setCurrentPlanning(updatedPlanning);
      }
    } catch (error) {
      console.error("Failed to remove activity:", error);
    }
  }, [currentPlanning]);

  const addCustomActivity = useCallback(async (dayIndex: number, activity: PlannedActivity) => {
    if (!currentPlanning) return;
    
    try {
      const updatedPlanning = { ...currentPlanning };
      const dayPlan = updatedPlanning.planning[dayIndex];
      
      if (dayPlan) {
        dayPlan.activities.push({
          ...activity,
          isCustom: true,
          paymentStatus: "pending",
        });
        
        // Recalculate total price
        let totalPrice = 0;
        updatedPlanning.planning.forEach(day => {
          day.activities.forEach(act => {
            if (!act.isBreak) {
              totalPrice += act.price;
            }
          });
        });
        updatedPlanning.totalPrice = totalPrice;
        
        await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedPlanning));
        setCurrentPlanning(updatedPlanning);
      }
    } catch (error) {
      console.error("Failed to add custom activity:", error);
    }
  }, [currentPlanning]);

  const updatePaymentStatus = useCallback(async (dayIndex: number, activityId: string, status: "pending" | "paid") => {
    if (!currentPlanning) return;
    
    try {
      const updatedPlanning = { ...currentPlanning };
      const dayPlan = updatedPlanning.planning[dayIndex];
      
      if (dayPlan) {
        const activityIndex = dayPlan.activities.findIndex(a => a.id === activityId);
        if (activityIndex !== -1) {
          dayPlan.activities[activityIndex].paymentStatus = status;
          
          await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedPlanning));
          setCurrentPlanning(updatedPlanning);
        }
      }
    } catch (error) {
      console.error("Failed to update payment status:", error);
    }
  }, [currentPlanning]);

  const updateNote = useCallback(async (dayIndex: number, activityId: string, note: string) => {
    if (!currentPlanning) return;
    
    try {
      const updatedPlanning = { ...currentPlanning };
      const dayPlan = updatedPlanning.planning[dayIndex];
      
      if (dayPlan) {
        const activityIndex = dayPlan.activities.findIndex(a => a.id === activityId);
        if (activityIndex !== -1) {
          dayPlan.activities[activityIndex].note = note;
          
          await AsyncStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(updatedPlanning));
          setCurrentPlanning(updatedPlanning);
        }
      }
    } catch (error) {
      console.error("Failed to update note:", error);
    }
  }, [currentPlanning]);

  return (
    <PlanningContext.Provider
      value={{
        currentPlanning,
        savePlanning,
        loadPlanning,
        clearPlanning,
        updateActivity,
        removeActivity,
        addCustomActivity,
        updatePaymentStatus,
        updateNote,
        hasPlanning,
      }}
    >
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const context = useContext(PlanningContext);
  if (context === undefined) {
    throw new Error("usePlanning must be used within a PlanningProvider");
  }
  return context;
}
