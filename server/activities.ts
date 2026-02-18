import { Response } from "express";
import { query } from "./db";
import { OperatorRequest } from "./operator-auth";

export async function getActivities(req: any, res: Response) {
  try {
    const { city, category, status, operator_id } = req.query;
    
    let sql = `
      SELECT a.*, o.company_name as operator_name
      FROM activities a
      LEFT JOIN operators o ON a.operator_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (city) {
      sql += ` AND a.city_id = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }

    if (category) {
      sql += ` AND a.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      sql += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    } else if (!req.operator) {
      sql += ` AND a.status = 'active'`;
    }

    if (operator_id) {
      sql += ` AND a.operator_id = $${paramIndex}`;
      params.push(operator_id);
      paramIndex++;
    }

    sql += ` ORDER BY a.created_at DESC`;

    const result = await query(sql, params);

    const activities = result.rows.map((row) => ({
      id: row.id,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      title: row.title,
      description: row.description,
      price: parseFloat(row.price),
      currency: row.currency,
      category: row.category,
      cityId: row.city_id,
      duration: row.duration,
      maxPeople: row.max_people,
      images: row.images || [],
      image: row.images?.[0] || "",
      includes: row.includes || [],
      excludes: row.excludes || [],
      rating: parseFloat(row.rating) || 4.5,
      reviewCount: row.review_count || 0,
      status: row.status,
      paymentMethods: row.payment_methods,
      depositRequired: row.deposit_required,
      depositAmount: parseFloat(row.deposit_amount) || 0,
      meetingPoint: row.meeting_point,
      meetingInstructions: row.meeting_instructions,
      minBookingNotice: row.min_booking_notice,
      location: row.location || null,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ activities, count: activities.length, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getActivity(req: any, res: Response) {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT a.*, o.company_name as operator_name
       FROM activities a
       LEFT JOIN operators o ON a.operator_id = o.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activité non trouvée" });
    }

    const row = result.rows[0];
    res.json({
      activity: {
        id: row.id,
        operatorId: row.operator_id,
        operatorName: row.operator_name,
        title: row.title,
        description: row.description,
        price: parseFloat(row.price),
        currency: row.currency,
        category: row.category,
        cityId: row.city_id,
        duration: row.duration,
        maxPeople: row.max_people,
        images: row.images || [],
        image: row.images?.[0] || "",
        includes: row.includes || [],
        excludes: row.excludes || [],
        rating: parseFloat(row.rating) || 4.5,
        reviewCount: row.review_count || 0,
        status: row.status,
        paymentMethods: row.payment_methods,
        depositRequired: row.deposit_required,
        depositAmount: parseFloat(row.deposit_amount) || 0,
        meetingPoint: row.meeting_point,
        meetingInstructions: row.meeting_instructions,
        minBookingNotice: row.min_booking_notice,
        location: row.location || null,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function createActivity(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;
    const {
      title, description, price, currency, category, cityId, duration,
      maxPeople, images, includes, excludes, status, paymentMethods,
      depositRequired, depositAmount, meetingPoint, meetingInstructions, minBookingNotice, tags
    } = req.body;

    if (!title || !price || !category || !cityId) {
      return res.status(400).json({ error: "Titre, prix, catégorie et ville requis" });
    }

    const safeImages = Array.isArray(images) ? images : [];
    const safeIncludes = Array.isArray(includes) ? includes : [];
    const safeExcludes = Array.isArray(excludes) ? excludes : [];
    const safeTags = Array.isArray(tags) ? tags : [];

    const result = await query(
      `INSERT INTO activities (
        operator_id, title, description, price, currency, category, city_id,
        duration, max_people, images, includes, excludes, status, payment_methods,
        deposit_required, deposit_amount, meeting_point, meeting_instructions, min_booking_notice, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        operatorId, title, description || "", price, currency || "DZD", category, cityId,
        duration || "2h", maxPeople || 10, safeImages, safeIncludes, safeExcludes,
        status || "draft", paymentMethods || { card: true, cash: true, bank: false },
        depositRequired || false, depositAmount || 0, meetingPoint || "", meetingInstructions || "",
        minBookingNotice || 24, safeTags
      ]
    );

    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "create", "activity", result.rows[0].id, JSON.stringify({ title, price, status })]
    );

    res.status(201).json({ activity: result.rows[0], message: "Activité créée avec succès" });
  } catch (error) {
    console.error("Create activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function updateActivity(req: OperatorRequest, res: Response) {
  try {
    const { id } = req.params;
    const operatorId = req.operator?.id;
    const updates = req.body;

    const existing = await query("SELECT * FROM activities WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Activité non trouvée" });
    }

    const allowedFields = [
      "title", "description", "price", "currency", "category", "city_id",
      "duration", "max_people", "images", "includes", "excludes", "status",
      "payment_methods", "deposit_required", "deposit_amount", "meeting_point",
      "meeting_instructions", "min_booking_notice", "rating", "review_count", "tags"
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClauses.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "Aucun champ valide à mettre à jour" });
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE activities SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "update", "activity", id, JSON.stringify(updates)]
    );

    res.json({ activity: result.rows[0], message: "Activité mise à jour", updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Update activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function deleteActivity(req: OperatorRequest, res: Response) {
  try {
    const { id } = req.params;
    const operatorId = req.operator?.id;

    const result = await query("DELETE FROM activities WHERE id = $1 RETURNING id, title", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activité non trouvée" });
    }

    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "delete", "activity", id, JSON.stringify({ title: result.rows[0].title })]
    );

    res.json({ success: true, message: "Activité supprimée" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function toggleActivityStatus(req: OperatorRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const operatorId = req.operator?.id;

    if (!["draft", "active", "paused", "archived"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const result = await query(
      "UPDATE activities SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activité non trouvée" });
    }

    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "status_change", "activity", id, JSON.stringify({ status })]
    );

    res.json({ activity: result.rows[0], message: `Statut changé en ${status}` });
  } catch (error) {
    console.error("Toggle activity status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
