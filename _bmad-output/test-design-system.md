# System-Level Test Design: Tiween Platform

**Generated**: 2025-12-30
**Mode**: System-Level (Phase 3 - Testability Review)
**Project**: Tiween - Event Discovery & Ticketing Platform for Tunisia

---

## 1. Executive Summary

**Project Overview**: Tiween is a brownfield PWA platform for cultural event discovery and ticketing in Tunisia, featuring B2C event browsing/ticketing and B2B venue management capabilities.

**Current Test State**:

- **Strapi Backend**: Minimal Jest setup with 1 smoke test (`app.test.js`)
- **Next.js Frontend**: No test infrastructure (Storybook configured but no tests)
- **Legacy Frontend**: Cypress E2E tests (2 specs) - to be deprecated
- **CI/CD**: GitHub Actions pipeline includes `yarn test` but limited coverage

**Key Testability Findings**:

| Area                | Rating    | Rationale                                                                       |
| ------------------- | --------- | ------------------------------------------------------------------------------- |
| **Controllability** | ⚠️ MEDIUM | API-first architecture enables test data setup; missing test fixtures/factories |
| **Observability**   | ⚠️ MEDIUM | Sentry configured for error tracking; no structured logging or APM yet          |
| **Isolation**       | ✅ GOOD   | Monorepo with clear boundaries (apps/client, apps/strapi, packages/\*)          |
| **Infrastructure**  | ❌ POOR   | No Playwright/Vitest setup; Jest only for Strapi smoke tests                    |

**Critical Actions Required**:

1. Establish test framework infrastructure (Playwright E2E, Vitest unit/integration)
2. Create data factories for deterministic test setup
3. Configure test database and Redis isolation
4. Add health check endpoint for observability
5. Define NFR test suites (security, performance, reliability)

---

## 2. Architecture Testability Assessment

### 2.1 Controllability Analysis

**Definition**: How easily can we set the system to a specific state for testing?

| Component                 | Controllability | Notes                                                                       |
| ------------------------- | --------------- | --------------------------------------------------------------------------- |
| **Strapi API**            | ✅ HIGH         | REST API allows direct data manipulation via `/api/*` endpoints             |
| **Database (PostgreSQL)** | ⚠️ MEDIUM       | Need test database isolation; seeding scripts exist (`scripts/seed-dev.ts`) |
| **Redis Cache**           | ⚠️ MEDIUM       | No test Redis instance configured; cache invalidation needed between tests  |
| **NextAuth Sessions**     | ⚠️ MEDIUM       | Can set auth cookies/storage state directly in tests                        |
| **External Services**     | ❌ LOW          | Konnect (payments), Algolia (search), ImageKit (CDN) require mocking        |
| **WebSocket/Real-time**   | ⚠️ MEDIUM       | Socket.io can be mocked; events-manager plugin needs testing hooks          |

**Recommendations**:

1. Create `apps/strapi/tests/factories/` with data factories (User, Event, Ticket, Venue)
2. Configure test PostgreSQL database (`DATABASE_URL_TEST`)
3. Add test Redis instance or use `ioredis-mock` for isolation
4. Create Playwright fixtures for auth state (`storageState`)
5. Mock external services via MSW (Mock Service Worker) or route interception

### 2.2 Observability Analysis

**Definition**: How easily can we observe system behavior and verify outcomes?

| Aspect             | Current State            | Test Impact                                             |
| ------------------ | ------------------------ | ------------------------------------------------------- |
| **Error Tracking** | ✅ Sentry configured     | Can verify error capture in NFR tests                   |
| **API Responses**  | ✅ JSON responses        | Easy to assert via Playwright `request` API             |
| **Database State** | ⚠️ Direct queries needed | Need test helpers to verify DB state                    |
| **Cache State**    | ❌ No visibility         | Need Redis inspection helpers                           |
| **Logs**           | ⚠️ Console only          | No structured logging for test correlation              |
| **Metrics**        | ❌ Not configured        | No APM/Server-Timing headers for performance validation |
| **Health Checks**  | ❌ Missing               | No `/api/health` endpoint for service monitoring        |

**Recommendations**:

1. Add `/api/health` endpoint to Strapi returning service status (DB, Redis, external services)
2. Configure structured JSON logging with correlation IDs (`x-trace-id`)
3. Add `Server-Timing` headers for APM validation in tests
4. Create test helpers: `verifyDatabaseState()`, `verifyRedisState()`
5. Add Sentry test integration to verify error capture

### 2.3 Isolation Analysis

**Definition**: How easily can we test components in isolation?

