# User Journeys

## Journey 1: Yasmine Santos - Finding Her Friday Night

Yasmine is scrolling through Instagram on her lunch break when she sees a friend's story about a new Tunisian film. "I should see that," she thinks, but by the time she gets home, she's forgotten the title. This happens every week - interesting events slip through her fingers because there's no central place to track them.

One evening, frustrated after missing yet another concert she only heard about the day after, Yasmine searches "cinema Tunis" and discovers Tiween. She installs the PWA on her phone and is immediately impressed - she can see everything playing this weekend across all venues in Greater Tunis, not just one cinema at a time.

She spots the film her friend mentioned, taps it, sees it's playing at Cinéma Le Colisée at 8pm Friday. She adds it to her watchlist with one tap. Thursday evening, she opens Tiween, sees her saved film, selects 2 seats, pays with her card, and receives a QR code ticket - all in under 60 seconds.

Friday night, she shows her phone at the door, the QR scans green, and she's in. Walking out after the film, she thinks: "I'll never go back to checking Facebook pages." She tells three friends about Tiween that weekend.

**This journey reveals requirements for:**

- Event discovery with multi-venue view
- Search and filtering (by date, location, genre)
- Watchlist functionality (save for later)
- Seamless ticketing flow (select → pay → receive QR)
- PWA installation and offline watchlist access

---

## Journey 2: Karim's Regional Connection

Karim is in his university dorm in Sfax, watching a trailer for a film that premiered in Tunis last week. He sighs - by the time films reach Sfax (if they ever do), everyone's already talking about them online. He feels disconnected from Tunisia's cultural scene, stuck in a city where "nothing happens."

A classmate mentions Tiween, saying it shows what's playing everywhere in Tunisia. Skeptical, Karim downloads it. To his surprise, he sees that Sfax's cinema actually has 4 films showing this week - he had no idea. He also discovers a jazz concert happening at a local cultural center next Saturday.

But what excites him most is the ability to browse Tunis listings and build a watchlist. When he visits his cousin in Tunis next month, he already has 3 events saved. He checks Tiween on the bus (offline mode works on his spotty 4G), confirms showtimes, and feels - for the first time - like he's part of Tunisia's cultural conversation.

He starts checking Tiween every Sunday to plan his week, even when most events are in Tunis. The watchlist becomes his "someday" list, and the Sfax listings become his "this week" list.

**This journey reveals requirements for:**

- Regional filtering (show events by city/region)
- Offline access (cached listings, watchlist)
- Cross-region browsing (see Tunis from Sfax)
- Low-bandwidth optimization (works on 4G)
- Event notifications (new events in your region)

---

## Journey 3: Mounir's Digital Transformation

Mounir has managed Théâtre de l'Étoile for 15 years. Every Tuesday, he photographs next week's schedule, posts it to Facebook, and hopes people see it. He has no idea if his 2,000 followers actually attend - he just sees the same faces at the door buying tickets with cash.

When a friend mentions that a competitor is using "some platform called Tiween," Mounir investigates. He registers his venue, uploads photos, and enters his schedule for the first time in a structured format. It takes 30 minutes - longer than his Facebook post - but he notices the preview looks professional.

The next week, something changes. He logs into the Tiween dashboard and sees: 847 people viewed his upcoming play. He's never had this number before. Facebook shows 200 likes, but he never knew if those translated to attendance. Now he knows.

His first online ticket sale comes the following weekend - a woman who found him through Tiween's "Theater this weekend" filter. Then another. By month's end, 30% of his tickets are sold online. He can see that most buyers are 25-34 year-olds from La Marsa and Carthage - demographics he's never reached before.

When he realizes his commission rate (7%) is half what Eazytick charges, and he's getting analytics he never had, Mounir becomes Tiween's biggest advocate among his venue manager friends.

**This journey reveals requirements for:**

- Venue self-registration and profile setup
- Schedule management (add/edit events)
- Analytics dashboard (views, demographics, conversions)
- Ticketing integration (inventory, sales, commission tracking)
- Professional venue presentation (photos, info, location)

---

## Journey 4: Salma's Institutional Upgrade

Salma runs programming at Cité de la Culture, one of Tunisia's largest cultural venues. She manages 5 different spaces, dozens of events per month, and a team of 3 who spend most of their time updating the website, posting to social media, and manually reconciling ticket sales from 3 different systems.

When the Ministry asks for quarterly impact reports, Salma's team spends days compiling data from spreadsheets. She knows they're leaving money on the table - their ticketing is inefficient, their reach is limited to existing followers, and they can't prove their cultural impact with real data.

She hears about Tiween at a cultural sector meeting. Skeptical that a startup can serve an institution her size, she arranges a pilot for one of their smaller spaces. The onboarding takes a full day - entering all events, configuring ticket types, training staff on the QR scanner.

The results surprise her. Within a month, she has a dashboard showing exactly who attends each event - age distribution, geographic spread, return visitors. The data export feature lets her generate ministry reports in minutes instead of days. When the Ministry praises her "sophisticated audience analytics," she doesn't mention it took one integration to achieve.

