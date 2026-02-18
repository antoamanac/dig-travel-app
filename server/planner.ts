import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { query } from "./db";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PlannerRequest {
  cityId: string;
  cityName: string;
  startDate: string;
  endDate: string;
  numPeople: number;
  context?: string; // COUPLE, FAMILY, FRIENDS, SOLO
  preferences: {
    rhythm: string;
    interests: string[];
    budget: string;
    carRental: boolean;
    driver: boolean;
  };
}

interface PlannedActivity {
  id: string;
  title: string;
  time: string;
  duration: string;
  category: string;
  price: number;
  currency: string;
  isBreak?: boolean;
}

interface DayPlan {
  date: string;
  dayLabel: string;
  activities: PlannedActivity[];
}

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { cityId, cityName, startDate, endDate, numPeople, context, preferences } = req.body as PlannerRequest;

    const activitiesResult = await query(
      `SELECT id, title, description, price, currency, category, duration, rating, tags
       FROM activities 
       WHERE city_id = $1 AND status = 'active'
       ORDER BY rating DESC NULLS LAST
       LIMIT 50`,
      [cityId]
    );

    let availableActivities = activitiesResult.rows;
    
    // Map context to tag for filtering
    const contextTagMap: Record<string, string> = {
      'COUPLE': 'couple',
      'FAMILY': 'family',
      'FRIENDS': 'friends',
      'SOLO': 'solo'
    };
    
    const contextTag = context ? contextTagMap[context] : null;
    
    // Prioritize activities matching the context tag
    if (contextTag) {
      const matchingActivities = availableActivities.filter(a => 
        (a.tags || []).includes(contextTag)
      );
      const otherActivities = availableActivities.filter(a => 
        !(a.tags || []).includes(contextTag)
      );
      // Put matching activities first, then others
      availableActivities = [...matchingActivities, ...otherActivities];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const activitiesPerDay = preferences.rhythm === "relax" ? 2 : preferences.rhythm === "intense" ? 4 : 3;

    const contextLabel = context === 'COUPLE' ? 'en couple' : 
                         context === 'FAMILY' ? 'en famille' : 
                         context === 'FRIENDS' ? 'entre amis' : 
                         context === 'SOLO' ? 'en solo' : '';

    const prompt = `Tu es un expert en planification de voyages. Cree un planning de vacances pour ${tripDays} jours a ${cityName}.

Preferences du voyageur:
- Rythme: ${preferences.rhythm} (${activitiesPerDay} activites par jour)
- Interets: ${preferences.interests.join(", ")}
- Budget: ${preferences.budget}
- Nombre de personnes: ${numPeople}
${contextLabel ? `- Voyage ${contextLabel}` : ''}
${preferences.carRental ? "- A une voiture de location" : ""}
${preferences.driver ? "- A un chauffeur" : ""}

Activites disponibles (certaines sont adaptees au contexte ${contextLabel}):
${availableActivities.map(a => {
      const tags = (a.tags || []).length > 0 ? ` [${a.tags.join(', ')}]` : '';
      return `- ${a.title} (${a.category}, ${a.duration || "2h"}, ${a.price}${a.currency || "EUR"})${tags}`;
    }).join("\n")}

Cree un planning JSON avec le format suivant. REPONDS UNIQUEMENT AVEC LE JSON, sans texte avant ou apres:
{
  "planning": [
    {
      "date": "2024-01-15",
      "dayLabel": "lundi 15 janvier",
      "activities": [
        {
          "id": "uuid-de-lactivite",
          "title": "Nom de l'activite",
          "time": "09:00",
          "duration": "2h",
          "category": "culture",
          "price": 25,
          "currency": "EUR"
        }
      ]
    }
  ]
}

Regles:
- Inclus des pauses "Temps libre" entre les activites (isBreak: true, time: "", price: 0)
- Repartis les activites de facon logique (pas 3 activites physiques le meme jour)
- Commence le planning le ${start.toISOString().split("T")[0]}
- Alterne entre les types d'activites selon les interets
- Respecte le budget et le rythme souhaite
${contextLabel ? `- IMPORTANT: Privilegie les activites adaptees a un voyage ${contextLabel}` : ''}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un assistant de planification de voyages. Reponds uniquement en JSON valide." },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    let planningData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planningData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      planningData = generateFallbackPlanning(start, end, availableActivities, preferences, activitiesPerDay);
    }

    res.json(planningData);
  } catch (error) {
    console.error("Planner generation error:", error);
    res.status(500).json({ error: "Failed to generate planning" });
  }
});

function generateFallbackPlanning(
  start: Date,
  end: Date,
  activities: any[],
  preferences: any,
  activitiesPerDay: number
): { planning: DayPlan[] } {
  const days: DayPlan[] = [];
  let currentDate = new Date(start);
  let activityIndex = 0;

  while (currentDate <= end) {
    const dayActivities: PlannedActivity[] = [];

    for (let i = 0; i < activitiesPerDay; i++) {
      if (activityIndex < activities.length) {
        const activity = activities[activityIndex % activities.length];
        const hour = 9 + (i * 3);
        
        dayActivities.push({
          id: activity.id,
          title: activity.title,
          time: `${hour.toString().padStart(2, "0")}:00`,
          duration: activity.duration || "2h",
          category: activity.category || "culture",
          price: parseFloat(activity.price) || 0,
          currency: activity.currency || "EUR",
        });

        if (i < activitiesPerDay - 1) {
          dayActivities.push({
            id: `break-${currentDate.toISOString()}-${i}`,
            title: "Temps libre",
            time: "",
            duration: "1h",
            category: "break",
            price: 0,
            currency: "EUR",
            isBreak: true,
          });
        }

        activityIndex++;
      }
    }

    days.push({
      date: currentDate.toISOString(),
      dayLabel: currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      activities: dayActivities,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { planning: days };
}

export default router;