| Boundary                               | Isolation Level | Test Strategy                                                    |
| -------------------------------------- | --------------- | ---------------------------------------------------------------- |
| **UI Components** (`components/ui/`)   | ✅ EXCELLENT    | Pure props, no side effects → Storybook + Vitest component tests |
| **Feature Components** (`features/*/`) | ✅ GOOD         | Hooks for data, Zustand for state → Mock hooks in tests          |
| **API Layer** (`lib/api/`)             | ✅ GOOD         | Single responsibility → Unit test with mocked fetch              |
| **Zustand Stores** (`stores/`)         | ✅ GOOD         | Isolated state → Unit test with `create()`                       |
| **Strapi Services**                    | ⚠️ MEDIUM       | Depend on Strapi context → Integration tests                     |
| **Strapi Controllers**                 | ⚠️ MEDIUM       | Business logic → Integration tests with test DB                  |
| **Strapi Plugins**                     | ⚠️ MEDIUM       | events-manager needs isolated test suite                         |

**Architecture Boundaries (from project-structure-boundaries.md)**:

```
┌─────────────────┐     ┌─────────────────┐
│  Next.js Client │────▶│   Strapi API    │
│  (apps/client)  │◀────│  (apps/strapi)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
    ┌────▼────┐            ┌─────▼─────┐
    │ Zustand │            │ PostgreSQL │
    │ (client)│            │  + Redis   │
    └─────────┘            └───────────┘
```

**Test Boundary Strategy**:

- **Unit tests**: Components, utilities, stores (fast, isolated)
- **Integration tests**: API layer ↔ Strapi, Strapi ↔ Database
- **E2E tests**: Complete user journeys (login → checkout → ticket)

---

## 3. Architecturally Significant Requirements (ASRs)

### 3.1 Critical ASRs Identified

Based on PRD Non-Functional Requirements (NFR) and Architecture decisions, these are the ASRs requiring specific test strategies:

| ASR ID         | Category    | Requirement                                                     | Test Impact                                | Priority |
| -------------- | ----------- | --------------------------------------------------------------- | ------------------------------------------ | -------- |
| **ASR-SEC-1**  | Security    | Payment data (Konnect) never stored locally; webhooks validated | Payment flow E2E + webhook signature tests | P0       |
| **ASR-SEC-2**  | Security    | JWT tokens expire after 15 minutes; refresh token rotation      | Auth expiry E2E tests                      | P0       |
| **ASR-SEC-3**  | Security    | QR codes signed with HMAC-SHA256; prevent forgery               | QR generation + validation tests           | P0       |
| **ASR-SEC-4**  | Security    | RBAC: Users see own data; Venue managers see own venue only     | Authorization E2E tests per role           | P0       |
| **ASR-PERF-1** | Performance | Homepage loads in <2s (LCP); event detail <1.5s                 | Lighthouse CI + k6 load tests              | P1       |
| **ASR-PERF-2** | Performance | QR scan validation <500ms                                       | API response time tests                    | P1       |
| **ASR-PERF-3** | Performance | Search results via Algolia <300ms                               | Search latency tests                       | P1       |
| **ASR-REL-1**  | Reliability | Offline ticket QR access (IndexedDB)                            | Offline mode E2E tests                     | P1       |
| **ASR-REL-2**  | Reliability | Payment success rate >99.5%                                     | Payment retry logic tests                  | P0       |
| **ASR-REL-3**  | Reliability | Graceful degradation when Strapi API unavailable                | Error boundary + fallback tests            | P1       |
| **ASR-INT-1**  | Integration | Real-time ticket availability (WebSocket)                       | WebSocket connection + event tests         | P2       |
| **ASR-INT-2**  | Integration | i18n: AR/FR/EN with RTL support                                 | Locale switching E2E tests                 | P2       |

### 3.2 ASR Test Coverage Matrix

| ASR                         | Unit Test             | Integration Test             | E2E Test                  | NFR Test (k6/Security) |
| --------------------------- | --------------------- | ---------------------------- | ------------------------- | ---------------------- |
| **ASR-SEC-1** (Payment)     | -                     | Webhook signature validation | Checkout flow E2E         | -                      |
| **ASR-SEC-2** (JWT)         | Token expiry logic    | -                            | Auth expiry + refresh E2E | Security scan          |
| **ASR-SEC-3** (QR)          | HMAC signing function | QR generation API            | Ticket scan E2E           | -                      |
| **ASR-SEC-4** (RBAC)        | -                     | API authorization tests      | Role-based access E2E     | Security audit         |
| **ASR-PERF-1** (Load time)  | -                     | -                            | Lighthouse CI             | k6 homepage load       |
| **ASR-PERF-2** (QR scan)    | -                     | Validation endpoint          | Scanner E2E               | k6 scan endpoint       |
| **ASR-PERF-3** (Search)     | -                     | Algolia mock tests           | Search E2E                | k6 search latency      |
| **ASR-REL-1** (Offline)     | IndexedDB helpers     | -                            | Offline mode E2E          | -                      |
| **ASR-REL-2** (Payment)     | Retry logic           | Konnect webhook mock         | Payment retry E2E         | -                      |
| **ASR-REL-3** (Degradation) | -                     | API failure mock             | Error boundary E2E        | -                      |
| **ASR-INT-1** (WebSocket)   | -                     | Socket.io mock               | Real-time updates E2E     | -                      |
| **ASR-INT-2** (i18n)        | -                     | -                            | Locale E2E + RTL visual   | -                      |

