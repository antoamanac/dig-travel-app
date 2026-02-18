import { Request, Response } from "express";
import { query } from "./db";

export async function getActivityReviews(req: Request, res: Response) {
  try {
    const activityId = req.params.id;

    const result = await query(
      `SELECT id, activity_id, user_id, user_name, rating, comment, created_at
       FROM reviews
       WHERE activity_id = $1
       ORDER BY created_at DESC`,
      [activityId]
    );

    const reviews = result.rows;
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews
        : 0;

    res.json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
    });
  } catch (error) {
    console.error("Get activity reviews error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function createReview(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const sessionResult = await query(
      `SELECT s.user_id, u.full_name
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expirée" });
    }

    const userId = sessionResult.rows[0].user_id;
    const userName = sessionResult.rows[0].full_name || "Utilisateur";
    const activityId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "La note doit être entre 1 et 5" });
    }

    const reviewResult = await query(
      `INSERT INTO reviews (activity_id, user_id, user_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [activityId, userId, userName, rating, comment || null]
    );

    const statsResult = await query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
       FROM reviews
       WHERE activity_id = $1`,
      [activityId]
    );

    const avgRating = parseFloat(statsResult.rows[0].avg_rating) || 0;
    const reviewCount = parseInt(statsResult.rows[0].review_count) || 0;

    await query(
      `UPDATE activities SET rating = $1, review_count = $2, updated_at = NOW()
       WHERE id = $3`,
      [Math.round(avgRating * 10) / 10, reviewCount, activityId]
    );

    res.status(201).json({ review: reviewResult.rows[0] });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