Six months later, Cité de la Culture runs all ticketing through Tiween. Salma's team spends 60% less time on administration and the data has helped her program events that actually fill seats.

**This journey reveals requirements for:**

- Multi-space/multi-event management
- Bulk event creation and scheduling
- Advanced analytics and reporting
- Data export for institutional reporting
- Ticket type configuration (standard, reduced, VIP)
- Staff training and scanner deployment

---

## Journey 5: The Anonymous Explorer

Ahmed opens Tiween for the first time after seeing an ad. He's not sure he wants to create an account - he just wants to see what's playing tonight. Without logging in, he can browse all events, see details, and filter by "Tonight" and "Near me" (using his location).

He finds a stand-up comedy show starting in 2 hours. When he taps "Buy Tickets," he's prompted to create an account or continue as guest. He chooses guest checkout, enters his email, pays, and receives his QR ticket - all without creating a password.

Three weeks later, Ahmed returns to Tiween. This time, the prompt says "Welcome back - create an account to save your watchlist?" He's attended 2 events by now and decides it's worth it. His purchase history is automatically linked to his new account.

**This journey reveals requirements for:**

- Anonymous browsing (no login required to discover)
- Guest checkout (buy without account)
- Account creation upsell (at natural moments)
- Email-based ticket delivery (works without app)
- Purchase history linking on account creation
- Geolocation for "near me" filtering

---

## Journey 6: Nadia the Tiween Admin

Nadia works part-time for Tiween, managing data quality and partner support. Every morning, she opens the admin dashboard and sees the overnight activity: 3 new venue registration requests, 12 events auto-flagged for missing information, and 2 support tickets from venue managers.

She reviews the venue registrations first - checking that they're legitimate cultural venues, not spam. Two are real theaters; one is a rejected request from someone trying to list a private party. She approves the legitimate ones and sends welcome emails with onboarding guides.

Next, she tackles the flagged events. A cinema uploaded their schedule but forgot to add showtimes for Saturday. She emails the venue manager directly, and also manually adds the missing data from their Facebook page to avoid gaps for users. Another event has a suspicious price (5,000 TND for a theater ticket) - she confirms it's a typo and corrects it to 50 TND.

The support tickets are from a venue manager who can't figure out how to add a second price tier, and another whose QR scanner app isn't working. Nadia resolves the first with a quick screen-share call and escalates the second to the tech team.

By noon, she shifts to proactive data enrichment - checking Facebook pages of non-partner venues and entering their schedules manually to ensure Tiween has comprehensive listings even before formal partnerships.

**This journey reveals requirements for:**

- Admin dashboard (separate from venue dashboard)
- Venue approval workflow
- Event flagging and quality checks
- Manual data entry interface
- Support ticket system
- Partner communication tools
- Activity logging and audit trail

---

## Journey 7: Rami the Ticket Scanner

Rami works the door at Cinéma Le Rio on Friday nights. Before Tiween, he'd check paper tickets, sometimes dealing with people who "forgot" their tickets or claimed they paid at the door when they didn't. It was chaotic, and he had no way to verify anything quickly.

Now, he opens the Tiween Scanner app on his phone (the cinema's dedicated device). The screen shows tonight's showtimes and how many tickets are sold vs. scanned for each.

A couple approaches with their phones out. Rami scans the first QR code - green checkmark, "Valid: 2 tickets, 8:00pm showing." He scans the second - red X, "Already scanned at 19:47." The man protests, but Rami shows him the screen. Turns out his friend had screenshot the same QR and tried to reuse it. Issue resolved in seconds.

Throughout the evening, Rami scans about 200 tickets. The app tracks everything automatically. When his manager asks how the 8pm show did, Rami can tell him instantly: 187 of 200 tickets scanned, 13 no-shows.

**This journey reveals requirements for:**

- Dedicated scanner app/mode
- Real-time validation against ticket database
- Duplicate/reuse detection
- Offline scanning capability (sync when connected)
- Per-showtime attendance tracking
- No-show reporting
- Simple UI for high-throughput scanning

---

## Journey Requirements Summary

| Journey   | User Type         | Key Capabilities Required                                   |
| --------- | ----------------- | ----------------------------------------------------------- |
| Yasmine   | B2C Consumer      | Discovery, watchlist, ticketing, PWA                        |
| Karim     | B2C Regional      | Regional filtering, offline mode, cross-region browsing     |
| Mounir    | B2B Venue Manager | Venue dashboard, schedule management, analytics, ticketing  |
| Salma     | B2B Institution   | Multi-space management, bulk operations, advanced reporting |
| Anonymous | B2C Guest         | Guest browsing, guest checkout, account upsell              |
| Nadia     | Platform Admin    | Admin dashboard, moderation, data quality, support          |
| Rami      | Venue Staff       | Scanner app, validation, attendance tracking                |

---
