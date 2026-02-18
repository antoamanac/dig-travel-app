import { query, pool } from "./db";
import { createHash } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export async function seedDatabase() {
  try {
    console.log("Seeding database...");

    const existingOperator = await query("SELECT id FROM operators WHERE email = $1", ["admin@digtravel.com"]);
  
  if (existingOperator.rows.length === 0) {
    const result = await query(
      `INSERT INTO operators (email, password_hash, company_name, contact_name, phone, cities, commission_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        "admin@digtravel.com",
        hashPassword("admin123"),
        "DIG TRAVEL Admin",
        "Administrateur",
        "+213 555 000 000",
        ["alger", "dubai", "losangeles", "phuket", "marrakech"],
        12
      ]
    );
    console.log("Created admin operator:", result.rows[0].id);

    const operatorId = result.rows[0].id;

    const sampleActivities = [
      {
        title: "Session Jet Ski Club des Pins",
        description: "Profitez d'une session inoubliable de jet ski sur les magnifiques plages du Club des Pins. Équipement professionnel et moniteur certifié inclus.",
        price: 12000,
        currency: "DZD",
        category: "plage",
        cityId: "alger",
        duration: "1h",
        maxPeople: 2,
        images: ["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"],
        includes: ["Équipement complet", "Assurance", "Photos souvenir", "Vestiaires"],
        excludes: ["Transport", "Repas"],
        status: "active",
        location: "Club des Pins, Alger"
      },
      {
        title: "Dîner Gastronomique Étoilé",
        description: "Expérience culinaire unique au coeur d'Alger. Menu dégustation 7 plats avec vue panoramique sur la baie.",
        price: 18000,
        currency: "DZD",
        category: "restaurant",
        cityId: "alger",
        duration: "3h",
        maxPeople: 8,
        images: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"],
        includes: ["Menu dégustation", "Vin accompagnement", "Service VIP", "Parking"],
        excludes: ["Boissons supplémentaires"],
        status: "active",
        location: "Port d'Alger, Alger"
      },
      {
        title: "Safari Désert Premium",
        description: "Vivez l'aventure du désert avec dune bashing, balade à dos de chameau et dîner sous les étoiles.",
        price: 450,
        currency: "AED",
        category: "aventure",
        cityId: "dubai",
        duration: "6h",
        maxPeople: 20,
        images: ["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800"],
        includes: ["Transport 4x4", "Dune bashing", "Chameau", "Dîner BBQ", "Spectacles"],
        excludes: ["Boissons alcoolisées", "Photos professionnelles"],
        status: "active",
        location: "Desert de Dubai, Dubai"
      },
      {
        title: "Burj Khalifa At The Top",
        description: "Montez au sommet du plus haut building du monde pour une vue à 360° sur Dubai.",
        price: 350,
        currency: "AED",
        category: "circuits",
        cityId: "dubai",
        duration: "2h",
        maxPeople: 10,
        images: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"],
        includes: ["Billet coupe-file", "Accès 148ème étage", "Rafraîchissements", "Guide audio"],
        excludes: ["Transport", "Repas"],
        status: "active",
        location: "Downtown Dubai"
      },
      {
        title: "Excursion Phi Phi Islands",
        description: "Découvrez les îles paradisiaques de Phi Phi, snorkeling dans les eaux cristallines et plages de rêve.",
        price: 2500,
        currency: "THB",
        category: "plage",
        cityId: "phuket",
        duration: "Journée",
        maxPeople: 30,
        images: ["https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800"],
        includes: ["Speedboat A/R", "Déjeuner", "Équipement snorkeling", "Guide francophone"],
        excludes: ["Frais parc national", "Boissons"],
        status: "active",
        location: "Phi Phi Islands, Phuket"
      },
      {
        title: "Hammam Royal & Massage",
        description: "Expérience spa complète dans le plus beau riad de la médina. Hammam traditionnel et massage relaxant.",
        price: 850,
        currency: "MAD",
        category: "spa",
        cityId: "marrakech",
        duration: "3h",
        maxPeople: 4,
        images: ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"],
        includes: ["Hammam", "Gommage", "Massage 60min", "Thé & pâtisseries"],
        excludes: ["Soins supplémentaires", "Produits"],
        status: "active",
        location: "Medina, Marrakech"
      },
      {
        title: "Location Mercedes Classe S",
        description: "Louez la prestigieuse Mercedes Classe S avec chauffeur pour vos déplacements VIP.",
        price: 35000,
        currency: "DZD",
        category: "location",
        cityId: "alger",
        duration: "Journée",
        maxPeople: 4,
        images: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"],
        includes: ["Chauffeur professionnel", "Carburant", "Eau minérale", "WiFi"],
        excludes: ["Péages", "Parking"],
        status: "active",
        location: "Centre-ville, Alger"
      },
      {
        title: "Circuit Premium Casbah & Musées",
        description: "Découvrez l'histoire d'Alger avec un guide expert : Casbah UNESCO, Musée des Beaux-Arts, Jardin d'Essai.",
        price: 15000,
        currency: "DZD",
        category: "circuits",
        cityId: "alger",
        duration: "5h",
        maxPeople: 8,
        images: ["https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800"],
        includes: ["Guide francophone", "Entrées musées", "Transport climatisé", "Déjeuner traditionnel"],
        excludes: ["Pourboires", "Achats personnels"],
        status: "active",
        location: "Casbah, Alger"
      }
    ];

    for (const activity of sampleActivities) {
      await query(
        `INSERT INTO activities (
          operator_id, title, description, price, currency, category, city_id,
          duration, max_people, images, includes, excludes, status, rating, review_count, location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          operatorId,
          activity.title,
          activity.description,
          activity.price,
          activity.currency,
          activity.category,
          activity.cityId,
          activity.duration,
          activity.maxPeople,
          activity.images,
          activity.includes,
          activity.excludes,
          activity.status,
          4.5 + Math.random() * 0.5,
          Math.floor(50 + Math.random() * 200),
          activity.location
        ]
      );
    }

    console.log(`Seeded ${sampleActivities.length} activities`);
  } else {
    console.log("Database already seeded");
  }
  } catch (err) {
    console.error("Seed error (non-fatal):", err);
  }
}

const isMainModule = typeof import.meta?.url !== "undefined" &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  seedDatabase()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
