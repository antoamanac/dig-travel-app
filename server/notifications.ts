import { Request, Response } from "express";
import { query } from "./db";
import { OperatorRequest } from "./operator-auth";

export async function createNotification(
  recipientType: "operator" | "user",
  recipientId: string,
  type: string,
  title: string,
  message: string,
  data: any = {}
) {
  await query(
    `INSERT INTO notifications (recipient_type, recipient_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [recipientType, recipientId, type, title, message, JSON.stringify(data)]
  );
}

export async function getOperatorNotifications(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;
    const { unread_only } = req.query;

    let sql = `SELECT * FROM notifications WHERE recipient_type = 'operator' AND recipient_id = $1`;
    const params: any[] = [operatorId];

    if (unread_only === "true") {
      sql += ` AND is_read = false`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await query(sql, params);
    const unreadCount = await query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_type = 'operator' AND recipient_id = $1 AND is_read = false`,
      [operatorId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getUserNotifications(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Non authentifié" });

    const session = await query(
      "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    if (session.rows.length === 0) return res.status(401).json({ error: "Session expirée" });

    const userId = session.rows[0].user_id;

    const result = await query(
      `SELECT * FROM notifications 
       WHERE recipient_type = 'user' AND recipient_id = $1 
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const unreadCount = await query(
      `SELECT COUNT(*) FROM notifications WHERE recipient_type = 'user' AND recipient_id = $1 AND is_read = false`,
      [userId]
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await query("UPDATE notifications SET is_read = true WHERE id = $1", [id]);
    res.json({ message: "Notification lue" });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const { recipientType, recipientId } = req.body;
    await query(
      "UPDATE notifications SET is_read = true WHERE recipient_type = $1 AND recipient_id = $2",
      [recipientType, recipientId]
    );
    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