### 3.3 ASR Quality Scenarios (Utility Tree)

**Security Quality Scenarios**:

| Scenario                   | Stimulus                            | Response                            | Measure              |
| -------------------------- | ----------------------------------- | ----------------------------------- | -------------------- |
| Unauthenticated API access | Anonymous request to `/api/tickets` | 401 Unauthorized, redirect to login | Response time <100ms |
| Expired JWT                | API call with expired token         | 401, refresh flow triggered         | No data leakage      |
| QR forgery attempt         | Scan QR with invalid signature      | Reject with "Invalid ticket"        | Validation <500ms    |
| SQL injection              | Malicious input in search           | Input sanitized, no error exposure  | No SQL execution     |

**Performance Quality Scenarios**:

| Scenario      | Stimulus                       | Response                           | Measure                     |
| ------------- | ------------------------------ | ---------------------------------- | --------------------------- |
| Homepage load | User navigates to homepage     | LCP rendered                       | <2 seconds                  |
| Event listing | Browse 50+ events with filters | Smooth scrolling, virtualized list | <1.5s initial, 60fps scroll |
| QR validation | Venue staff scans ticket       | Valid/Invalid result displayed     | <500ms response             |
| Search query  | User types 3+ characters       | Autocomplete results shown         | <300ms Algolia response     |

**Reliability Quality Scenarios**:

| Scenario        | Stimulus                        | Response                                   | Measure                 |
| --------------- | ------------------------------- | ------------------------------------------ | ----------------------- |
| API unavailable | Strapi returns 500              | Cached data + error message shown          | Graceful degradation    |
| Offline mode    | Device loses connectivity       | Cached events + offline tickets accessible | <1s load from IndexedDB |
| Payment failure | Konnect returns transient error | Retry up to 3 times                        | >99.5% eventual success |
| High traffic    | 100 concurrent users            | System remains responsive                  | <2s p95 response time   |

---

## 4. Test Levels Strategy

### 4.1 Test Pyramid Definition

```
                    ┌──────────────┐
                    │     E2E      │  ~15-20% (Critical paths only)
                    │   Playwright │  ~20 tests
                    ├──────────────┤
                    │  Integration │  ~25-30% (API contracts, DB)
                    │ Vitest + API │  ~60 tests
                    ├──────────────┤
                    │    Unit      │  ~50-60% (Components, utils, stores)
                    │    Vitest    │  ~150 tests
                    └──────────────┘
```

**Target Distribution**:

- **Unit Tests (50-60%)**: Fast feedback, pure function logic, component props/events
- **Integration Tests (25-30%)**: API contracts, database operations, service interactions
- **E2E Tests (15-20%)**: Critical user journeys, revenue paths, cross-system validation

### 4.2 Test Level Ownership

| Test Level                   | Primary Location                   | Owner           | CI Stage             |
| ---------------------------- | ---------------------------------- | --------------- | -------------------- |
| **Unit (Client)**            | `apps/client/src/**/*.test.ts`     | Frontend Dev    | Pre-commit + PR      |
| **Unit (Strapi)**            | `apps/strapi/tests/**/*.test.ts`   | Backend Dev     | Pre-commit + PR      |
| **Integration (API)**        | `apps/strapi/tests/integration/**` | Backend Dev     | PR                   |
| **Integration (Client-API)** | `apps/client/tests/integration/**` | Full-stack Dev  | PR                   |
| **E2E**                      | `apps/client/e2e/**/*.spec.ts`     | QA / Full-stack | Post-merge + Nightly |
| **NFR (Performance)**        | `tests/nfr/performance/**`         | Platform / SRE  | Weekly + Pre-release |
| **NFR (Security)**           | `tests/nfr/security/**`            | Security / SRE  | Weekly + Pre-release |

### 4.3 Test Level Tooling

