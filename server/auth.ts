import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { query } from "./db";

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
    }

    const existingUser = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe déjà avec cet email" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, phone, avatar_url, created_at",
      [email.toLowerCase(), passwordHash, fullName || null]
    );

    const user = result.rows[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const userResult = await query(
      "SELECT id, email, password_hash, full_name, phone, avatar_url, created_at FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const userData = userResult.rows[0];
    const isPasswordValid = await verifyPassword(password, userData.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const result = { rows: [userData] };

    const user = result.rows[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
    await query(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Erreur lors de la déconnexion" });
  }
}

export async function getSession(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.avatar_url, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Session expirée" });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Erreur lors de la récupération de la session" });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const sessionResult = await query(
      "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expirée" });
    }

    const userId = sessionResult.rows[0].user_id;
    const { full_name, phone } = req.body;

    const result = await query(
      "UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $3 RETURNING id, email, full_name, phone, avatar_url, created_at",
      [full_name, phone, userId]
    );

    res.json({ user: result.rows[0] });
  } catch (error: any) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour du profil" });
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Non authentifié" });
  }
  (req as any).token = token;
  next();
}
