// server/index.ts
import express from "express";

// server/db.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        company_name TEXT NOT NULL,
        contact_name TEXT,
        phone TEXT,
        logo_url TEXT,
        description TEXT,
        cities TEXT[] DEFAULT '{}',
        commission_rate NUMERIC DEFAULT 12,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operator_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        currency TEXT DEFAULT 'DZD',
        category TEXT NOT NULL,
        city_id TEXT NOT NULL,
        duration TEXT,
        max_people INTEGER DEFAULT 10,
        images TEXT[] DEFAULT '{}',
        includes TEXT[] DEFAULT '{}',
        excludes TEXT[] DEFAULT '{}',
        rating NUMERIC DEFAULT 4.5,
        review_count INTEGER DEFAULT 0,
        status TEXT CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
        payment_methods JSONB DEFAULT '{"card": true, "cash": true, "bank": false}',
        deposit_required BOOLEAN DEFAULT false,
        deposit_amount NUMERIC DEFAULT 0,
        meeting_point TEXT,
        meeting_instructions TEXT,
        min_booking_notice INTEGER DEFAULT 24,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS availability_slots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
        day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        capacity INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS blocked_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
        blocked_date DATE NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pricing_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
        rule_name TEXT NOT NULL,
        rule_type TEXT CHECK (rule_type IN ('discount', 'increase', 'group', 'seasonal', 'happy_hour')) NOT NULL,
        discount_percent NUMERIC,
        conditions JSONB DEFAULT '{}',
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
        operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
        legacy_activity_id TEXT,
        city_id TEXT NOT NULL,
        activity_title TEXT NOT NULL,
        activity_image TEXT,
        scheduled_at TIMESTAMP NOT NULL,
        time_slot TEXT,
        num_people INTEGER DEFAULT 1,
        price_per_person NUMERIC NOT NULL,
        total_price NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        status TEXT CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled')) DEFAULT 'pending',
        payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
        payment_method TEXT,
        deposit_paid NUMERIC DEFAULT 0,
        qr_code TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id UUID,
        changes JSONB,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);
    console.log("Database tables initialized");
  } finally {
    client.release();
  }
}
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// server/auth.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
var SALT_ROUNDS = 10;
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
async function register(req, res) {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caract\xE8res" });
    }
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Un compte existe d\xE9j\xE0 avec cet email" });
    }
    const passwordHash = await hashPassword(password);
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, phone, avatar_url, created_at",
      [email.toLowerCase(), passwordHash, fullName || null]
    );
    const user = result.rows[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
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
        created_at: user.created_at
      },
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  }
}
async function login(req, res) {
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
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
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
        created_at: user.created_at
      },
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
}
async function logout(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Erreur lors de la d\xE9connexion" });
  }
}
async function getSession(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.avatar_url, u.created_at, s.expires_at
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Session expir\xE9e" });
    }
    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration de la session" });
  }
}
async function updateProfile(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const sessionResult = await query(
      "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
      [token]
    );
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: "Session expir\xE9e" });
    }
    const userId = sessionResult.rows[0].user_id;
    const { full_name, phone } = req.body;
    const result = await query(
      "UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $3 RETURNING id, email, full_name, phone, avatar_url, created_at",
      [full_name, phone, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du profil" });
  }
}