| Level                 | Tool                       | Rationale                                                     |
| --------------------- | -------------------------- | ------------------------------------------------------------- |
| **Unit (Client)**     | **Vitest**                 | Native ESM, fast, excellent React Testing Library integration |
| **Unit (Strapi)**     | **Jest**                   | Already configured, Strapi ecosystem standard                 |
| **Integration (API)** | **Vitest** + Supertest     | API contract testing without full app                         |
| **Component**         | **Storybook** + Chromatic  | Visual regression, component isolation (already configured)   |
| **E2E**               | **Playwright**             | Multi-browser, network interception, auth state persistence   |
| **Performance**       | **k6**                     | Load/stress/spike testing, SLO enforcement                    |
| **Security**          | **OWASP ZAP** + Playwright | Automated security scanning + auth E2E                        |

### 4.4 Test Naming & Organization

**File Naming Convention**:

```
Unit:        {Component}.test.tsx / {service}.test.ts
Integration: {flow}.integration.test.ts
E2E:         {journey}.spec.ts
NFR:         {category}.nfr.spec.ts
```

**Test ID Format**: `{EPIC}.{STORY}-{LEVEL}-{SEQ}`

- Example: `3.2-E2E-001` (Epic 3, Story 2, E2E test 1)

**Directory Structure**:

```
apps/client/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── Button/
│   │           ├── Button.tsx
│   │           ├── Button.test.tsx       # Unit test (co-located)
│   │           └── Button.stories.tsx    # Storybook story
│   └── lib/
│       └── utils/
│           ├── formatDate.ts
│           └── formatDate.test.ts        # Unit test (co-located)
├── tests/
│   └── integration/
│       └── auth-flow.integration.test.ts # Integration tests
└── e2e/
    ├── fixtures/                         # Playwright fixtures
    │   ├── auth.fixture.ts
    │   └── database.fixture.ts
    ├── pages/                            # Page objects
    │   ├── LoginPage.ts
    │   └── CheckoutPage.ts
    └── specs/
        ├── auth/
        │   └── login.spec.ts
        ├── checkout/
        │   └── purchase-ticket.spec.ts
        └── nfr/
            ├── security.nfr.spec.ts
            └── reliability.nfr.spec.ts

apps/strapi/
└── tests/
    ├── factories/                        # Data factories
    │   ├── user.factory.ts
    │   └── event.factory.ts
    ├── helpers/
    │   └── strapi.ts                     # Strapi test setup
    ├── unit/
    │   └── services/
    │       └── ticket.service.test.ts
    └── integration/
        └── api/
            └── events.api.test.ts

tests/                                    # Root-level NFR tests
└── nfr/
    ├── performance/
    │   └── homepage.k6.js                # k6 load tests
    └── security/
        └── owasp-scan.yml                # Security config
```

---

## 5. NFR Testing Approach

### 5.1 Security Testing Strategy

**Security NFRs from PRD**: NFR-S1 to NFR-S10

| Security Test             | Tool             | Approach                                    | Threshold                     |
| ------------------------- | ---------------- | ------------------------------------------- | ----------------------------- |
| **Authentication**        | Playwright       | E2E tests for login, logout, session expiry | 100% pass                     |
| **Authorization (RBAC)**  | Playwright + API | Role-based access per user type             | No unauthorized access        |
| **JWT Token Expiry**      | Playwright       | Token refresh flow, expired token handling  | 15-min expiry enforced        |
| **QR Forgery Prevention** | Unit + E2E       | HMAC-SHA256 signature validation            | Invalid signatures rejected   |
| **Input Sanitization**    | Playwright       | SQL injection, XSS payload tests            | All attacks blocked           |
| **Secret Exposure**       | Playwright       | Password never in console/DOM/network       | 0 password leaks              |
| **Webhook Validation**    | Integration      | Konnect webhook signature verification      | All invalid webhooks rejected |

**Security Test Suite Structure**:

```typescript
// e2e/nfr/security.nfr.spec.ts
test.describe("Security NFR: Authentication & Authorization", () => {
  test("unauthenticated users cannot access protected routes")
  test("JWT tokens expire after 15 minutes")
  test("passwords are never logged or exposed in errors")
  test("RBAC: users can only access resources they own")
  test("SQL injection attempts are blocked")
  test("XSS attempts are sanitized")
})

test.describe("Security NFR: Payment & QR", () => {
  test("Konnect webhook validates signature")
  test("QR codes with invalid HMAC are rejected")
  test("Payment data not stored in localStorage")
})
```

### 5.2 Performance Testing Strategy

**Performance NFRs from PRD**: NFR-P1 to NFR-P9

| Metric                 | Target  | Tool          | Test Type   |
| ---------------------- | ------- | ------------- | ----------- |
| **Homepage LCP**       | <2s     | Lighthouse CI | Synthetic   |
| **Event Detail Load**  | <1.5s   | Lighthouse CI | Synthetic   |
| **API Response (p95)** | <500ms  | k6            | Load test   |
| **Search Response**    | <300ms  | k6            | Load test   |
| **QR Scan Validation** | <500ms  | k6            | Stress test |
| **Concurrent Users**   | 100 VUs | k6            | Load test   |
| **Error Rate**         | <1%     | k6            | Load test   |

