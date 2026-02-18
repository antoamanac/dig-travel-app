# DIG TRAVEL - Mobile Tourist Activity Booking App

## Overview
DIG TRAVEL is a mobile application for booking tourist activities across multiple destinations. Built with React Native and Expo, it allows users to browse activities in cities like Alger, Dubai, Los Angeles, Phuket, and Marrakech. Includes a CRM admin panel for operators to manage activities, pricing, and bookings in real-time.

## Current State
MVP complete with:
- User authentication (local PostgreSQL), guest mode by default
- Profile management, booking history
- CRM admin panel at /admin for operators (dashboard, activities CRUD, bookings management)
- Real-time sync between CRM and mobile app (10-second auto-refresh)
- Activities fetched from database with fallback to mock data
- Availability management: time slots per activity (day/time/capacity), blocked dates
- Booking capacity validation: checks remaining spots before accepting bookings
- Operator confirmation workflow: confirm/refuse bookings with optional reason
- Notifications system: operators get notified of new bookings, users get notified of status changes

Navigation flow: 
- Classic: Splash -> City Selection -> City Welcome -> Mode Selection -> Explorer -> City Landing -> Activity List -> Activity Detail -> Booking Form
- DIG PILOT: Splash -> City Selection -> City Welcome -> Mode Selection -> DIG PILOT flow (5 steps: Basic Info -> Context -> Preferences -> Budget -> Transport) -> Planning Generation -> City Landing

## Tech Stack
- **Frontend:** React Native with Expo SDK 54
- **Navigation:** React Navigation 7 (Native Stack)
- **Animations:** React Native Reanimated with spring/timing animations
- **State Management:** React hooks + React Query + AuthContext
- **Backend:** Express.js (port 5000) + PostgreSQL (local database)
- **CRM:** Single-page HTML/JS app with Tailwind CSS (no build step)
- **Authentication:** Token-based auth with SHA-256 password hashing
- **Styling:** React Native StyleSheet with custom theme system

## Project Structure
```
client/
  ├── components/          # Reusable UI components
  ├── constants/theme.ts   # Colors, spacing, typography, shadows
  ├── context/AuthContext.tsx
  ├── data/mockData.ts     # Cities, activities (fallback)
  ├── hooks/
  │   └── useActivities.ts # React Query hook for DB activities
  ├── lib/query-client.ts
  ├── navigation/RootStackNavigator.tsx
  ├── screens/             # All app screens
  └── App.tsx
server/
  ├── index.ts             # Express server (serves /admin)
  ├── routes.ts            # API route definitions
  ├── db.ts                # PostgreSQL database + schema
  ├── auth.ts              # User authentication
  ├── bookings.ts          # Booking CRUD + operator endpoints
  ├── operator-auth.ts     # Operator authentication
  ├── activities.ts        # Activities CRUD
  ├── availability.ts      # Time slot CRUD + capacity checks
  ├── notifications.ts     # Notification system for operators/users
  ├── dashboard.ts         # Dashboard KPIs
  └── seed.ts              # Sample data seeding
admin/
  └── index.html           # CRM single-page app
```

## Design System
### Global Colors
- **Highlight:** #FF5DA2 (pink - favorites, special actions - stays constant across all cities)
- **Success:** #00D9C0 / **Error:** #F44336

