import { Response } from "express";
import { query } from "./db";
import { OperatorRequest } from "./operator-auth";

export async function getDashboardStats(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todayBookings,
      weekBookings,
      monthBookings,
      totalBookings,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      activeActivities,
      totalActivities,
      pendingBookings,
      upcomingBookings,
      recentBookings
    ] = await Promise.all([
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2 AND created_at <= $3`,
        [operatorId || null, todayStart, todayEnd]
      ),
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2`,
        [operatorId || null, weekStart]
      ),
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2`,
        [operatorId || null, monthStart]
      ),
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid)`,
        [operatorId || null]
      ),
      query(
        `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2 AND created_at <= $3 
         AND status != 'cancelled'`,
        [operatorId || null, todayStart, todayEnd]
      ),
      query(
        `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2 
         AND status != 'cancelled'`,
        [operatorId || null, weekStart]
      ),
      query(
        `SELECT COALESCE(SUM(total_price), 0) as total FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND created_at >= $2 
         AND status != 'cancelled'`,
        [operatorId || null, monthStart]
      ),
      query(
        `SELECT COUNT(*) as count FROM activities 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND status = 'active'`,
        [operatorId || null]
      ),
      query(
        `SELECT COUNT(*) as count FROM activities 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid)`,
        [operatorId || null]
      ),
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND status = 'pending'`,
        [operatorId || null]
      ),
      query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE ($1::uuid IS NULL OR operator_id = $1::uuid) 
         AND scheduled_at > NOW() 
         AND status IN ('confirmed', 'pending')`,
        [operatorId || null]
      ),
      query(
        `SELECT b.*, a.title as activity_name
         FROM bookings b
         LEFT JOIN activities a ON b.activity_id = a.id
         WHERE ($1::uuid IS NULL OR b.operator_id = $1::uuid)
         ORDER BY b.created_at DESC
         LIMIT 10`,
        [operatorId || null]
      )
    ]);

    res.json({
      kpis: {
        todayBookings: parseInt(todayBookings.rows[0].count),
        weekBookings: parseInt(weekBookings.rows[0].count),
        monthBookings: parseInt(monthBookings.rows[0].count),
        totalBookings: parseInt(totalBookings.rows[0].count),
        todayRevenue: parseFloat(todayRevenue.rows[0].total) || 0,
        weekRevenue: parseFloat(weekRevenue.rows[0].total) || 0,
        monthRevenue: parseFloat(monthRevenue.rows[0].total) || 0,
        activeActivities: parseInt(activeActivities.rows[0].count),
        totalActivities: parseInt(totalActivities.rows[0].count),
        pendingBookings: parseInt(pendingBookings.rows[0].count),
        upcomingBookings: parseInt(upcomingBookings.rows[0].count),
      },
      recentBookings: recentBookings.rows.map((b) => ({
        id: b.id,
        customerName: b.customer_name,
        customerEmail: b.customer_email,
        activityTitle: b.activity_title || b.activity_name,
        scheduledAt: b.scheduled_at,
        totalPrice: parseFloat(b.total_price),
        currency: b.currency,
        status: b.status,
        paymentStatus: b.payment_status,
        createdAt: b.created_at,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getRevenueChart(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;
    const { period = "week" } = req.query;

    let interval: string;
    let groupBy: string;
    
    switch (period) {
      case "month":
        interval = "30 days";
        groupBy = "DATE(created_at)";
        break;
      case "year":
        interval = "365 days";
        groupBy = "DATE_TRUNC('month', created_at)";
        break;
      default:
        interval = "7 days";
        groupBy = "DATE(created_at)";
    }

    const result = await query(
      `SELECT ${groupBy} as date, 
              COUNT(*) as bookings,
              COALESCE(SUM(total_price), 0) as revenue
       FROM bookings 
       WHERE ($1::uuid IS NULL OR operator_id = $1::uuid)
         AND created_at >= NOW() - INTERVAL '${interval}'
         AND status != 'cancelled'
       GROUP BY ${groupBy}
       ORDER BY date ASC`,
      [operatorId || null]
    );

    res.json({
      chartData: result.rows.map((row) => ({
        date: row.date,
        bookings: parseInt(row.bookings),
        revenue: parseFloat(row.revenue),
      })),
    });
  } catch (error) {
    console.error("Revenue chart error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getTopActivities(req: OperatorRequest, res: Response) {
  try {
    const operatorId = req.operator?.id;

    const result = await query(
      `SELECT a.id, a.title, a.city_id, a.price, a.currency,
              COUNT(b.id) as booking_count,
              COALESCE(SUM(b.total_price), 0) as total_revenue
       FROM activities a
       LEFT JOIN bookings b ON a.id = b.activity_id AND b.status != 'cancelled'
       WHERE ($1::uuid IS NULL OR a.operator_id = $1::uuid)
       GROUP BY a.id, a.title, a.city_id, a.price, a.currency
       ORDER BY booking_count DESC
       LIMIT 10`,
      [operatorId || null]
    );

    res.json({
      topActivities: result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        cityId: row.city_id,
        price: parseFloat(row.price),
        currency: row.currency,
        bookingCount: parseInt(row.booking_count),
        totalRevenue: parseFloat(row.total_revenue),
      })),
    });
  } catch (error) {
    console.error("Top activities error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
