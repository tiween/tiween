# Non-Functional Requirements

## Performance

| Requirement | Target | Measurement Context |
|-------------|--------|---------------------|
| **NFR-P1:** Page load time | <3 seconds | Mobile 4G connection |
| **NFR-P2:** Largest Contentful Paint (LCP) | <2.5 seconds | Mobile 4G |
| **NFR-P3:** First Input Delay (FID) | <100ms | All devices |
| **NFR-P4:** Cumulative Layout Shift (CLS) | <0.1 | All devices |
| **NFR-P5:** Time to Interactive (TTI) | <3.5 seconds | Mobile 4G |
| **NFR-P6:** Offline content load | <1 second | Cached content |
| **NFR-P7:** Ticket purchase flow completion | <60 seconds | End-to-end from selection to confirmation |
| **NFR-P8:** QR code scan validation | <500ms | Real-time response |
| **NFR-P9:** Search results display | <1 second | With filters applied |

## Security

| Requirement | Specification |
|-------------|---------------|
| **NFR-S1:** All data transmission encrypted via HTTPS/TLS 1.3 |
| **NFR-S2:** User passwords hashed with bcrypt (minimum cost factor 12) |
| **NFR-S3:** Payment data never stored on Tiween servers (PCI-DSS compliance via payment provider) |
| **NFR-S4:** Session tokens expire after 30 days of inactivity |
| **NFR-S5:** Venue manager access restricted to their own venue data |
| **NFR-S6:** Admin actions logged with user ID and timestamp |
| **NFR-S7:** QR codes cryptographically signed to prevent forgery |
| **NFR-S8:** Rate limiting on authentication endpoints (max 10 attempts per minute) |
| **NFR-S9:** CORS configured to allow only approved domains |
| **NFR-S10:** SQL injection and XSS prevention via parameterized queries and output encoding |

## Scalability

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR-SC1:** Support 5,000 concurrent users | Phase 1 (Months 1-6) |
| **NFR-SC2:** Support 20,000 concurrent users | Phase 2 (Months 6-12) |
| **NFR-SC3:** Handle 10x traffic spikes | Major event announcements |
| **NFR-SC4:** Database supports 100,000 events | 2-year content growth |
| **NFR-SC5:** Image CDN handles 1M requests/day | Peak traffic scenario |
| **NFR-SC6:** WebSocket connections scale to 5,000 simultaneous | Real-time ticket updates |

## Reliability & Availability

| Requirement | Target | Context |
|-------------|--------|---------|
| **NFR-R1:** Platform uptime | >99.5% | Monthly measurement |
| **NFR-R2:** Payment processing success rate | >98% | Excluding user errors |
| **NFR-R3:** Offline sync success rate | >95% | When connectivity restored |
| **NFR-R4:** Data freshness | >90% listings updated within 48 hours |
| **NFR-R5:** Automated backup frequency | Daily | With 30-day retention |
| **NFR-R6:** Recovery Time Objective (RTO) | <4 hours | Critical system failure |
| **NFR-R7:** Recovery Point Objective (RPO) | <1 hour | Maximum data loss |
| **NFR-R8:** Graceful degradation | Core browsing works when payments unavailable |

## Accessibility

| Requirement | Specification |
|-------------|---------------|
| **NFR-A1:** WCAG 2.1 Level AA compliance across all public pages |
| **NFR-A2:** Keyboard navigation for all interactive elements |
| **NFR-A3:** Screen reader compatibility with proper ARIA labels |
| **NFR-A4:** Color contrast ratio minimum 4.5:1 for text |
| **NFR-A5:** Focus indicators visible on all interactive elements |
| **NFR-A6:** Alt text for all meaningful images |
| **NFR-A7:** Form error messages programmatically associated with inputs |
| **NFR-A8:** No content that flashes more than 3 times per second |
| **NFR-A9:** Touch targets minimum 44x44 pixels on mobile |

## Internationalization

| Requirement | Specification |
|-------------|---------------|
| **NFR-I1:** Full RTL layout support for Arabic language |
| **NFR-I2:** Language switching without page reload |
| **NFR-I3:** Date/time formatting per locale (Arabic, French, English) |
| **NFR-I4:** Currency display in Tunisian Dinar (TND) |
| **NFR-I5:** Content fallback to French when translation unavailable |
| **NFR-I6:** URL structure supports language prefixes (/ar/, /fr/, /en/) |

## Integration

| Requirement | Specification |
|-------------|---------------|
| **NFR-IN1:** Payment gateway integration with <5 second timeout |
| **NFR-IN2:** Strapi API responses cached with 5-minute TTL |
| **NFR-IN3:** Email delivery within 2 minutes of transaction |
| **NFR-IN4:** Social login OAuth flow completes in <10 seconds |
| **NFR-IN5:** WebSocket reconnection within 5 seconds after disconnect |
| **NFR-IN6:** API versioning supports backward compatibility for 6 months |

## Data & Privacy

| Requirement | Specification |
|-------------|---------------|
| **NFR-D1:** User data exportable on request (GDPR-style compliance) |
| **NFR-D2:** Account deletion removes personal data within 30 days |
| **NFR-D3:** Analytics data anonymized after 90 days |
| **NFR-D4:** Cookie consent required before non-essential tracking |
| **NFR-D5:** Venue analytics show aggregated demographics (no individual user data) |