// server/bookings.ts
async function getUserIdFromToken(token) {
  const result = await query(
    "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
    [token]
  );
  return result.rows.length > 0 ? result.rows[0].user_id : null;
}
async function getBookings(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const userId = await getUserIdFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: "Session expir\xE9e" });
    }
    const result = await query(
      "SELECT * FROM bookings WHERE user_id = $1 ORDER BY scheduled_at DESC",
      [userId]
    );
    res.json({ bookings: result.rows });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des r\xE9servations" });
  }
}
async function createBooking(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    let userId = null;
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
      is_guest,
      num_people = 1,
      time_slot
    } = req.body;
    if (token) {
      userId = await getUserIdFromToken(token);
      if (!userId) {
        return res.status(401).json({ error: "Session expir\xE9e" });
      }
    } else if (!is_guest) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const totalPrice = price * num_people;
    let operatorId = null;
    let dbActivityId = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activity_id);
    if (isUUID) {
      const activityResult = await query(
        "SELECT id, operator_id FROM activities WHERE id = $1",
        [activity_id]
      );
      if (activityResult.rows.length > 0) {
        dbActivityId = activityResult.rows[0].id;
        operatorId = activityResult.rows[0].operator_id;
      }
    }
    const result = await query(
      `INSERT INTO bookings (
        user_id, activity_id, operator_id, legacy_activity_id, city_id, activity_title, activity_image,
        scheduled_at, time_slot, price_per_person, total_price, currency, status, qr_code,
        customer_name, customer_email, customer_phone, payment_method, num_people
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        userId,
        dbActivityId,
        operatorId,
        isUUID ? null : activity_id,
        city_id,
        activity_title,
        activity_image,
        scheduled_at,
        time_slot || null,
        price,
        totalPrice,
        currency,
        status || "pending",
        qr_code,
        customer_name,
        customer_email,
        customer_phone,
        payment_method,
        num_people
      ]
    );
    res.json({ booking: result.rows[0] });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: "Erreur lors de la cr\xE9ation de la r\xE9servation" });
  }
}
async function getOperatorBookings(req, res) {
  try {
    const operatorId = req.operator?.id;
    const { status, from_date, to_date, activity_id, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT b.*, a.title as activity_name, u.full_name as user_name, u.email as user_email
      FROM bookings b
      LEFT JOIN activities a ON b.activity_id = a.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE ($1::uuid IS NULL OR b.operator_id = $1::uuid)
    `;
    const params = [operatorId || null];
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
      bookings: bookingsResult.rows.map((b) => ({
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
        createdAt: b.created_at,
        updatedAt: b.updated_at
      })),
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error("Get operator bookings error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, paymentStatus, notes } = req.body;
    const operatorId = req.operator?.id;
    const updates = [];
    const values = [];
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
    if (notes !== void 0) {
      updates.push(`notes = $${paramIndex}`);
      values.push(notes);
      paramIndex++;
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune mise \xE0 jour fournie" });
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await query(
      `UPDATE bookings SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "R\xE9servation non trouv\xE9e" });
    }
    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "update", "booking", id, JSON.stringify({ status, paymentStatus, notes })]
    );
    res.json({ booking: result.rows[0], message: "R\xE9servation mise \xE0 jour" });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// server/operator-auth.ts
import { createHash, randomBytes } from "crypto";
function hashPassword2(password) {
  return createHash("sha256").update(password).digest("hex");
}
function generateToken2() {
  return randomBytes(32).toString("hex");
}
async function operatorLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis" });
    }
    const result = await query(
      "SELECT id, email, company_name, contact_name, phone, logo_url, cities, commission_rate FROM operators WHERE email = $1 AND password_hash = $2",
      [email.toLowerCase(), hashPassword2(password)]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect" });
    }
    const operator = result.rows[0];
    const token = generateToken2();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
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
        commissionRate: operator.commission_rate
      },
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error("Operator login error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function operatorLogout(req, res) {
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
async function getOperatorSession(req, res) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Non authentifi\xE9" });
    }
    const result = await query(
      `SELECT o.id, o.email, o.company_name, o.contact_name, o.phone, o.logo_url, o.cities, o.commission_rate
       FROM operators o
       JOIN operator_sessions s ON o.id = s.operator_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Session expir\xE9e" });
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
        commissionRate: operator.commission_rate
      }
    });
  } catch (error) {
    console.error("Get operator session error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function operatorAuthMiddleware(req, res, next) {
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
      return res.status(401).json({ error: "Session invalide ou expir\xE9e" });
    }
    req.operator = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      companyName: result.rows[0].company_name
    };
    next();
  } catch (error) {
    console.error("Operator auth middleware error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function createOperator(req, res) {
  try {
    const { email, password, companyName, contactName, phone, cities } = req.body;
    if (!email || !password || !companyName) {
      return res.status(400).json({ error: "Email, mot de passe et nom d'entreprise requis" });
    }
    const existing = await query("SELECT id FROM operators WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Cet email est d\xE9j\xE0 utilis\xE9" });
    }
    const result = await query(
      `INSERT INTO operators (email, password_hash, company_name, contact_name, phone, cities)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, company_name, contact_name, phone, cities, commission_rate`,
      [email.toLowerCase(), hashPassword2(password), companyName, contactName || null, phone || null, cities || []]
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
        commissionRate: operator.commission_rate
      }
    });
  } catch (error) {
    console.error("Create operator error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// server/activities.ts
async function getActivities(req, res) {
  try {
    const { city, category, status, operator_id } = req.query;
    let sql = `
      SELECT a.*, o.company_name as operator_name
      FROM activities a
      LEFT JOIN operators o ON a.operator_id = o.id
      WHERE 1=1
    `;
    const params = [];
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
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    res.json({ activities, count: activities.length, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function getActivity(req, res) {
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
      return res.status(404).json({ error: "Activit\xE9 non trouv\xE9e" });
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
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function createActivity(req, res) {
  try {
    const operatorId = req.operator?.id;
    const {
      title,
      description,
      price,
      currency,
      category,
      cityId,
      duration,
      maxPeople,
      images,
      includes,
      excludes,
      status,
      paymentMethods,
      depositRequired,
      depositAmount,
      meetingPoint,
      meetingInstructions,
      minBookingNotice,
      tags
    } = req.body;
    if (!title || !price || !category || !cityId) {
      return res.status(400).json({ error: "Titre, prix, cat\xE9gorie et ville requis" });
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
        operatorId,
        title,
        description || "",
        price,
        currency || "DZD",
        category,
        cityId,
        duration || "2h",
        maxPeople || 10,
        safeImages,
        safeIncludes,
        safeExcludes,
        status || "draft",
        paymentMethods || { card: true, cash: true, bank: false },
        depositRequired || false,
        depositAmount || 0,
        meetingPoint || "",
        meetingInstructions || "",
        minBookingNotice || 24,
        safeTags
      ]
    );
    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "create", "activity", result.rows[0].id, JSON.stringify({ title, price, status })]
    );
    res.status(201).json({ activity: result.rows[0], message: "Activit\xE9 cr\xE9\xE9e avec succ\xE8s" });
  } catch (error) {
    console.error("Create activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function updateActivity(req, res) {
  try {
    const { id } = req.params;
    const operatorId = req.operator?.id;
    const updates = req.body;
    const existing = await query("SELECT * FROM activities WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Activit\xE9 non trouv\xE9e" });
    }
    const allowedFields = [
      "title",
      "description",
      "price",
      "currency",
      "category",
      "city_id",
      "duration",
      "max_people",
      "images",
      "includes",
      "excludes",
      "status",
      "payment_methods",
      "deposit_required",
      "deposit_amount",
      "meeting_point",
      "meeting_instructions",
      "min_booking_notice",
      "rating",
      "review_count",
      "tags"
    ];
    const setClauses = [];
    const values = [];
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
      return res.status(400).json({ error: "Aucun champ valide \xE0 mettre \xE0 jour" });
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
    res.json({ activity: result.rows[0], message: "Activit\xE9 mise \xE0 jour", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Update activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function deleteActivity(req, res) {
  try {
    const { id } = req.params;
    const operatorId = req.operator?.id;
    const result = await query("DELETE FROM activities WHERE id = $1 RETURNING id, title", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Activit\xE9 non trouv\xE9e" });
    }
    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "delete", "activity", id, JSON.stringify({ title: result.rows[0].title })]
    );
    res.json({ success: true, message: "Activit\xE9 supprim\xE9e" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function toggleActivityStatus(req, res) {
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
      return res.status(404).json({ error: "Activit\xE9 non trouv\xE9e" });
    }
    await query(
      `INSERT INTO audit_logs (operator_id, action, entity_type, entity_id, changes)
       VALUES ($1, $2, $3, $4, $5)`,
      [operatorId, "status_change", "activity", id, JSON.stringify({ status })]
    );
    res.json({ activity: result.rows[0], message: `Statut chang\xE9 en ${status}` });
  } catch (error) {
    console.error("Toggle activity status error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// server/dashboard.ts
async function getDashboardStats(req, res) {
  try {
    const operatorId = req.operator?.id;
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = /* @__PURE__ */ new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = /* @__PURE__ */ new Date();
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
        upcomingBookings: parseInt(upcomingBookings.rows[0].count)
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
        createdAt: b.created_at
      })),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function getRevenueChart(req, res) {
  try {
    const operatorId = req.operator?.id;
    const { period = "week" } = req.query;
    let interval;
    let groupBy;
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
        revenue: parseFloat(row.revenue)
      }))
    });
  } catch (error) {
    console.error("Revenue chart error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}
async function getTopActivities(req, res) {
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
        totalRevenue: parseFloat(row.total_revenue)
      }))
    });
  } catch (error) {
    console.error("Top activities error:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// server/seed.ts
import { createHash as createHash2 } from "crypto";
function hashPassword3(password) {
  return createHash2("sha256").update(password).digest("hex");
}
async function seedDatabase() {
  console.log("Seeding database...");
  const existingOperator = await query("SELECT id FROM operators WHERE email = $1", ["admin@digtravel.com"]);
  if (existingOperator.rows.length === 0) {
    const result = await query(
      `INSERT INTO operators (email, password_hash, company_name, contact_name, phone, cities, commission_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        "admin@digtravel.com",
        hashPassword3("admin123"),
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
        description: "Profitez d'une session inoubliable de jet ski sur les magnifiques plages du Club des Pins. \xC9quipement professionnel et moniteur certifi\xE9 inclus.",
        price: 12e3,
        currency: "DZD",
        category: "plage",
        cityId: "alger",
        duration: "1h",
        maxPeople: 2,
        images: ["https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"],
        includes: ["\xC9quipement complet", "Assurance", "Photos souvenir", "Vestiaires"],
        excludes: ["Transport", "Repas"],
        status: "active"
      },
      {
        title: "D\xEEner Gastronomique \xC9toil\xE9",
        description: "Exp\xE9rience culinaire unique au coeur d'Alger. Menu d\xE9gustation 7 plats avec vue panoramique sur la baie.",
        price: 18e3,
        currency: "DZD",
        category: "restaurant",
        cityId: "alger",
        duration: "3h",
        maxPeople: 8,
        images: ["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"],
        includes: ["Menu d\xE9gustation", "Vin accompagnement", "Service VIP", "Parking"],
        excludes: ["Boissons suppl\xE9mentaires"],
        status: "active"
      },
      {
        title: "Safari D\xE9sert Premium",
        description: "Vivez l'aventure du d\xE9sert avec dune bashing, balade \xE0 dos de chameau et d\xEEner sous les \xE9toiles.",
        price: 450,
        currency: "AED",
        category: "aventure",
        cityId: "dubai",
        duration: "6h",
        maxPeople: 20,
        images: ["https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=800"],
        includes: ["Transport 4x4", "Dune bashing", "Chameau", "D\xEEner BBQ", "Spectacles"],
        excludes: ["Boissons alcoolis\xE9es", "Photos professionnelles"],
        status: "active"
      },
      {
        title: "Burj Khalifa At The Top",
        description: "Montez au sommet du plus haut building du monde pour une vue \xE0 360\xB0 sur Dubai.",
        price: 350,
        currency: "AED",
        category: "circuits",
        cityId: "dubai",
        duration: "2h",
        maxPeople: 10,
        images: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800"],
        includes: ["Billet coupe-file", "Acc\xE8s 148\xE8me \xE9tage", "Rafra\xEEchissements", "Guide audio"],
        excludes: ["Transport", "Repas"],
        status: "active"
      },
      {
        title: "Excursion Phi Phi Islands",
        description: "D\xE9couvrez les \xEEles paradisiaques de Phi Phi, snorkeling dans les eaux cristallines et plages de r\xEAve.",
        price: 2500,
        currency: "THB",
        category: "plage",
        cityId: "phuket",
        duration: "Journ\xE9e",
        maxPeople: 30,
        images: ["https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800"],
        includes: ["Speedboat A/R", "D\xE9jeuner", "\xC9quipement snorkeling", "Guide francophone"],
        excludes: ["Frais parc national", "Boissons"],
        status: "active"
      },
      {
        title: "Hammam Royal & Massage",
        description: "Exp\xE9rience spa compl\xE8te dans le plus beau riad de la m\xE9dina. Hammam traditionnel et massage relaxant.",
        price: 850,
        currency: "MAD",
        category: "spa",
        cityId: "marrakech",
        duration: "3h",
        maxPeople: 4,
        images: ["https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800"],
        includes: ["Hammam", "Gommage", "Massage 60min", "Th\xE9 & p\xE2tisseries"],
        excludes: ["Soins suppl\xE9mentaires", "Produits"],
        status: "active"
      },
      {
        title: "Location Mercedes Classe S",
        description: "Louez la prestigieuse Mercedes Classe S avec chauffeur pour vos d\xE9placements VIP.",
        price: 35e3,
        currency: "DZD",
        category: "location",
        cityId: "alger",
        duration: "Journ\xE9e",
        maxPeople: 4,
        images: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800"],
        includes: ["Chauffeur professionnel", "Carburant", "Eau min\xE9rale", "WiFi"],
        excludes: ["P\xE9ages", "Parking"],
        status: "active"
      },
      {
        title: "Circuit Premium Casbah & Mus\xE9es",
        description: "D\xE9couvrez l'histoire d'Alger avec un guide expert : Casbah UNESCO, Mus\xE9e des Beaux-Arts, Jardin d'Essai.",
        price: 15e3,
        currency: "DZD",
        category: "circuits",
        cityId: "alger",
        duration: "5h",
        maxPeople: 8,
        images: ["https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800"],
        includes: ["Guide francophone", "Entr\xE9es mus\xE9es", "Transport climatis\xE9", "D\xE9jeuner traditionnel"],
        excludes: ["Pourboires", "Achats personnels"],
        status: "active"
      }
    ];
    for (const activity of sampleActivities) {
      await query(
        `INSERT INTO activities (
          operator_id, title, description, price, currency, category, city_id,
          duration, max_people, images, includes, excludes, status, rating, review_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
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
          Math.floor(50 + Math.random() * 200)
        ]
      );
    }
    console.log(`Seeded ${sampleActivities.length} activities`);
  } else {
    console.log("Database already seeded");
  }
}
var isMainModule = typeof import.meta?.url !== "undefined" && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedDatabase().then(() => {
    console.log("Seed completed");
    process.exit(0);
  }).catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}

// server/planner.ts
import { Router } from "express";
import OpenAI from "openai";
var router = Router();
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
router.post("/generate", async (req, res) => {
  try {
    const { cityId, cityName, startDate, endDate, numPeople, context, preferences } = req.body;
    const activitiesResult = await query(
      `SELECT id, title, description, price, currency, category, duration, rating, tags
       FROM activities 
       WHERE city_id = $1 AND status = 'active'
       ORDER BY rating DESC NULLS LAST
       LIMIT 50`,
      [cityId]
    );
    let availableActivities = activitiesResult.rows;
    const contextTagMap = {
      "COUPLE": "couple",
      "FAMILY": "family",
      "FRIENDS": "friends",
      "SOLO": "solo"
    };
    const contextTag = context ? contextTagMap[context] : null;
    if (contextTag) {
      const matchingActivities = availableActivities.filter(
        (a) => (a.tags || []).includes(contextTag)
      );
      const otherActivities = availableActivities.filter(
        (a) => !(a.tags || []).includes(contextTag)
      );
      availableActivities = [...matchingActivities, ...otherActivities];
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripDays = Math.ceil((end.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
    const activitiesPerDay = preferences.rhythm === "relax" ? 2 : preferences.rhythm === "intense" ? 4 : 3;
    const contextLabel = context === "COUPLE" ? "en couple" : context === "FAMILY" ? "en famille" : context === "FRIENDS" ? "entre amis" : context === "SOLO" ? "en solo" : "";
    const prompt = `Tu es un expert en planification de voyages. Cree un planning de vacances pour ${tripDays} jours a ${cityName}.

Preferences du voyageur:
- Rythme: ${preferences.rhythm} (${activitiesPerDay} activites par jour)
- Interets: ${preferences.interests.join(", ")}
- Budget: ${preferences.budget}
- Nombre de personnes: ${numPeople}
${contextLabel ? `- Voyage ${contextLabel}` : ""}
${preferences.carRental ? "- A une voiture de location" : ""}
${preferences.driver ? "- A un chauffeur" : ""}

Activites disponibles (certaines sont adaptees au contexte ${contextLabel}):
${availableActivities.map((a) => {
      const tags = (a.tags || []).length > 0 ? ` [${a.tags.join(", ")}]` : "";
      return `- ${a.title} (${a.category}, ${a.duration || "2h"}, ${a.price}${a.currency || "EUR"})${tags}`;
    }).join("\n")}

Cree un planning JSON avec le format suivant. REPONDS UNIQUEMENT AVEC LE JSON, sans texte avant ou apres:
{
  "planning": [
    {
      "date": "2024-01-15",
      "dayLabel": "lundi 15 janvier",
      "activities": [
        {
          "id": "uuid-de-lactivite",
          "title": "Nom de l'activite",
          "time": "09:00",
          "duration": "2h",
          "category": "culture",
          "price": 25,
          "currency": "EUR"
        }
      ]
    }
  ]
}

Regles:
- Inclus des pauses "Temps libre" entre les activites (isBreak: true, time: "", price: 0)
- Repartis les activites de facon logique (pas 3 activites physiques le meme jour)
- Commence le planning le ${start.toISOString().split("T")[0]}
- Alterne entre les types d'activites selon les interets
- Respecte le budget et le rythme souhaite
${contextLabel ? `- IMPORTANT: Privilegie les activites adaptees a un voyage ${contextLabel}` : ""}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un assistant de planification de voyages. Reponds uniquement en JSON valide." },
        { role: "user", content: prompt }
      ],
      max_tokens: 4e3,
      temperature: 0.7
    });
    const responseText = completion.choices[0]?.message?.content || "";
    let planningData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planningData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      planningData = generateFallbackPlanning(start, end, availableActivities, preferences, activitiesPerDay);
    }
    res.json(planningData);
  } catch (error) {
    console.error("Planner generation error:", error);
    res.status(500).json({ error: "Failed to generate planning" });
  }
});
function generateFallbackPlanning(start, end, activities, preferences, activitiesPerDay) {
  const days = [];
  let currentDate = new Date(start);
  let activityIndex = 0;
  while (currentDate <= end) {
    const dayActivities = [];
    for (let i = 0; i < activitiesPerDay; i++) {
      if (activityIndex < activities.length) {
        const activity = activities[activityIndex % activities.length];
        const hour = 9 + i * 3;
        dayActivities.push({
          id: activity.id,
          title: activity.title,
          time: `${hour.toString().padStart(2, "0")}:00`,
          duration: activity.duration || "2h",
          category: activity.category || "culture",
          price: parseFloat(activity.price) || 0,
          currency: activity.currency || "EUR"
        });
        if (i < activitiesPerDay - 1) {
          dayActivities.push({
            id: `break-${currentDate.toISOString()}-${i}`,
            title: "Temps libre",
            time: "",
            duration: "1h",
            category: "break",
            price: 0,
            currency: "EUR",
            isBreak: true
          });
        }
        activityIndex++;
      }
    }
    days.push({
      date: currentDate.toISOString(),
      dayLabel: currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      activities: dayActivities
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return { planning: days };
}
var planner_default = router;

// server/routes.ts
async function registerRoutes(app2) {
  await initDatabase();
  await seedDatabase();
  app2.post("/api/auth/register", register);
  app2.post("/api/auth/login", login);
  app2.post("/api/auth/logout", logout);
  app2.get("/api/auth/session", getSession);
  app2.put("/api/auth/profile", updateProfile);
  app2.get("/api/bookings", getBookings);
  app2.post("/api/bookings", createBooking);
  app2.post("/api/operator/auth/login", operatorLogin);
  app2.post("/api/operator/auth/logout", operatorLogout);
  app2.get("/api/operator/auth/session", getOperatorSession);
  app2.post("/api/operator/auth/register", createOperator);
  app2.get("/api/activities", getActivities);
  app2.get("/api/activities/:id", getActivity);
  app2.post("/api/activities", operatorAuthMiddleware, createActivity);
  app2.patch("/api/activities/:id", operatorAuthMiddleware, updateActivity);
  app2.delete("/api/activities/:id", operatorAuthMiddleware, deleteActivity);
  app2.patch("/api/activities/:id/status", operatorAuthMiddleware, toggleActivityStatus);
  app2.get("/api/operator/dashboard", operatorAuthMiddleware, getDashboardStats);
  app2.get("/api/operator/dashboard/revenue", operatorAuthMiddleware, getRevenueChart);
  app2.get("/api/operator/dashboard/top-activities", operatorAuthMiddleware, getTopActivities);
  app2.get("/api/operator/bookings", operatorAuthMiddleware, getOperatorBookings);
  app2.patch("/api/operator/bookings/:id/status", operatorAuthMiddleware, updateBookingStatus);
  app2.use("/api/planner", planner_default);
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
import { createServer } from "node:http";
var app = express();
var log = console.log;
var appReady = false;
app.get("/health", (_req, res) => {
  res.status(200).send("ok");
});
app.get("/", (req, res, next) => {
  const userAgent = req.header("user-agent") || "";
  if (!appReady || userAgent.includes("GoogleHC") || userAgent.includes("kube-probe") || req.query._health !== void 0) {
    return res.status(200).send("ok");
  }
  next();
});
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use("/admin", express.static(path.resolve(process.cwd(), "admin")));
  app2.get("/admin", (req, res) => {
    res.sendFile(path.resolve(process.cwd(), "admin", "index.html"));
  });
  app2.get("/", (req, res) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    return serveLandingPage({
      req,
      res,
      landingPageTemplate,
      appName
    });
  });
  app2.get("/manifest", (req, res, next) => {
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
  log("Admin CRM available at /admin");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
setupCors(app);
setupBodyParsing(app);
setupRequestLogging(app);
configureExpoAndLanding(app);
var httpServer = createServer(app);
var isDev = process.env.NODE_ENV === "development";
var defaultPort = isDev ? "5000" : "8081";
var port = parseInt(process.env.PORT || defaultPort, 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true
  },
  () => {
    log(`express server serving on port ${port}`);
  }
);
registerRoutes(app).then(() => {
  setupErrorHandler(app);
  appReady = true;
  log("Application fully initialized");
}).catch((err) => {
  log("Failed to initialize application:", err);
});
