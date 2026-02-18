import { Request, Response } from "express";
import { query } from "./db";
import { OperatorRequest } from "./operator-auth";

export async function getActivitySlots(req: Request, res: Response) {
  try {
    const { activityId } = req.params;
    const { date } = req.query;

    const slots = await query(
      `SELECT * FROM availability_slots 
       WHERE activity_id = $1 AND is_active = true 
       ORDER BY day_of_week, start_time`,
      [activityId]
    );

    if (date) {
      const targetDate = new Date(date as string);
      const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
      const dateStr = targetDate.toISOString().split("T")[0];

      const blocked = await query(
        `SELECT 1 FROM blocked_dates WHERE activity_id = $1 AND blocked_date = $2`,
        [activityId, dateStr]
      );

      if (blocked.rows.length > 0) {
        return res.json({ slots: [], blocked: true, message: "Date bloquée" });
      }

      const daySlots = slots.rows.filter((s: any) => s.day_of_week === dayOfWeek);

      const slotsWithAvailability = await Promise.all(
        daySlots.map(async (slot: any) => {
          const timeStr = slot.start_time.substring(0, 5);
          const bookedResult = await query(
            `SELECT COALESCE(SUM(num_people), 0) as booked 
             FROM bookings 
             WHERE activity_id = $1 
               AND scheduled_at::date = $2 
               AND time_slot = $3 
               AND status NOT IN ('cancelled', 'refused')`,
            [activityId, dateStr, timeStr]
          );
          const booked = parseInt(bookedResult.rows[0].booked);
          const remaining = slot.capacity - booked;

          return {
            id: slot.id,
            startTime: slot.start_time.substring(0, 5),
            endTime: slot.end_time.substring(0, 5),
            capacity: slot.capacity,
            booked,
            remaining: Math.max(0, remaining),
            isFull: remaining <= 0,
          };
        })
      );

      return res.json({ slots: slotsWithAvailability, blocked: false });
    }

    res.json({
      slots: slots.rows.map((s: any) => ({
        id: s.id,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time.substring(0, 5),
        endTime: s.end_time.substring(0, 5),
        capacity: s.capacity,
        isActive: s.is_active,
      })),
    });
  } catch (error) {
    console.error("Get slots error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getActivityAvailableDays(req: Request, res: Response) {
  try {
    const { activityId } = req.params;

    const slots = await query(
      `SELECT DISTINCT day_of_week FROM availability_slots 
       WHERE activity_id = $1 AND is_active = true 
       ORDER BY day_of_week`,
      [activityId]
    );

    const blocked = await query(
      `SELECT blocked_date FROM blocked_dates 
       WHERE activity_id = $1 AND blocked_date >= CURRENT_DATE`,
      [activityId]
    );

    res.json({
      availableDays: slots.rows.map((s: any) => s.day_of_week),
      blockedDates: blocked.rows.map((b: any) => b.blocked_date),
    });
  } catch (error) {
    console.error("Get available days error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function upsertSlots(req: OperatorRequest, res: Response) {
  try {
    const { activityId } = req.params;
    const { slots } = req.body;

    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: "Slots requis (tableau)" });
    }

    const existing = await query(
      "SELECT id FROM activities WHERE id = $1",
      [activityId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Activité non trouvée" });
    }

    await query("DELETE FROM availability_slots WHERE activity_id = $1", [activityId]);

    for (const slot of slots) {
      await query(
        `INSERT INTO availability_slots (activity_id, day_of_week, start_time, end_time, capacity, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          activityId,
          slot.dayOfWeek,
          slot.startTime,
          slot.endTime || slot.startTime,
          slot.capacity || 10,
          slot.isActive !== false,
        ]
      );
    }

    const result = await query(
      "SELECT * FROM availability_slots WHERE activity_id = $1 ORDER BY day_of_week, start_time",
      [activityId]
    );

    res.json({
      slots: result.rows.map((s: any) => ({
        id: s.id,
        dayOfWeek: s.day_of_week,
        startTime: s.start_time.substring(0, 5),
        endTime: s.end_time.substring(0, 5),
        capacity: s.capacity,
        isActive: s.is_active,
      })),
      message: "Disponibilités mises à jour",
    });
  } catch (error) {
    console.error("Upsert slots error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function addBlockedDate(req: OperatorRequest, res: Response) {
  try {
    const { activityId } = req.params;
    const { date, reason } = req.body;

    await query(
      `INSERT INTO blocked_dates (activity_id, blocked_date, reason) 
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [activityId, date, reason || null]
    );

    res.json({ message: "Date bloquée ajoutée" });
  } catch (error) {
    console.error("Add blocked date error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function removeBlockedDate(req: OperatorRequest, res: Response) {
  try {
    const { activityId } = req.params;
    const { date } = req.body;

    await query(
      "DELETE FROM blocked_dates WHERE activity_id = $1 AND blocked_date = $2",
      [activityId, date]
    );

    res.json({ message: "Date débloquée" });
  } catch (error) {
    console.error("Remove blocked date error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