**k6 Load Test Configuration**:

```javascript
// tests/nfr/performance/homepage.k6.js
export const options = {
  stages: [
    { duration: "1m", target: 50 }, // Ramp up
    { duration: "3m", target: 50 }, // Sustained load
    { duration: "1m", target: 100 }, // Spike
    { duration: "3m", target: 100 }, // High load
    { duration: "1m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // SLO: 95% <500ms
    errors: ["rate<0.01"], // SLA: <1% error rate
  },
}
```

**Lighthouse CI Configuration**:

```yaml
# lighthouserc.json
{
  "ci":
    {
      "collect":
        {
          "url": ["http://localhost:3000/", "http://localhost:3000/events"],
          "numberOfRuns": 3,
        },
      "assert":
        {
          "assertions":
            {
              "categories:performance": ["error", { "minScore": 0.9 }],
              "largest-contentful-paint":
                ["error", { "maxNumericValue": 2000 }],
              "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
            },
        },
    },
}
```

### 5.3 Reliability Testing Strategy

**Reliability NFRs from PRD**: NFR-R1 to NFR-R8

| Scenario               | Test Approach                                    | Tool                  | Acceptance                              |
| ---------------------- | ------------------------------------------------ | --------------------- | --------------------------------------- |
| **API 500 Error**      | Mock API failure, verify graceful degradation    | Playwright route mock | Error message shown, retry button works |
| **Network Offline**    | `context.setOffline(true)`, verify cached access | Playwright            | Cached events/tickets accessible        |
| **Transient Failures** | Mock 503, verify 3-retry logic                   | Playwright route mock | Success after retries                   |
| **Health Check**       | Verify `/api/health` returns status              | Playwright API        | DB, Redis, services UP                  |
| **Circuit Breaker**    | Mock 5 consecutive failures                      | Playwright route mock | Fallback UI, stop retries               |
| **Rate Limiting**      | Exceed rate limit, verify 429 handling           | Playwright            | "Too many requests" message             |

**Reliability Test Examples**:

```typescript
// e2e/nfr/reliability.nfr.spec.ts
test.describe("Reliability NFR: Error Handling", () => {
  test("app remains functional when API returns 500 error")
  test("API client retries on transient failures (3 attempts)")
  test("app handles network disconnection gracefully")
  test("health check endpoint returns service status")
  test("rate limiting gracefully handles 429 responses")
})

test.describe("Reliability NFR: Offline Mode", () => {
  test("cached events accessible when offline")
  test("purchased tickets (QR) accessible when offline")
  test("watchlist syncs when connectivity restored")
})
```

### 5.4 Maintainability Strategy

**Maintainability Validation (CI-Driven)**:

| Metric                       | Target | Tool              | CI Stage |
| ---------------------------- | ------ | ----------------- | -------- |
| **Test Coverage**            | ≥80%   | Vitest + Istanbul | PR       |
| **Code Duplication**         | <5%    | jscpd             | PR       |
| **Critical Vulnerabilities** | 0      | npm audit         | PR       |
| **High Vulnerabilities**     | 0      | npm audit         | PR       |
| **Type Coverage**            | 100%   | TypeScript strict | PR       |

**CI Pipeline for Maintainability**:

```yaml
# .github/workflows/nfr-maintainability.yml
jobs:
  test-coverage:
    steps:
      - run: yarn test:coverage
      - run: |
          COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "❌ FAIL: Coverage $COVERAGE% below 80%"
            exit 1
          fi

  code-duplication:
    steps:
      - run: npx jscpd src/ --threshold 5

  vulnerability-scan:
    steps:
      - run: npm audit --audit-level=high
```

**Observability Validation (Playwright)**:

```typescript
test.describe("Maintainability NFR: Observability", () => {
  test("critical errors are reported to Sentry")
  test("API response times tracked in Server-Timing headers")
  test("structured logging includes trace IDs")
})
```

### 5.5 NFR Gate Decision Matrix

| NFR Category        | PASS                                              | CONCERNS                               | FAIL                                                 |
| ------------------- | ------------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| **Security**        | All auth/authz tests pass, no vulnerabilities     | 1-2 tests failing with mitigation plan | Critical exposure, password leak, injection succeeds |
| **Performance**     | p95 <500ms, error rate <1%                        | Trending toward limits (p95 >450ms)    | SLO breached (p95 >500ms, error >1%)                 |
| **Reliability**     | Error handling, retries, health checks pass       | Partial coverage, missing telemetry    | No recovery path, crash scenarios                    |
| **Maintainability** | Coverage ≥80%, duplication <5%, 0 vulnerabilities | Coverage 60-79%, duplication 5-10%     | Coverage <60%, duplication >10%, vulnerabilities     |

