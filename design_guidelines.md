# DIG TRAVEL - Design Guidelines (Compacted)

## Architecture & Navigation

**Auth:** None required for MVP. Form-only bookings, no user accounts.

**Flow:** Stack Navigator (linear)
```
Splash (2s) → CitySelector → CityLanding → ActivityList → ActivityDetail → BookingForm
```

**Persistence:** Selected city stored in AsyncStorage, retrieved via navigation params.

---

## Design System

### Colors
- **Primary:** `#1a1a2e` (navy - headers/text)
- **Secondary:** `#f39c12` (orange - CTAs/accents)
- **Background:** `#f5f5f5` (light gray)
- **Success:** `#4CAF50` | **Error:** `#F44336`
- **Text:** `#1a1a2e` / `#666` / `#999`
- **Border:** `#ddd`

### Typography (System: SF Pro/Roboto)
32px (hero) | 28px (H1) | 24px (H2) | 20px (H3) | 18px (H4) | 16px (body large) | 14px (body) | 12px (small) | 10px (tiny)

### Spacing
24px (XL) | 20px (L) | 16px (M) | 12px (S) | 8px (XS) | 4px (tiny)

### Shadows
- **Card:** `{width: 0, height: 2}, opacity: 0.08, radius: 4`
- **Elevated:** `{width: 0, height: 3}, opacity: 0.12, radius: 6`

### Border Radius
12px (cards) | 8-16px (buttons) | 20px (chips) | 8px (inputs)

### Interactions
- Touch opacity: 70%
- CTA scale on press: 0.98
- Min touch target: 44×44px
- Text contrast: 4.5:1

---

## Screens

