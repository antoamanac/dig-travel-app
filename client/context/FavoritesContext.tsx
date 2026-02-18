import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Activity } from "@/data/mockData";

interface FavoritesContextType {
  favorites: Activity[];
  isFavorite: (activityId: string) => boolean;
  toggleFavorite: (activity: Activity) => Promise<void>;
  clearFavorites: () => Promise<void>;
  favoritesCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_KEY = "@dig_travel_favorites";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Activity[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const saveFavorites = async (newFavorites: Activity[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  const isFavorite = useCallback((activityId: string) => {
    return favorites.some((fav) => fav.id === activityId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (activity: Activity) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === activity.id);
    let newFavorites: Activity[];

    if (isAlreadyFavorite) {
      newFavorites = favorites.filter((fav) => fav.id !== activity.id);
    } else {
      newFavorites = [...favorites, activity];
    }

    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  }, [favorites]);

  const clearFavorites = useCallback(async () => {
    setFavorites([]);
    await AsyncStorage.removeItem(FAVORITES_KEY);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        clearFavorites,
        favoritesCount: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