---

## 6. Testability Concerns & Risks

### 6.1 Critical Concerns

| ID         | Concern                                                    | Impact                                       | Category |
| ---------- | ---------------------------------------------------------- | -------------------------------------------- | -------- |
| **TC-001** | No Playwright E2E framework configured                     | Cannot test critical user journeys           | TECH     |
| **TC-002** | No Vitest unit test framework for client                   | No fast feedback loop for components         | TECH     |
| **TC-003** | Missing data factories for test isolation                  | Flaky tests, parallel execution failures     | TECH     |
| **TC-004** | No health check endpoint (`/api/health`)                   | Cannot validate service status in tests      | OPS      |
| **TC-005** | External service dependencies (Konnect, Algolia, ImageKit) | E2E tests depend on third-party availability | TECH     |
| **TC-006** | No test database isolation                                 | Tests pollute development database           | DATA     |
| **TC-007** | WebSocket/real-time testing gaps                           | events-manager plugin lacks test hooks       | TECH     |
| **TC-008** | Legacy Cypress tests in `/legacy`                          | Maintenance burden, deprecated approach      | TECH     |
| **TC-009** | No performance baseline established                        | Cannot detect regressions                    | PERF     |
| **TC-010** | QR signing logic not unit tested                           | Security-critical code untested              | SEC      |

### 6.2 Risk Register

| Risk ID      | Description                                | Probability | Impact     | Score | Status      |
| ------------ | ------------------------------------------ | ----------- | ---------- | ----- | ----------- |
| **RISK-001** | Payment flow untested → revenue loss       | 3 (High)    | 3 (High)   | **9** | 🚨 CRITICAL |
| **RISK-002** | QR forgery → unauthorized venue access     | 2 (Medium)  | 3 (High)   | **6** | ⚠️ HIGH     |
| **RISK-003** | No E2E for auth → security gaps            | 3 (High)    | 2 (Medium) | **6** | ⚠️ HIGH     |
| **RISK-004** | External service outage → test failures    | 2 (Medium)  | 2 (Medium) | **4** | MEDIUM      |
| **RISK-005** | No offline testing → PWA bugs              | 2 (Medium)  | 2 (Medium) | **4** | MEDIUM      |
| **RISK-006** | Flaky tests (no isolation) → CI unreliable | 3 (High)    | 1 (Low)    | **3** | LOW         |
| **RISK-007** | No i18n/RTL testing → Arabic layout bugs   | 2 (Medium)  | 1 (Low)    | **2** | LOW         |

**Risk Scoring**: Probability (1-3) × Impact (1-3) = Score (1-9)

- **Critical (9)**: Must resolve before Epic 6 (B2C Ticketing)
- **High (6-8)**: Must resolve before production
- **Medium (4-5)**: Resolve during implementation
- **Low (1-3)**: Address opportunistically

### 6.3 Recommended Mitigations

| Risk                    | Mitigation                                                        | Owner    | Deadline            |
| ----------------------- | ----------------------------------------------------------------- | -------- | ------------------- |
| **RISK-001** (Payment)  | Implement checkout E2E with Konnect mock; unit test payment utils | Dev Team | Epic 6 start        |
| **RISK-002** (QR)       | Unit test HMAC signing; E2E scanner validation flow               | Dev Team | Epic 8 start        |
| **RISK-003** (Auth)     | Playwright auth fixtures; login/logout/session E2E suite          | Dev Team | Epic 4 start        |
| **RISK-004** (External) | MSW mocks for Konnect, Algolia, ImageKit                          | Dev Team | Epic 2A             |
| **RISK-005** (Offline)  | Playwright `setOffline()` tests; IndexedDB fixtures               | Dev Team | Epic 10             |
| **RISK-006** (Flaky)    | Data factories; test database; parallel-safe fixtures             | Dev Team | Epic 1 (Foundation) |
| **RISK-007** (i18n)     | Visual regression tests with Chromatic; RTL snapshot              | Dev Team | Epic 1              |

### 6.4 Testability Debt Backlog

| Item                                                       | Effort         | Priority | Epic Dependency |
| ---------------------------------------------------------- | -------------- | -------- | --------------- |
| Configure Playwright in `apps/client`                      | 1 story point  | P0       | Epic 1          |
| Configure Vitest in `apps/client`                          | 1 story point  | P0       | Epic 1          |
| Create data factories (`User`, `Event`, `Ticket`, `Venue`) | 2 story points | P0       | Epic 1          |
| Add `/api/health` endpoint to Strapi                       | 1 story point  | P1       | Epic 2B         |
| Configure test PostgreSQL database                         | 1 story point  | P1       | Epic 2B         |
| Configure MSW for external service mocking                 | 2 story points | P1       | Epic 2A         |
| Add Lighthouse CI to pipeline                              | 1 story point  | P1       | Epic 1          |
| Configure k6 for performance testing                       | 2 story points | P2       | Post-Epic 3     |
| Remove legacy Cypress tests                                | 1 story point  | P3       | Post-MVP        |

