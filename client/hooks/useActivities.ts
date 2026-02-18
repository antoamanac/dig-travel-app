import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

export interface Activity {
  id: string;
  operatorId?: string;
  operatorName?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  cityId: string;
  duration: string;
  maxPeople: number;
  images: string[];
  image: string;
  includes: string[];
  excludes: string[];
  rating: number;
  reviewCount: number;
  status: string;
  operator?: string;
  included?: string[];
  notIncluded?: string[];
}

interface ActivitiesResponse {
  activities: Activity[];
  count: number;
  updatedAt: string;
}

interface ActivityResponse {
  activity: Activity;
}

function normalizeActivity(a: Activity): Activity {
  return {
    ...a,
    images: a.images || [],
    image: a.image || (a.images && a.images[0]) || "",
    includes: a.includes || [],
    excludes: a.excludes || [],
    operator: a.operatorName || a.operator || "DIG TRAVEL",
    included: a.includes || a.included || [],
    notIncluded: a.excludes || a.notIncluded || [],
  };
}

export function useActivities(cityId?: string, category?: string) {
  return useQuery<Activity[]>({
    queryKey: ["/api/activities", { cityId, category }],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const params = new URLSearchParams();
      if (cityId) params.append("city", cityId);
      if (category && category !== "all") params.append("category", category);
      params.append("status", "active");
      
      const url = new URL(`/api/activities?${params.toString()}`, baseUrl);
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activities");
      const data: ActivitiesResponse = await response.json();
      return data.activities.map(normalizeActivity);
    },
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useActivity(id: string) {
  return useQuery<Activity>({
    queryKey: ["/api/activities", id],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/activities/${id}`, baseUrl);
      const response = await fetch(url.toString(), { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch activity");
      const data: ActivityResponse = await response.json();
      return normalizeActivity(data.activity);
    },
    enabled: !!id,
    staleTime: 5000,
  });
}

export function useActivitiesByCity(cityId: string) {
  return useActivities(cityId);
}
