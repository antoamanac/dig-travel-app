import { Request, Response } from "express";
import { query } from "./db";
import { OperatorRequest } from "./operator-auth";
import { createNotification } from "./notifications";

async function getUserIdFromToken(token: string): Promise<string | null> {
  const result = await query(
    "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
    [token]
  );
  return result.rows.length > 0 ? result.rows[0].user_id : null;
}

export async function getBookings(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Session expirée" });
    }

    const result = await query(
      `SELECT b.*, a.title as activity_name 
       FROM bookings b 
       LEFT JOIN activities a ON b.activity_id::uuid = a.id 
       WHERE b.user_id = $1 
       ORDER BY b.scheduled_at DESC`,
      [userId]
    );

    res.json({
      bookings: result.rows.map((b: any) => ({
        ...b,
        operator_reason: b.operator_reason,
      })),
    });
  } catch (error: any) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération des réservations" });
  }
}

export async function createBooking(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    let userId: string | null = null;

    const {
      activity_id,
      city_id,
      activity_title,
      activity_image,
      scheduled_at,
      price,
      currency,
      status,
      qr_code,
      customer_name,
      customer_email,
      customer_phone,
      payment_method,
      payment_status,
      is_guest,
      num_people = 1,
      time_slot,
    } = req.body;
    
    if (token) {
      userId = await getUserIdFromToken(token);
      if (!userId) {
        return res.status(401).json({ error: "Session expirée" });
      }
    } else if (!is_guest) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    let operatorId = null;
    let dbActivityId = null;
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activity_id);
    
    if (isUUID) {
      const activityResult = await query(
        "SELECT id, operator_id, max_people FROM activities WHERE id = $1",
        [activity_id]
      );
      if (activityResult.rows.length > 0) {
        dbActivityId = activityResult.rows[0].id;
        operatorId = activityResult.rows[0].operator_id;
      }

      if (time_slot && scheduled_at) {
        const dateStr = new Date(scheduled_at).toISOString().split("T")[0];
        const bookedResult = await query(
          `SELECT COALESCE(SUM(num_people), 0) as booked 
           FROM bookings 
           WHERE activity_id = $1 
             AND scheduled_at::date = $2 
             AND time_slot = $3 
             AND status NOT IN ('cancelled', 'refused')`,
          [activity_id, dateStr, time_slot]
        );

        const slotResult = await query(
          `SELECT capacity FROM availability_slots 
           WHERE activity_id = $1 
             AND start_time::text LIKE $2 || '%'
             AND is_active = true
           LIMIT 1`,
          [activity_id, time_slot]
        );

        if (slotResult.rows.length > 0) {
          const capacity = slotResult.rows[0].capacity;
          const booked = parseInt(bookedResult.rows[0].booked);
          const remaining = capacity - booked;

          if (num_people > remaining) {
            return res.status(400).json({
              error: remaining <= 0
                ? "Ce créneau est complet"
                : `Il ne reste que ${remaining} place(s) sur ce créneau`,
              remaining,
            });
          }
        }
      }
    }

    const totalPrice = price * num_people;

    const result = await query(
      `INSERT INTO bookings (
        user_id, activity_id, operator_id, legacy_activity_id, city_id, activity_title, activity_image,
        scheduled_at, time_slot, price_per_person, total_price, currency, status, qr_code,
        customer_name, customer_email, customer_phone, payment_method, payment_status, num_people
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        userId, dbActivityId, operatorId, isUUID ? null : activity_id, city_id, activity_title, activity_image,
        scheduled_at, time_slot || null, price, totalPrice, currency, status || 'confirmed', qr_code,
        customer_name, customer_email, customer_phone, payment_method, payment_status || 'pending', num_people
      ]
    );

    if (operatorId) {
      const scheduledDate = new Date(scheduled_at).toLocaleDateString("fr-FR");
      await createNotification(
        "operator",
        operatorId,
        "new_booking",
        "Nouvelle réservation",
        `${customer_name || "Un client"} a réservé "${activity_title}" pour le ${scheduledDate}${time_slot ? ` à ${time_slot}` : ""} (${num_people} pers.)`,
        { bookingId: result.rows[0].id, activityTitle: activity_title }
      );
    }

    res.json({ booking: result.rows[0] });
  } catch (error: any) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: "Erreur lors de la création de la réservation" });
  }
}

export async function getOperatorBookings(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;
    const { status, from_date, to_date, activity_id, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT b.*, a.title as activity_name, u.full_name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN activities a ON b.activity_id::uuid = a.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE ($1::uuid IS NULL OR b.operator_id = $1::uuid)
    `;
    const params: any[] = [operatorId || null];
    let paramIndex = 2;

    if (status) {
      sql += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (from_date) {
      sql += ` AND b.scheduled_at >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      sql += ` AND b.scheduled_at <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    if (activity_id) {
      sql += ` AND b.activity_id = $${paramIndex}`;
      params.push(activity_id);
      paramIndex++;
    }

    sql += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const [bookingsResult, countResult] = await Promise.all([
      query(sql, params),
      query(
        `SELECT COUNT(*) FROM bookings WHERE ($1::uuid IS NULL OR operator_id = $1::uuid)`,
        [operatorId || null]
      )
    ]);

    res.json({
      bookings: bookingsResult.rows.map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        activityId: b.activity_id,
        legacyActivityId: b.legacy_activity_id,
        operatorId: b.operator_id,
        cityId: b.city_id,
        activityTitle: b.activity_title || b.activity_name,
        activityImage: b.activity_image,
        scheduledAt: b.scheduled_at,
        timeSlot: b.time_slot,
        numPeople: b.num_people,
        pricePerPerson: parseFloat(b.price_per_person),
        totalPrice: parseFloat(b.total_price),
        currency: b.currency,
        status: b.status,
        paymentStatus: b.payment_status,
        paymentMethod: b.payment_method,
        depositPaid: parseFloat(b.deposit_paid) || 0,
        qrCode: b.qr_code,
        customerName: b.customer_name || b.user_name,
        customerEmail: b.customer_email || b.user_email,
        customerPhone: b.customer_phone,
        notes: b.notes,
        operatorReason: b.operator_reason,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error("Get operator bookings error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function updateBookingStatus(req: OperatorRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status, paymentStatus, notes, reason } = req.body;
    const operatorId = req.operator?.id;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (paymentStatus) {
      updates.push(`payment_status = $${paramIndex}`);
      values.push(paymentStatus);
      paramIndex++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }

    if (reason !== undefined) {
      updates.push(`operator_reason = $${paramIndex}`);
      values.push(reason);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune mise à jour fournie" });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Réservation non trouvée" });
    }

    const booking = result.rows[0];

    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "update", "booking", id, JSON.stringify({ status, paymentStatus, notes, reason })]
    );

    if (booking.user_id && status) {
      const statusMessages: Record<string, { title: string; message: string }> = {
        confirmed: {
          title: "Réservation confirmée",
          message: `Votre réservation "${booking.activity_title}" a été confirmée par l'opérateur.`,
        },
        refused: {
          title: "Réservation refusée",
          message: `Votre réservation "${booking.activity_title}" a été refusée.${reason ? ` Motif : ${reason}` : ""}`,
        },
        cancelled: {
          title: "Réservation annulée",
          message: `Votre réservation "${booking.activity_title}" a été annulée.${reason ? ` Motif : ${reason}` : ""}`,
        },
        completed: {
          title: "Activité terminée",
          message: `Votre activité "${booking.activity_title}" est marquée comme terminée. Merci !`,
        },
      };

      const msg = statusMessages[status];
      if (msg) {
        await createNotification(
          "user",
          booking.user_id,
          `booking_${status}`,
          msg.title,
          msg.message,
          { bookingId: id, status, activityTitle: booking.activity_title }
        );
      }
    }

    res.json({ booking: result.rows[0], message: "Réservation mise à jour" });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