---

## 7. Test Infrastructure Recommendations

### 7.1 Framework Selection

| Purpose                 | Recommended Tool      | Rationale                                                                 | Alternative   |
| ----------------------- | --------------------- | ------------------------------------------------------------------------- | ------------- |
| **Unit Tests (Client)** | Vitest                | Native ESM, fast, React Testing Library integration, Vite compatibility   | Jest          |
| **Unit Tests (Strapi)** | Jest                  | Already configured, Strapi ecosystem standard                             | -             |
| **Component Tests**     | Storybook + Chromatic | Already configured, visual regression, design system validation           | Playwright CT |
| **Integration Tests**   | Vitest + MSW          | Mock external services, test API contracts                                | Supertest     |
| **E2E Tests**           | Playwright            | Multi-browser, network interception, auth persistence, parallel execution | Cypress       |
| **Performance Tests**   | k6                    | Load/stress/spike testing, SLO enforcement, CI-friendly                   | Artillery     |
| **Security Scans**      | OWASP ZAP             | Automated vulnerability scanning, CI integration                          | Burp Suite    |
| **Coverage**            | Istanbul (c8)         | Vitest native, JSON/HTML reports                                          | NYC           |

### 7.2 Environment Strategy

**Test Environment Matrix**:

| Environment           | Database             | Redis           | External Services | Use Case                |
| --------------------- | -------------------- | --------------- | ----------------- | ----------------------- |
| **Local Unit**        | N/A                  | N/A             | Mocked (MSW)      | Developer feedback loop |
| **Local Integration** | PostgreSQL (Docker)  | Redis (Docker)  | Mocked (MSW)      | Service integration     |
| **CI Unit**           | N/A                  | N/A             | Mocked (MSW)      | PR validation           |
| **CI Integration**    | PostgreSQL (service) | Redis (service) | Mocked (MSW)      | PR validation           |
| **CI E2E**            | PostgreSQL (service) | Redis (service) | Mocked (MSW)      | Post-merge validation   |
| **Staging E2E**       | Staging DB           | Staging Redis   | Sandbox APIs      | Pre-release validation  |

**Docker Compose for Test Environment**:

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: tiween_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432" # Different port to avoid conflicts

  redis-test:
    image: redis:7
    ports:
      - "6380:6379" # Different port to avoid conflicts
```

**Environment Variables**:

```bash
# .env.test
DATABASE_URL=postgres://test:test@localhost:5433/tiween_test
REDIS_URL=redis://localhost:6380
NEXTAUTH_SECRET=test-secret-do-not-use-in-production
STRAPI_API_KEY=test-api-key
```

### 7.3 CI/CD Integration

**Enhanced CI Pipeline**:

```yaml
# .github/workflows/ci.yml (enhanced)
name: CI

on: [push, pull_request]