### 1. Splash
**Layout:** Full-screen gradient (#1a1a2e → #2d3561), centered content
- "DIG TRAVEL" (32px, white, bold)
- "✈️" emoji (32px)
- "Découvre les meilleures expériences locales" (16px, white @ 70%)
- White spinner 60px from bottom
- Auto-navigate after 2s, no header

---

### 2. City Selector
**Header:** Transparent, centered
- "Où vas-tu ?" (28px, #1a1a2e, bold) + "Choisis ta destination" (14px, #666)
- Top: `insets.top + 24px`

**Content:** ScrollView, 5 city cards (100% width × 120px height, 15px margin-bottom)
- Photo background + 40% dark overlay
- Shadow: `{width: 0, height: 2}, opacity: 0.1, radius: 4`
- Border radius: 12px, 20px padding
- Flag emoji + City (24px, white, bold)
- "X activités disponibles" (12px, white @ 70%)

**Cities:**
1. 🇩🇿 Alger - 28 activités
2. 🇦🇪 Dubai - 45 activités
3. 🇶🇦 Doha - 18 activités
4. 🇹🇭 Phuket - 52 activités
5. 🇲🇦 Marrakech - 31 activités

**Action:** Tap → AsyncStorage + navigate

---

### 3. City Landing
**Hero (280px):** City photo + bottom gradient (transparent → 60% black), transparent header
- "Bienvenue à [VILLE]" (28px, white, bold)
- "Propulsé par [OPERATOR]" (14px, white @ 80%)
- Bottom-left: 24px padding

**Operator Card:** Below hero, white bg, 20px padding, 16px radius, elevated shadow
- Horizontal: Circular logo (80px, #f5f5f5) + Name (18px, bold) + "⭐ 4.9 (127 avis)" (14px, #666) + "✓ Vérifié DIG TRAVEL" (12px, #4CAF50)

**Categories:** Horizontal ScrollView
- Title: "Catégories" (20px, bold)
- 5 chips: 🏖️ Plage & Mer | 🍽️ Restaurants | 🎉 Vie nocturne | 🏃 Aventure | 🧘 Bien-être
- Style: white bg, 2px #f39c12 border, 20px radius, 10px×20px padding

**Popular Activities:** 2-column grid (ActivityCard components)

**Fixed Bottom Button:** "Voir toutes les activités →" (50px, orange, white 16px bold, full-width 20px margins, `insets.bottom + 20px`)

**Operators:** Alger/Dubai/Doha = "VIP PLATINIUM" | Phuket = "Phuket For You" | Marrakech = "Marrakech Experiences"

---

### 4. Activity List
**Header:** White bg, shadow, back arrow + "[VILLE] - Activités" + filter icon

**Filters:** Horizontal scroll chips
- "Tous" (selected: orange bg, white text)
- "Plage", "Restaurant", "Aventure", "Spa" (unselected: white bg, 1px #ddd border, #666 text)

**Grid:** 2 columns, 12px gap, 6 activities/city

**ActivityCard:**
- 4:3 aspect ratio, 12px radius, card shadow, white bg, 8px padding
- Photo + category badge (top-right overlay: white text, semi-transparent black bg)
- Title (14px, bold, 2 lines max)
- Price (18px, #f39c12, bold)
- "⭐ 4.8 (34 avis)" (12px, #666)
- "Par [OPERATOR]" (10px, #999)

**Sample (Alger):**
1. Jet Ski 30min - 1,200 DZD - Plage
2. Restaurant Le Bardo VIP - 8,000 DZD - Restaurant
3. Plage privée Club des Pins - 3,500 DZD - Plage
4. Excursion Tipaza - 5,000 DZD - Aventure
5. Hammam & Spa traditionnel - 4,200 DZD - Spa
6. Dîner sur yacht - 15,000 DZD - Restaurant

---

### 5. Activity Detail
**Photo Carousel (300px):** 5 photos, horizontal scroll, white dot indicators, back button overlay (top-left 40px, white semi-transparent circle)

**Content (20px padding):**
- Title (24px, bold)
- "⭐ 4.8 (34 avis)" (14px, tappable)
- Price (32px, #f39c12, bold) + "/personne" (16px, #666)
- Operator badge + mini logo

**Sections (18px bold titles, 16px top margin):**
- **À propos:** Description (14px, line-height: 1.6, #333)
- **Inclus:** Light green bg (#E8F5E9), 16px padding, 8px radius, "✓" list (14px, #4CAF50)
- **Non inclus:** Light red bg (#FFEBEE), 16px padding, 8px radius, "✗" list (14px, #F44336)
- **Date:** Calendar icon + "Sélectionner la date" → DateTimePicker modal

**Fixed Bottom:** "Réserver maintenant - [PRICE]" (50px, orange, white 16px bold, `insets.bottom + 16px`)

---

### 6. Booking Form
**Header:** "Finaliser la réservation" + back button

**Recap Card (16px margin, light gray bg):**
- Horizontal: Mini photo (80×60px, 8px radius) + title/date/price
- 12px padding, 8px radius

**Form (20px padding):**
- "Nom complet" (required)
- "Email" (email keyboard, required)
- "Téléphone" (phone keyboard, required)
- Style: white bg, 1px #ddd border, 12px padding, 8px radius

**Payment (16px bold title):**
- Radio: "Payer maintenant par carte" | "Payer en cash sur place"
- Style: circular, orange when selected

**Submit:** "Confirmer la réservation" (50px, orange, white 16px bold, 24px top margin)

**MVP Action:** Alert "Réservation confirmée ! (Paiement Stripe à venir)"

---

## Assets

**City Photos (Unsplash):** Alger (Mediterranean), Dubai (Burj Khalifa), Doha (skyline), Phuket (long-tail boat), Marrakech (medina)

**Activity Photos:** 30 total (6 per city) - water sports, beach clubs, restaurants, adventure, spa, yachts

**Operator Logos:** 80px circular placeholders, gray bg + initials

**Icons:** Feather (@expo/vector-icons) - arrow-left, filter, calendar, check, x. Categories use emojis.

---

## Accessibility
- 44×44px min touch targets
- 4.5:1 text contrast
- Clear form labels/error states
- Descriptive alt text
- Loading states for async operations