import { Request, Response, NextFunction } from "express";
import { query } from "./db";
import { createHash, randomBytes } from "crypto";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function operatorLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }

    const result = await query(
      "SELECT id, email, company_name, contact_name, phone, logo_url, cities, commission_rate FROM operators WHERE email = $1 AND password_hash = $2",
      [email.toLowerCase(), hashPassword(password)]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }

    const operator = result.rows[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await query(
      "INSERT INTO operator_sessions (operator_id, token, expires_at) VALUES ($1, $2, $3)",
      [operator.id, token, expiresAt]
    );

    res.json({
      operator: {
        id: operator.id,
        email: operator.email,
        companyName: operator.company_name,
        contactName: operator.contact_name,
        phone: operator.phone,
        logoUrl: operator.logo_url,
        cities: operator.cities,
        commissionRate: operator.commission_rate,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Operator login error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function operatorLogout(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (token) {
      await query("DELETE FROM operator_sessions WHERE token = $1", [token]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Operator logout error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function getOperatorSession(req: Request, res: Response) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Non authentifié" });
    }

    const result = await query(
      `SELECT o.id, o.email, o.company_name, o.contact_name, o.phone, o.logo_url, o.cities, o.commission_rate
       FROM operators o
       JOIN operator_sessions s ON o.id = s.operator_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Session expirée" });
    }

    const operator = result.rows[0];
    res.json({
      operator: {
        id: operator.id,
        email: operator.email,
        companyName: operator.company_name,
        contactName: operator.contact_name,
        phone: operator.phone,
        logoUrl: operator.logo_url,
        cities: operator.cities,
        commissionRate: operator.commission_rate,
      },
    });
  } catch (error) {
    console.error("Get operator session error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export interface OperatorRequest extends Request {
  operator?: {
    id: string;
    email: string;
    companyName: string;
  };
}

export async function operatorAuthMiddleware(
  req: OperatorRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Token requis" });
    }

    const result = await query(
      `SELECT o.id, o.email, o.company_name
       FROM operators o
       JOIN operator_sessions s ON o.id = s.operator_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Session invalide ou expirée" });
    }

    req.operator = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      companyName: result.rows[0].company_name,
    };

    next();
  } catch (error) {
    console.error("Operator auth middleware error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

export async function createOperator(req: Request, res: Response) {
  try {
    const { email, password, companyName, contactName, phone, cities } = req.body;

    if (!email || !password || !companyName) {
      return res.status(400).json({ error: "Email, mot de passe et nom d'entreprise requis" });
    }

    const existing = await query("SELECT id FROM operators WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const result = await query(
      `INSERT INTO operators (email, password_hash, company_name, contact_name, phone, cities)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, company_name, contact_name, phone, cities, commission_rate`,
      [email.toLowerCase(), hashPassword(password), companyName, contactName || null, phone || null, cities || []]
    );

    const operator = result.rows[0];
    res.status(201).json({
      operator: {
        id: operator.id,
        email: operator.email,
        companyName: operator.company_name,
        contactName: operator.contact_name,
        phone: operator.phone,
        cities: operator.cities,
        commissionRate: operator.commission_rate,
      },
    });
  } catch (error) {
    console.error("Create operator error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