jobs:
  lint:
    # ... existing lint job

  type-check:
    # ... existing type-check job

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: yarn test:unit
      - uses: codecov/codecov-action@v4
        with:
          files: coverage/coverage-final.json
          fail_ci_if_error: true

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tiween_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: yarn test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/tiween_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: tiween_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: yarn playwright install --with-deps
      - run: yarn build
      - run: yarn test:e2e
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/tiween_test
          REDIS_URL: redis://localhost:6379
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: yarn install --frozen-lockfile
      - run: yarn build
      - run: yarn start &
      - run: npx @lhci/cli@0.13.x autorun

  build:
    name: Build
    needs: [lint, type-check, unit-tests, integration-tests]
    # ... existing build job

  # Weekly NFR tests (scheduled)
  nfr-performance:
    name: Performance Tests (Weekly)
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/nfr/performance/load-test.k6.js
```

### 7.4 Package.json Scripts

```json
{
  "scripts": {
    "test": "turbo test",
    "test:unit": "turbo test:unit",
    "test:integration": "turbo test:integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

**Client package.json**:

```json
{
  "scripts": {
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 7.5 Recommended Package Additions

```bash
# Client test dependencies
yarn workspace @tiween/client add -D \
  vitest \
  @vitest/coverage-v8 \
  @testing-library/react \
  @testing-library/user-event \
  @playwright/test \
  msw \
  @faker-js/faker

# Strapi test dependencies
yarn workspace @tiween/strapi add -D \
  supertest \
  @faker-js/faker

# Root-level NFR dependencies
yarn add -D -W \
  @lhci/cli \
  k6
```

---

## 8. Next Steps

### 8.1 Immediate Actions (Epic 1 - Foundation)

| Action                                                     | Owner | Effort | Priority |
| ---------------------------------------------------------- | ----- | ------ | -------- |
| Install and configure Vitest in `apps/client`              | Dev   | 2h     | P0       |
| Install and configure Playwright in `apps/client`          | Dev   | 2h     | P0       |
| Create data factories (`User`, `Event`, `Ticket`, `Venue`) | Dev   | 4h     | P0       |
| Create Playwright auth fixture (`storageState`)            | Dev   | 2h     | P0       |
| Add MSW handlers for external services                     | Dev   | 4h     | P1       |
| Update CI pipeline with unit/integration test jobs         | Dev   | 2h     | P1       |

### 8.2 Epic-Level Test Planning Triggers

After completing foundation test infrastructure, run **Epic-Level Test Design** (`test-design-epic-{n}`) for each epic to generate:

- Story-specific test plans
- Acceptance criteria to test mapping
- Risk-based test prioritization

| Epic                       | Test Design Trigger      | Key Test Focus                                   |
| -------------------------- | ------------------------ | ------------------------------------------------ |
| Epic 2A (Components)       | Before story development | Component unit tests, Storybook coverage         |
| Epic 2B (Strapi Migration) | Before story development | API integration tests, data migration validation |
| Epic 3 (Event Discovery)   | Before story development | E2E browse/filter/search journeys                |
| Epic 4 (Auth)              | Before story development | Security E2E, session management                 |
| Epic 6 (Ticketing)         | Before story development | Payment E2E (critical path), QR generation       |
| Epic 8 (Scanner)           | Before story development | QR validation E2E, offline scanning              |

### 8.3 NFR Test Milestones

| Milestone             | When                           | Tests Required                                      |
| --------------------- | ------------------------------ | --------------------------------------------------- |
| **Post-Epic 3**       | After event discovery complete | Lighthouse CI baselines, k6 homepage load           |
| **Pre-Epic 6 Launch** | Before ticketing goes live     | Security E2E suite, payment flow E2E                |
| **Pre-MVP**           | Before public launch           | Full NFR suite (security, performance, reliability) |
| **Post-Launch**       | Weekly schedule                | k6 performance regression, security scans           |

### 8.4 Success Metrics

| Metric                       | Target                | Measurement                 |
| ---------------------------- | --------------------- | --------------------------- |
| **Test Coverage**            | ≥80%                  | Vitest + Istanbul           |
| **E2E Test Count**           | ~20 critical journeys | Playwright test count       |
| **CI Pass Rate**             | ≥99%                  | GitHub Actions success rate |
| **Flaky Test Rate**          | <1%                   | Test retry analysis         |
| **Performance (p95)**        | <500ms                | k6 reports                  |
| **Security Vulnerabilities** | 0 critical/high       | npm audit + OWASP ZAP       |

---

## Appendix A: Critical User Journeys for E2E Testing

| Journey ID  | Description                                                | Epic   | Priority |
| ----------- | ---------------------------------------------------------- | ------ | -------- |
| **CUJ-001** | Anonymous user browses events and filters by date/category | Epic 3 | P0       |
| **CUJ-002** | User registers with email/password                         | Epic 4 | P0       |
| **CUJ-003** | User logs in with social provider (Google)                 | Epic 4 | P0       |
| **CUJ-004** | User adds event to watchlist                               | Epic 5 | P1       |
| **CUJ-005** | User purchases ticket with Konnect                         | Epic 6 | P0       |
| **CUJ-006** | User views purchased ticket QR offline                     | Epic 6 | P0       |
| **CUJ-007** | Venue staff scans ticket QR                                | Epic 8 | P0       |
| **CUJ-008** | Venue manager creates event via Strapi Admin               | Epic 7 | P1       |
| **CUJ-009** | User searches events via Algolia                           | Epic 3 | P1       |
| **CUJ-010** | User switches locale (AR/FR/EN)                            | Epic 1 | P2       |

---

## Appendix B: Test Framework Configuration Files

### Vitest Configuration (`apps/client/vitest.config.ts`)

```typescript
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "tests/", "**/*.d.ts"],
      thresholds: {
        global: { lines: 80, functions: 80, branches: 80 },
      },
    },
  },
})
```

### Playwright Configuration (`apps/client/playwright.config.ts`)

```typescript
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile", use: { ...devices["iPhone 12"] } },
  ],
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

---

**Document Status**: Complete
**Last Updated**: 2025-12-30
**Next Review**: After Epic 1 completion
