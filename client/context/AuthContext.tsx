import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OperatorProfile {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string | null;
  logoUrl: string | null;
  cities: string[];
}

interface AuthContextType {
  token: string | null;
  profile: Profile | null;
  operatorProfile: OperatorProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOperator: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isOperator?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "@dig_travel_token";
const GUEST_KEY = "@dig_travel_guest";

const OPERATOR_TOKEN_KEY = "@dig_travel_operator_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [operatorProfile, setOperatorProfile] = useState<OperatorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isOperator, setIsOperator] = useState(false);

  const fetchSession = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(new URL("/api/auth/session", getApiUrl()).toString(), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        return true;
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setProfile(null);
        return false;
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (token) {
      await fetchSession(token);
    }
  }, [token, fetchSession]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const guestMode = await AsyncStorage.getItem(GUEST_KEY);
        
        if (storedToken) {
          setToken(storedToken);
          const isValid = await fetchSession(storedToken);
          if (!isValid) {
            setIsGuest(true);
            await AsyncStorage.setItem(GUEST_KEY, "true");
          }
        } else {
          setIsGuest(true);
          if (guestMode !== "true") {
            await AsyncStorage.setItem(GUEST_KEY, "true");
          }
        }
      } catch (error) {
        console.error("Error loading token:", error);
        setIsGuest(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, [fetchSession]);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
  }, []);

  const exitGuestMode = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userResponse = await fetch(new URL("/api/auth/login", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (userResponse.ok) {
        const data = await userResponse.json();
        await AsyncStorage.setItem(TOKEN_KEY, data.token);
        await AsyncStorage.removeItem(GUEST_KEY);
        await AsyncStorage.removeItem(OPERATOR_TOKEN_KEY);
        setToken(data.token);
        setProfile(data.user);
        setOperatorProfile(null);
        setIsOperator(false);
        setIsGuest(false);
        return { error: null, isOperator: false };
      }

      const operatorResponse = await fetch(new URL("/api/operator/auth/login", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (operatorResponse.ok) {
        const data = await operatorResponse.json();
        await AsyncStorage.setItem(OPERATOR_TOKEN_KEY, data.token);
        await AsyncStorage.removeItem(GUEST_KEY);
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(data.token);
        setOperatorProfile(data.operator);
        setProfile(null);
        setIsOperator(true);
        setIsGuest(false);
        return { error: null, isOperator: true };
      }

      const userData = await userResponse.json().catch(() => ({}));
      return { error: new Error(userData.error || "Identifiants incorrects") };
    } catch (error: any) {
      return { error: new Error(error.message || "Erreur de connexion") };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(new URL("/api/auth/register", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Erreur d'inscription") };
      }

      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.removeItem(GUEST_KEY);
      setToken(data.token);
      setProfile(data.user);
      setIsGuest(false);

      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || "Erreur d'inscription") };
    }
  };

  const signOut = async () => {
    try {
      if (token) {
        const logoutUrl = isOperator ? "/api/operator/auth/logout" : "/api/auth/logout";
        await fetch(new URL(logoutUrl, getApiUrl()).toString(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(OPERATOR_TOKEN_KEY);
      setToken(null);
      setProfile(null);
      setOperatorProfile(null);
      setIsOperator(false);
      setIsGuest(true);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!token) {
      return { error: new Error("Non connecté") };
    }

    try {
      const response = await fetch(new URL("/api/auth/profile", getApiUrl()).toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Erreur de mise à jour") };
      }

      setProfile(data.user);
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || "Erreur de mise à jour") };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        profile,
        operatorProfile,
        isLoading,
        isAuthenticated: !!token && (!!profile || !!operatorProfile),
        isOperator,
        isGuest,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        continueAsGuest,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