### Dynamic City Themes (client/constants/cityThemes.ts)
Each city has a unique color palette applied dynamically via `useCityTheme()` hook from CityContext:
- **Alger:** Mediterranean blue (#2E86AB accent, #4ECDC4 secondary, #071A2A bg)
- **Dubai:** Gold luxury (#D4A726 accent, #FFD700 secondary, #1A1408 bg)
- **Los Angeles:** Sunset vibes (#FEE440 accent, #FF8C42 orange secondary, #1A1210 bg)
- **Phuket:** Tropical (#00D9C0 accent, #FEE440 secondary, #071A1A bg) - default theme
- **Marrakech:** Desert warmth (#E87040 accent, #DEB887 secondary, #1A0F08 bg)

Implementation: All screens use inline style overrides `style={[styles.x, {backgroundColor: ct.background}]}` to apply city-specific colors while preserving base StyleSheet entries.

## Key Features
### Mobile App
1. **User Authentication** - Email/password login, token-based sessions (30-day expiry)
2. **Profile Management** - Editable name/phone, avatar placeholder, logout
3. **Animated Splash Screen** - DIG TRAVEL logo with animated airplane
4. **City Selection** - "Ou voyages-tu ?" with animated city cards (5 destinations)
5. **City Welcome Screen** - Full-screen "Bienvenue a [Ville]" animation
6. **Mode Selection** - Choice between MODE LIBRE (classic) and DIG PILOT (with first-time modal)
7. **DIG PILOT Flow V2** - AI-powered trip planning (5 steps with progress dots):
   - Basic Info: Date picker, adults/children stepper, children age groups (0-3, 4-10, 11+)
   - Context (skippable): Emotional context (Couple/Family/Friends/Solo)
   - Preferences: Rhythm (relax/balanced/intense) + interests (max 5 selections)
   - Budget: 3 tiers (Economy/Moderate/Comfort) with privacy guarantee
   - Transport (skippable): Self/Car rental/Driver/Unsure + "Generate my planning" CTA
   - Generation: Animated loading with progressive steps, AI creates day-by-day itinerary
   - Editable timeline with add/remove activities, notes, time/day changes
8. **City Landing** - Operator info, categories, popular activities
9. **Activity List** - Category filtering, 2-column grid, pull-to-refresh
10. **Activity Detail** - Photo carousel, date picker, pricing breakdown
11. **Booking Form** - Pre-filled user data, payment method, database save
12. **My Bookings** - Tabs (Tous/A venir/Passes), QR codes, status badges

### CRM Admin Panel (/admin)
1. **Operator Authentication** - Email/password login with JWT
2. **Dashboard** - KPIs (today's bookings, revenue, pending), recent bookings
3. **Activities Management** - List, create, edit, toggle status (active/paused)
4. **Bookings Management** - List with filters, confirm/cancel actions
5. **Real-time Sync** - Auto-refresh every 10 seconds
6. **Mobile App Integration** - Changes reflect instantly in client app

## Database Schema (PostgreSQL)
### users, sessions (existing)
### operators
- id (UUID), email, password_hash, company_name, contact_name, phone
- logo_url, cities (array), commission_rate, created_at, updated_at

### operator_sessions
- id (UUID), operator_id (FK), token, expires_at, created_at

### activities
- id (UUID), operator_id (FK), title, description, price, currency
- category, city_id, duration, max_people, images (array)
- includes (array), excludes (array), rating, review_count
- status (draft/active/paused/archived), payment_methods (jsonb)
- deposit_required, deposit_amount, meeting_point, min_booking_notice

### availability_slots
- id (UUID), activity_id (FK), day_of_week (1-7), start_time, end_time
- capacity (default 10), is_active (boolean), created_at

### blocked_dates
- id (UUID), activity_id (FK), blocked_date, reason, created_at

### bookings (extended)
- id (UUID), user_id (FK), activity_id (FK), operator_id (FK), slot_id
- legacy_activity_id, city_id, activity_title, activity_image
- scheduled_at, time_slot, num_people, price_per_person, total_price
- currency, status (confirmed/pending/completed/cancelled/refused)
- payment_status, payment_method, deposit_paid
- qr_code, customer_name/email/phone, notes, operator_reason
- created_at, updated_at

### notifications
- id (UUID), recipient_type (operator/user), recipient_id
- type, title, message, data (jsonb), is_read, created_at

### audit_logs
- id (UUID), operator_id, action, entity_type, entity_id, changes (jsonb)

## API Endpoints
### User Auth
- POST /api/auth/register, /login, /logout
- GET /api/auth/session
- PUT /api/auth/profile

### Operator Auth
- POST /api/operator/auth/login, /logout, /register
- GET /api/operator/auth/session

### Activities (public read, operator write)
- GET /api/activities?city=&category=&status=
- GET /api/activities/:id
- POST /api/activities (auth required)
- PATCH /api/activities/:id (auth required)
- PATCH /api/activities/:id/status (auth required)
- DELETE /api/activities/:id (auth required)

### Availability & Slots
- GET /api/activities/:id/slots?date= (public, returns available time slots)
- GET /api/activities/:id/available-days (public, returns available day numbers)
- PUT /api/activities/:id/slots (operator auth, upsert all slots)
- POST /api/activities/:id/blocked-dates (operator auth, block a date)
- DELETE /api/activities/:id/blocked-dates (operator auth, unblock a date)

### Operator Dashboard & Bookings
- GET /api/operator/dashboard
- GET /api/operator/dashboard/revenue?period=
- GET /api/operator/dashboard/top-activities
- GET /api/operator/bookings?status=&from_date=&to_date=
- PATCH /api/operator/bookings/:id/status (with optional reason field)

### User Bookings
- GET /api/bookings
- POST /api/bookings (validates slot capacity before accepting)

### Notifications
- GET /api/operator/notifications (operator auth)
- GET /api/notifications (user auth)
- PATCH /api/notifications/:id/read
- POST /api/notifications/mark-all-read

### AI Planner
- POST /api/planner/generate - AI-powered trip planning (uses OpenAI gpt-4o-mini)

## Running the App
- **Expo Web:** Port 8081
- **Express Backend:** Port 5000
- **CRM Admin:** http://localhost:5000/admin
- **Command:** `npm run dev` (runs both server and Expo)

## Test Credentials
- **CRM Admin:** admin@digtravel.com / admin123

## User Preferences
- Language: French (French text throughout the app)
- No emojis in UI (using Feather icons instead)
- Clean, modern design with iOS 26 liquid glass influences
- Smooth animations throughout the experience
- Vacation theme: #071A1A dark teal, #00D9C0 turquoise accent, #FEE440 yellow sun, #FF5DA2 pink highlight
