import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { City } from "@/data/mockData";
import { getCityTheme, type CityTheme } from "@/constants/cityThemes";

interface CityContextType {
  currentCity: City | null;
  setCurrentCity: (city: City) => void;
  cityTheme: CityTheme;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [currentCity, setCurrentCityState] = useState<City | null>(null);

  const setCurrentCity = useCallback((city: City) => {
    setCurrentCityState(city);
  }, []);

  const cityTheme = useMemo(() => getCityTheme(currentCity?.id), [currentCity?.id]);

  return (
    <CityContext.Provider value={{ currentCity, setCurrentCity, cityTheme }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const context = useContext(CityContext);
  if (context === undefined) {
    throw new Error("useCity must be used within a CityProvider");
  }
  return context;
}

export function useCityTheme(): CityTheme {
  const { cityTheme } = useCity();
  return cityTheme;
}
