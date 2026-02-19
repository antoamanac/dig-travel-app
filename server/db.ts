import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function initDatabase() {
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
        apple_user_id TEXT UNIQUE,
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
        is_active BOOLEAN DEFAULT true,
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
        slot_id UUID,
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
        status TEXT CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled', 'refused')) DEFAULT 'pending',
        payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
        payment_method TEXT,
        deposit_paid NUMERIC DEFAULT 0,
        qr_code TEXT,
        customer_name TEXT,
        customer_email TEXT,
        customer_phone TEXT,
        notes TEXT,
        operator_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_type TEXT NOT NULL CHECK (recipient_type IN ('operator', 'user')),
        recipient_id UUID NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
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

      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        user_name TEXT NOT NULL,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Add tags column if not exists
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);

    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS location TEXT;
    `);
    
    console.log("Database tables initialized");
  } finally {
    client.release();
  }
}

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}
