import type { Express } from "express";
import { initDatabase } from "./db";
import { register, login, logout, getSession, updateProfile } from "./auth";
import { getBookings, createBooking, getOperatorBookings, updateBookingStatus } from "./bookings";
import { operatorLogin, operatorLogout, getOperatorSession, operatorAuthMiddleware, createOperator } from "./operator-auth";
import { getActivities, getActivity, createActivity, updateActivity, deleteActivity, toggleActivityStatus } from "./activities";
import { getActivityReviews, createReview } from "./reviews";
import { getDashboardStats, getRevenueChart, getTopActivities } from "./dashboard";
import { getActivitySlots, getActivityAvailableDays, upsertSlots, addBlockedDate, removeBlockedDate } from "./availability";
import { getOperatorNotifications, getUserNotifications, markNotificationRead, markAllNotificationsRead } from "./notifications";
import { seedDatabase } from "./seed";
import plannerRouter from "./planner";

export async function registerRoutes(app: Express): Promise<void> {
  await initDatabase();
  await seedDatabase();

  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/session", getSession);
  app.put("/api/auth/profile", updateProfile);

  app.get("/api/bookings", getBookings);
  app.post("/api/bookings", createBooking);

  app.post("/api/operator/auth/login", operatorLogin);
  app.post("/api/operator/auth/logout", operatorLogout);
  app.get("/api/operator/auth/session", getOperatorSession);
  app.post("/api/operator/auth/register", createOperator);

  app.get("/api/activities", getActivities);
  app.get("/api/activities/:id", getActivity);
  app.post("/api/activities", operatorAuthMiddleware as any, createActivity);
  app.patch("/api/activities/:id", operatorAuthMiddleware as any, updateActivity);
  app.delete("/api/activities/:id", operatorAuthMiddleware as any, deleteActivity);
  app.patch("/api/activities/:id/status", operatorAuthMiddleware as any, toggleActivityStatus);

  app.get("/api/activities/:activityId/slots", getActivitySlots);
  app.get("/api/activities/:activityId/available-days", getActivityAvailableDays);
  app.put("/api/activities/:activityId/slots", operatorAuthMiddleware as any, upsertSlots);
  app.post("/api/activities/:activityId/blocked-dates", operatorAuthMiddleware as any, addBlockedDate);
  app.delete("/api/activities/:activityId/blocked-dates", operatorAuthMiddleware as any, removeBlockedDate);

  app.get("/api/operator/dashboard", operatorAuthMiddleware as any, getDashboardStats);
  app.get("/api/operator/dashboard/revenue", operatorAuthMiddleware as any, getRevenueChart);
  app.get("/api/operator/dashboard/top-activities", operatorAuthMiddleware as any, getTopActivities);

  app.get("/api/operator/bookings", operatorAuthMiddleware as any, getOperatorBookings);
  app.patch("/api/operator/bookings/:id/status", operatorAuthMiddleware as any, updateBookingStatus);

  app.get("/api/operator/notifications", operatorAuthMiddleware as any, getOperatorNotifications);
  app.get("/api/notifications", getUserNotifications);
  app.patch("/api/notifications/:id/read", markNotificationRead);
  app.post("/api/notifications/mark-all-read", markAllNotificationsRead);

  app.get("/api/activities/:id/reviews", getActivityReviews);
  app.post("/api/activities/:id/reviews", createReview);

  app.use("/api/planner", plannerRouter);
}
