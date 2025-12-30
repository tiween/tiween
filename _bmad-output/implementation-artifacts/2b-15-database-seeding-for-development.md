# Story 2B.15: Database Seeding for Development

Status: ready-for-dev

---

## Story

As a **developer**,
I want to create database seeds for development and testing,
So that developers have realistic Tunisian data to work with when building and testing the application.

## Acceptance Criteria

1. **AC#1**: Seed scripts are created at `scripts/seeds/`
2. **AC#2**: Seeds create realistic sample data:
   - 5 sample venues (different types and cities)
   - 20 sample creative works (mix of films, plays, shorts)
   - 50 sample events with showtimes
   - 3 test users (regular, venue-manager, admin)
   - Sample orders and tickets
3. **AC#3**: Seeds include realistic Tunisian data (French/Arabic titles, local venues)
4. **AC#4**: Seed command is added: `yarn seed`
5. **AC#5**: Seeds are idempotent (can run multiple times safely)
6. **AC#6**: Test fixtures use subset of seed data
7. **AC#7**: Seeds can be run in isolation or as part of fresh setup
8. **AC#8**: Clear seed command exists: `yarn seed:clear`

## Tasks / Subtasks

- [ ] **Task 1: Setup Seed Infrastructure** (AC: #1, #4, #8)

  - [ ] 1.1 Create `scripts/seeds/` directory structure
  - [ ] 1.2 Create seed runner with proper ordering
  - [ ] 1.3 Add `yarn seed` command to package.json
  - [ ] 1.4 Add `yarn seed:clear` command for cleanup
  - [ ] 1.5 Create seed configuration file

- [ ] **Task 2: Create Reference Data Seeds** (AC: #2, #3, #5)

  - [ ] 2.1 Seed Tunisian regions (Grand Tunis, Sfax, Sousse, etc.)
  - [ ] 2.2 Seed major cities per region
  - [ ] 2.3 Seed event categories (Cinéma, Théâtre, Concert, etc.)
  - [ ] 2.4 Seed film genres (Drame, Comédie, Action, etc.)
  - [ ] 2.5 Add idempotency checks

- [ ] **Task 3: Create Person Seeds** (AC: #2, #3)

  - [ ] 3.1 Seed sample directors (Tunisian and international)
  - [ ] 3.2 Seed sample actors
  - [ ] 3.3 Include profile photos (placeholder URLs)

- [ ] **Task 4: Create Venue Seeds** (AC: #2, #3)

  - [ ] 4.1 Seed 2 cinemas (different cities)
  - [ ] 4.2 Seed 2 theaters
  - [ ] 4.3 Seed 1 cultural center
  - [ ] 4.4 Include realistic addresses, coordinates, logos

- [ ] **Task 5: Create CreativeWork Seeds** (AC: #2, #3)

  - [ ] 5.1 Seed 10 films (mix of Tunisian and international)
  - [ ] 5.2 Seed 5 plays
  - [ ] 5.3 Seed 5 short films
  - [ ] 5.4 Include French and Arabic titles
  - [ ] 5.5 Link to seeded genres and persons

- [ ] **Task 6: Create Event Seeds** (AC: #2, #3)

  - [ ] 6.1 Seed 50 events across venues
  - [ ] 6.2 Create showtimes for each event
  - [ ] 6.3 Mix of past, current, and future events
  - [ ] 6.4 Some featured events for homepage

- [ ] **Task 7: Create User Seeds** (AC: #2)

  - [ ] 7.1 Create regular user: `user@test.com` / `Test123!`
  - [ ] 7.2 Create venue manager: `manager@test.com` / `Test123!`
  - [ ] 7.3 Create admin: `admin@test.com` / `Test123!`
  - [ ] 7.4 Set appropriate roles and permissions

- [ ] **Task 8: Create Ticketing Seeds** (AC: #2)

  - [ ] 8.1 Create sample orders for test user
  - [ ] 8.2 Create tickets with QR codes
  - [ ] 8.3 Mix of valid, scanned, and expired tickets

- [ ] **Task 9: Create Watchlist Seeds** (AC: #2)

  - [ ] 9.1 Add items to test user's watchlist
  - [ ] 9.2 Mix of different creative work types

- [ ] **Task 10: Create Test Fixtures** (AC: #6)

  - [ ] 10.1 Extract minimal fixture data for unit tests
  - [ ] 10.2 Create fixture file at `apps/strapi/tests/fixtures/`
  - [ ] 10.3 Document fixture usage

- [ ] **Task 11: Documentation** (AC: #4, #7)
  - [ ] 11.1 Document seed commands in README
  - [ ] 11.2 Document test user credentials
  - [ ] 11.3 Add seed data reference table

---

## Dev Notes

### Architecture Decision Reference

From epic requirements:

```
Seeds include realistic Tunisian data (French/Arabic titles, local venues)
3 test users (regular, venue-manager, admin)
```

### Directory Structure

```
scripts/seeds/
├── index.ts                    # Main seed runner
├── config.ts                   # Seed configuration
├── clear.ts                    # Clear all seeded data
├── utils/
│   ├── strapi-client.ts        # Strapi API/DB client
│   ├── password.ts             # Password hashing utility
│   └── dates.ts                # Date generation helpers
├── data/
│   ├── regions.json
│   ├── cities.json
│   ├── categories.json
│   ├── genres.json
│   ├── persons.json
│   ├── venues.json
│   ├── creative-works.json
│   ├── events.json
│   └── users.json
└── seeders/
    ├── 01-regions.ts
    ├── 02-cities.ts
    ├── 03-categories.ts
    ├── 04-genres.ts
    ├── 05-persons.ts
    ├── 06-venues.ts
    ├── 07-creative-works.ts
    ├── 08-events.ts
    ├── 09-users.ts
    ├── 10-orders.ts
    └── 11-watchlists.ts
```

### Sample Tunisian Regions Data

```json
// scripts/seeds/data/regions.json
[
  { "name": "Grand Tunis", "name_ar": "تونس الكبرى", "code": "GT" },
  { "name": "Cap Bon", "name_ar": "الوطن القبلي", "code": "CB" },
  { "name": "Sahel", "name_ar": "الساحل", "code": "SH" },
  { "name": "Sfax", "name_ar": "صفاقس", "code": "SF" },
  { "name": "Sud", "name_ar": "الجنوب", "code": "SD" },
  { "name": "Nord-Ouest", "name_ar": "الشمال الغربي", "code": "NO" }
]
```

### Sample Cities Data

```json
// scripts/seeds/data/cities.json
[
  {
    "name": "Tunis",
    "name_ar": "تونس",
    "region": "GT",
    "lat": 36.8065,
    "lng": 10.1815
  },
  {
    "name": "La Marsa",
    "name_ar": "المرسى",
    "region": "GT",
    "lat": 36.8892,
    "lng": 10.3229
  },
  {
    "name": "Carthage",
    "name_ar": "قرطاج",
    "region": "GT",
    "lat": 36.8528,
    "lng": 10.3233
  },
  {
    "name": "Sousse",
    "name_ar": "سوسة",
    "region": "SH",
    "lat": 35.8256,
    "lng": 10.6084
  },
  {
    "name": "Sfax",
    "name_ar": "صفاقس",
    "region": "SF",
    "lat": 34.7406,
    "lng": 10.7603
  },
  {
    "name": "Hammamet",
    "name_ar": "الحمامات",
    "region": "CB",
    "lat": 36.4,
    "lng": 10.6167
  },
  {
    "name": "Nabeul",
    "name_ar": "نابل",
    "region": "CB",
    "lat": 36.4561,
    "lng": 10.7376
  },
  {
    "name": "Bizerte",
    "name_ar": "بنزرت",
    "region": "NO",
    "lat": 37.2744,
    "lng": 9.8739
  }
]
```

### Sample Venues Data

```json
// scripts/seeds/data/venues.json
[
  {
    "name": "CinéMadart",
    "name_ar": "سينما مادار",
    "type": "cinema",
    "city": "Carthage",
    "address": "Avenue de la République, Carthage",
    "phone": "+216 71 123 456",
    "email": "contact@cinemadart.tn",
    "capacity": 300,
    "lat": 36.8528,
    "lng": 10.3233,
    "status": "approved"
  },
  {
    "name": "Théâtre Municipal de Tunis",
    "name_ar": "المسرح البلدي تونس",
    "type": "theater",
    "city": "Tunis",
    "address": "Avenue Habib Bourguiba, Tunis",
    "phone": "+216 71 234 567",
    "email": "contact@theatremunicipial.tn",
    "capacity": 800,
    "lat": 36.799,
    "lng": 10.18,
    "status": "approved"
  },
  {
    "name": "Cinéma Le Palace",
    "name_ar": "سينما لو بالاس",
    "type": "cinema",
    "city": "Sousse",
    "address": "Rue de France, Sousse",
    "phone": "+216 73 123 456",
    "email": "contact@lepalace.tn",
    "capacity": 250,
    "lat": 35.8256,
    "lng": 10.6084,
    "status": "approved"
  },
  {
    "name": "Espace El Teatro",
    "name_ar": "فضاء التياترو",
    "type": "theater",
    "city": "La Marsa",
    "address": "Rue du Lac, La Marsa",
    "phone": "+216 71 345 678",
    "email": "contact@elteatro.tn",
    "capacity": 150,
    "lat": 36.8892,
    "lng": 10.3229,
    "status": "approved"
  },
  {
    "name": "Maison de la Culture Ibn Khaldoun",
    "name_ar": "دار الثقافة ابن خلدون",
    "type": "cultural-center",
    "city": "Tunis",
    "address": "Avenue de Paris, Tunis",
    "phone": "+216 71 456 789",
    "email": "contact@ibnkhaldoun.tn",
    "capacity": 400,
    "lat": 36.8,
    "lng": 10.185,
    "status": "approved"
  }
]
```

### Sample Creative Works Data

```json
// scripts/seeds/data/creative-works.json (excerpt)
[
  {
    "title": "L'Homme qui a vendu sa peau",
    "title_ar": "الرجل الذي باع ظهره",
    "originalTitle": "The Man Who Sold His Skin",
    "type": "film",
    "synopsis": "Un réfugié syrien accepte de faire tatouer son dos par un artiste contemporain célèbre pour obtenir la liberté de voyager...",
    "synopsis_ar": "لاجئ سوري يوافق على وشم ظهره من قبل فنان معاصر مشهور للحصول على حرية السفر...",
    "duration": 104,
    "releaseYear": 2020,
    "ageRating": "TP",
    "rating": 7.2,
    "genres": ["Drame"],
    "directors": ["Kaouther Ben Hania"],
    "country": "Tunisia"
  },
  {
    "title": "Tlamess",
    "title_ar": "طلمس",
    "originalTitle": "Tlamess",
    "type": "film",
    "synopsis": "Un soldat tunisien retourne à sa ville natale après la mort de sa mère...",
    "duration": 120,
    "releaseYear": 2019,
    "ageRating": "16+",
    "rating": 6.8,
    "genres": ["Drame", "Fantastique"],
    "directors": ["Ala Eddine Slim"],
    "country": "Tunisia"
  },
  {
    "title": "Noura rêve",
    "title_ar": "نورا تحلم",
    "originalTitle": "Noura's Dream",
    "type": "film",
    "synopsis": "Noura, mariée à un homme violent, tombe amoureuse d'un autre homme...",
    "duration": 93,
    "releaseYear": 2019,
    "ageRating": "16+",
    "rating": 6.5,
    "genres": ["Drame", "Romance"],
    "directors": ["Hinde Boujemaa"],
    "country": "Tunisia"
  },
  {
    "title": "Hedi, un vent de liberté",
    "title_ar": "إنهيدي",
    "originalTitle": "Hedi",
    "type": "film",
    "synopsis": "Hedi, jeune Tunisien, découvre l'amour et la liberté à quelques jours de son mariage arrangé...",
    "duration": 93,
    "releaseYear": 2016,
    "ageRating": "TP",
    "rating": 6.9,
    "genres": ["Drame", "Romance"],
    "directors": ["Mohamed Ben Attia"],
    "country": "Tunisia"
  },
  {
    "title": "À peine j'ouvre les yeux",
    "title_ar": "على حلّة عيني",
    "originalTitle": "As I Open My Eyes",
    "type": "film",
    "synopsis": "Farah, une jeune fille de 18 ans, préfère chanter dans un groupe de rock plutôt que d'étudier la médecine...",
    "duration": 102,
    "releaseYear": 2015,
    "ageRating": "TP",
    "rating": 7.1,
    "genres": ["Drame", "Musique"],
    "directors": ["Leyla Bouzid"],
    "country": "Tunisia"
  },
  {
    "title": "Dune: Partie 2",
    "title_ar": "كثيب: الجزء الثاني",
    "originalTitle": "Dune: Part Two",
    "type": "film",
    "synopsis": "Paul Atréides s'unit aux Fremen pour mener une révolte contre ceux qui ont détruit sa famille...",
    "duration": 166,
    "releaseYear": 2024,
    "ageRating": "12+",
    "rating": 8.8,
    "genres": ["Science-fiction", "Action", "Aventure"],
    "directors": ["Denis Villeneuve"],
    "country": "USA"
  },
  {
    "title": "Familia",
    "title_ar": "فاميليا",
    "originalTitle": "Familia",
    "type": "play",
    "synopsis": "Une pièce de théâtre explorant les dynamiques familiales tunisiennes...",
    "duration": 90,
    "releaseYear": 2024,
    "ageRating": "TP",
    "genres": ["Comédie", "Drame"],
    "directors": ["Jalila Baccar"],
    "country": "Tunisia"
  }
]
```

### Sample Events Data

```typescript
// scripts/seeds/seeders/08-events.ts
import { addDays, format, setHours } from "date-fns"

function generateEvents(creativeWorks: any[], venues: any[]) {
  const events = []
  const today = new Date()

  // Generate 50 events
  for (let i = 0; i < 50; i++) {
    const work = creativeWorks[i % creativeWorks.length]
    const venue = venues[i % venues.length]
    const startOffset = Math.floor(Math.random() * 30) - 10 // -10 to +20 days
    const startDate = addDays(today, startOffset)
    const endDate = addDays(startDate, 7 + Math.floor(Math.random() * 14))

    // Generate showtimes
    const showtimes = []
    const showtimeCount = 2 + Math.floor(Math.random() * 3)
    for (let j = 0; j < showtimeCount; j++) {
      const hour = 14 + j * 3 // 14:00, 17:00, 20:00
      showtimes.push({
        time: `${hour}:00:00`,
        format: work.type === "film" ? "VOST" : null,
        language: "ar",
        subtitles: "fr",
        price: 15 + Math.floor(Math.random() * 10),
        ticketsAvailable: 50 + Math.floor(Math.random() * 100),
        ticketsSold: Math.floor(Math.random() * 30),
      })
    }

    events.push({
      creativeWork: work.id,
      venue: venue.id,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      status: startOffset < -7 ? "completed" : "scheduled",
      featured: i < 5, // First 5 are featured
      showtimes,
    })
  }

  return events
}
```

### Test Users

```typescript
// scripts/seeds/seeders/09-users.ts
import bcrypt from "bcryptjs"

const TEST_PASSWORD = "Test123!"

export const testUsers = [
  {
    username: "testuser",
    email: "user@test.com",
    password: await bcrypt.hash(TEST_PASSWORD, 10),
    confirmed: true,
    blocked: false,
    role: "authenticated",
    preferredLanguage: "fr",
  },
  {
    username: "venuemanager",
    email: "manager@test.com",
    password: await bcrypt.hash(TEST_PASSWORD, 10),
    confirmed: true,
    blocked: false,
    role: "venue-manager",
    preferredLanguage: "fr",
    // Will be linked to first venue
  },
  {
    username: "admin",
    email: "admin@test.com",
    password: await bcrypt.hash(TEST_PASSWORD, 10),
    confirmed: true,
    blocked: false,
    role: "admin",
    preferredLanguage: "fr",
  },
]
```

### Seed Runner

```typescript
// scripts/seeds/index.ts
import { seedRegions } from "./seeders/01-regions"
import { seedCities } from "./seeders/02-cities"
import { seedCategories } from "./seeders/03-categories"
import { seedGenres } from "./seeders/04-genres"
import { seedPersons } from "./seeders/05-persons"
import { seedVenues } from "./seeders/06-venues"
import { seedCreativeWorks } from "./seeders/07-creative-works"
import { seedEvents } from "./seeders/08-events"
import { seedUsers } from "./seeders/09-users"
import { seedOrders } from "./seeders/10-orders"
import { seedWatchlists } from "./seeders/11-watchlists"
import { StrapiDB } from "./utils/strapi-client"

async function seed() {
  console.log("🌱 Starting database seeding...\n")

  const startTime = Date.now()

  try {
    // Reference data (required first)
    await seedRegions()
    await seedCities()
    await seedCategories()
    await seedGenres()

    // Content data
    await seedPersons()
    await seedVenues()
    await seedCreativeWorks()
    await seedEvents()

    // User data
    await seedUsers()
    await seedOrders()
    await seedWatchlists()

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Seeding complete in ${duration}s`)
    console.log("\n📋 Test Credentials:")
    console.log("   Regular User:    user@test.com / Test123!")
    console.log("   Venue Manager:   manager@test.com / Test123!")
    console.log("   Admin:           admin@test.com / Test123!")
  } catch (error) {
    console.error("❌ Seeding failed:", error)
    process.exit(1)
  }
}

seed()
```

### Clear Seeds Script

```typescript
// scripts/seeds/clear.ts
import { StrapiDB } from "./utils/strapi-client"

const SEED_TYPES = [
  "user-watchlist",
  "ticket",
  "ticket-order",
  "event",
  "creative-work",
  "venue",
  "person",
  "genre",
  "category",
  "city",
  "region",
]

async function clearSeeds() {
  console.log("🧹 Clearing seeded data...\n")

  for (const type of SEED_TYPES) {
    try {
      const count = await StrapiDB.deleteAll(type, { seeded: true })
      console.log(`   Deleted ${count} ${type} records`)
    } catch (error) {
      console.error(`   Failed to clear ${type}:`, error.message)
    }
  }

  // Clear test users
  await StrapiDB.deleteAll("user", {
    email: { $in: ["user@test.com", "manager@test.com", "admin@test.com"] },
  })

  console.log("\n✅ Clear complete")
}

clearSeeds()
```

### Idempotency Pattern

```typescript
// scripts/seeds/seeders/01-regions.ts
export async function seedRegions() {
  console.log("📍 Seeding regions...")

  const regions = require("../data/regions.json")
  let created = 0,
    skipped = 0

  for (const region of regions) {
    // Check if already exists (idempotency)
    const existing = await StrapiDB.findOne("region", { code: region.code })

    if (existing) {
      skipped++
      continue
    }

    await StrapiDB.create("region", {
      ...region,
      seeded: true, // Mark as seeded for easy cleanup
      locale: "fr",
      localizations: region.name_ar
        ? [{ name: region.name_ar, locale: "ar" }]
        : [],
    })
    created++
  }

  console.log(`   Created: ${created}, Skipped: ${skipped}`)
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "seed": "tsx scripts/seeds/index.ts",
    "seed:clear": "tsx scripts/seeds/clear.ts",
    "seed:fresh": "yarn seed:clear && yarn seed"
  }
}
```

### Test Fixtures

```typescript
// apps/strapi/tests/fixtures/index.ts
export const fixtures = {
  users: {
    regular: {
      email: "user@test.com",
      password: "Test123!",
    },
    venueManager: {
      email: "manager@test.com",
      password: "Test123!",
    },
    admin: {
      email: "admin@test.com",
      password: "Test123!",
    },
  },
  venues: {
    cinema: { name: "CinéMadart" },
    theater: { name: "Théâtre Municipal de Tunis" },
  },
  creativeWorks: {
    film: { title: "L'Homme qui a vendu sa peau" },
    play: { title: "Familia" },
  },
}
```

### Previous Story Context

From **Story 2B.14 (Data Migration Scripts)**:

- Similar script structure in `scripts/`
- Database client utilities can be shared
- ID mapping pattern for relations

From **Story 2B.1-2B.12**:

- All content-types are created
- User roles configured
- Ready to receive seed data

### Files to Create

```
scripts/seeds/
├── index.ts
├── config.ts
├── clear.ts
├── utils/
│   ├── strapi-client.ts
│   ├── password.ts
│   └── dates.ts
├── data/
│   ├── regions.json
│   ├── cities.json
│   ├── categories.json
│   ├── genres.json
│   ├── persons.json
│   ├── venues.json
│   ├── creative-works.json
│   └── events.json
└── seeders/
    ├── 01-regions.ts
    ├── 02-cities.ts
    ├── 03-categories.ts
    ├── 04-genres.ts
    ├── 05-persons.ts
    ├── 06-venues.ts
    ├── 07-creative-works.ts
    ├── 08-events.ts
    ├── 09-users.ts
    ├── 10-orders.ts
    └── 11-watchlists.ts

apps/strapi/tests/fixtures/
└── index.ts

package.json  # Add seed scripts
README.md     # Document test credentials
```

### References

- [Strapi v5 Database Layer](https://docs.strapi.io/dev-docs/backend-customization/models)
- [date-fns for Date Manipulation](https://date-fns.org/)
- [bcryptjs for Password Hashing](https://www.npmjs.com/package/bcryptjs)
- [Source: _bmad-output/project-planning-artifacts/epics/epic-2b-strapi-v5-migration-backend-foundation-parallel-track-b.md#Story 2B.15]

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
