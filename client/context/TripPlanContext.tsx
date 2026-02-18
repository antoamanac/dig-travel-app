import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { City } from "@/data/mockData";

export interface ChildrenByAgeGroup {
  "0-3": number;
  "4-10": number;
  "11+": number;
}

export interface TripPlanRequest {
  destination: string;
  destinationCity: City | null;
  mode: "FREE" | "PILOT";
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  travelers: {
    adults: number;
    children: number;
    childrenAgeGroups: string[];
    childrenByAgeGroup: ChildrenByAgeGroup;
  };
  context: "COUPLE" | "FAMILY" | "FRIENDS" | "SOLO" | null;
  pace: "RELAX" | "BALANCED" | "INTENSE";
  interests: string[];
  budgetTier: "ECONOMY" | "MODERATE" | "COMFORT";
  transport: "SELF" | "CAR_RENTAL" | "DRIVER" | "UNSURE" | null;
}

const DEFAULT_TRIP_PLAN: TripPlanRequest = {
  destination: "",
  destinationCity: null,
  mode: "PILOT",
  startDate: null,
  endDate: null,
  durationDays: 0,
  travelers: {
    adults: 2,
    children: 0,
    childrenAgeGroups: [],
    childrenByAgeGroup: { "0-3": 0, "4-10": 0, "11+": 0 },
  },
  context: null,
  pace: "BALANCED",
  interests: [],
  budgetTier: "MODERATE",
  transport: null,
};

const STORAGE_KEY = "@dig_pilot_draft";
const PILOT_SEEN_KEY = "@dig_pilot_seen";

interface TripPlanContextType {
  tripPlan: TripPlanRequest;
  pilotSeen: boolean;
  updateTripPlan: (updates: Partial<TripPlanRequest>) => void;
  resetTripPlan: () => void;
  setPilotSeen: () => void;
  saveDraft: () => Promise<void>;
  loadDraft: () => Promise<void>;
  clearDraft: () => Promise<void>;
}

const TripPlanContext = createContext<TripPlanContextType | undefined>(undefined);

export function TripPlanProvider({ children }: { children: ReactNode }) {
  const [tripPlan, setTripPlan] = useState<TripPlanRequest>(DEFAULT_TRIP_PLAN);
  const [pilotSeen, setPilotSeenState] = useState(false);

  useEffect(() => {
    loadPilotSeen();
  }, []);

  const loadPilotSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem(PILOT_SEEN_KEY);
      setPilotSeenState(seen === "true");
    } catch (error) {
      console.log("Error loading pilot seen state:", error);
    }
  };

  const setPilotSeen = async () => {
    try {
      await AsyncStorage.setItem(PILOT_SEEN_KEY, "true");
      setPilotSeenState(true);
    } catch (error) {
      console.log("Error saving pilot seen state:", error);
    }
  };

  const updateTripPlan = (updates: Partial<TripPlanRequest>) => {
    setTripPlan((prev) => {
      const updated = { ...prev, ...updates };
      if (updates.startDate || updates.endDate) {
        const start = updates.startDate ? new Date(updates.startDate) : (prev.startDate ? new Date(prev.startDate) : null);
        const end = updates.endDate ? new Date(updates.endDate) : (prev.endDate ? new Date(prev.endDate) : null);
        if (start && end) {
          updated.durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
      return updated;
    });
  };

  const resetTripPlan = () => {
    setTripPlan(DEFAULT_TRIP_PLAN);
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        ...tripPlan,
        destinationCity: tripPlan.destinationCity ? {
          id: tripPlan.destinationCity.id,
          name: tripPlan.destinationCity.name,
        } : null,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draftData));
    } catch (error) {
      console.log("Error saving draft:", error);
    }
  };

  const loadDraft = async () => {
    try {
      const draft = await AsyncStorage.getItem(STORAGE_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setTripPlan({ ...DEFAULT_TRIP_PLAN, ...parsed });
      }
    } catch (error) {
      console.log("Error loading draft:", error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      resetTripPlan();
    } catch (error) {
      console.log("Error clearing draft:", error);
    }
  };

  return (
    <TripPlanContext.Provider
      value={{
        tripPlan,
        pilotSeen,
        updateTripPlan,
        resetTripPlan,
        setPilotSeen,
        saveDraft,
        loadDraft,
        clearDraft,
      }}
    >
      {children}
    </TripPlanContext.Provider>
  );
}

export function useTripPlan() {
  const context = useContext(TripPlanContext);
  if (!context) {
    throw new Error("useTripPlan must be used within a TripPlanProvider");
  }
  return context;
}
