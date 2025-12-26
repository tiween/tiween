# Epic 8: B2B Ticket Validation (Scanner)

Venue staff can scan and validate tickets at event entry, track attendance, and operate with intermittent connectivity.

## Story 8.1: QR Code Scanning Interface

As **venue staff**,
I want to scan ticket QR codes at the door,
So that I can validate entry quickly.

**Acceptance Criteria:**

**Given** I am logged in as venue staff
**When** I open the scanner on my mobile device
**Then** I see the camera viewfinder
**And** I can select the current event/showtime
**And** the scanner detects QR codes automatically
**And** scan processing takes less than 500ms (NFR-P8)
**And** I have a flash toggle for dark venues
**And** manual entry option is available for damaged QR codes

---

## Story 8.2: Validation Result Display

As **venue staff**,
I want to see clear validation results,
So that I know whether to admit the ticket holder.

**Acceptance Criteria:**

**Given** I have scanned a QR code
**When** validation completes
**Then** I see a large, clear result:
- ✓ Green: "Valide" - admit entry
- ✕ Red: "Déjà scanné" - deny entry (shows when it was scanned)
- ✕ Red: "Non trouvé" - invalid ticket
- ⚠ Yellow: "Mauvais événement" - ticket is for different event/showtime
**And** result auto-dismisses after 2 seconds
**And** audio beep accompanies visual (success/failure tones)
**And** high contrast colors visible in dark venues

---

## Story 8.3: Ticket Details Display

As **venue staff**,
I want to see ticket details on successful scan,
So that I can verify the ticket holder if needed.

**Acceptance Criteria:**

**Given** a ticket scans as valid
**When** the result is displayed
**Then** I see: event name, showtime, ticket type, quantity
**And** I see seat information if applicable
**And** I see the purchaser name (if available)
**And** details are displayed clearly and briefly
**And** I can dismiss to scan the next ticket

---

## Story 8.4: Duplicate Scan Prevention

As **venue staff**,
I want the system to prevent duplicate entry,
So that tickets cannot be reused.

**Acceptance Criteria:**

**Given** a ticket has already been scanned
**When** someone tries to scan it again
**Then** the scan shows "Déjà scanné à [time]"
**And** the original scan time is displayed
**And** the ticket is clearly marked as already used
**And** I can see who scanned it originally (if logged)
**And** manual override option requires manager PIN

---

## Story 8.5: Real-Time Attendance Counts

As **venue staff**,
I want to see attendance counts in real-time,
So that I know how full the venue is.

**Acceptance Criteria:**

**Given** I am using the scanner
**When** I view the attendance counter
**Then** I see: [scanned] / [total sold]
**And** I see the percentage filled
**And** count updates immediately after each scan
**And** I can see no-show count (sold but not scanned after event start)
**And** counts are visible at a glance while scanning

---

## Story 8.6: Offline Scanning Capability

As **venue staff**,
I want to scan tickets when offline,
So that entry isn't blocked by connectivity issues.

**Acceptance Criteria:**

**Given** internet connection is unavailable
**When** I scan a ticket
**Then** validation uses cached ticket data from last sync
**And** scans are stored locally
**And** "Offline mode" indicator is displayed
**And** when connectivity returns, scans sync to server
**And** any conflicts (e.g., duplicate scans) are resolved
**And** sync success rate exceeds 95% (NFR-R3)

---
