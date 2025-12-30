import { Main } from "@strapi/design-system"
import { Layouts } from "@strapi/strapi/admin"

const HomePage = () => {
  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Events Manager"
          subtitle="Streamlined event management for venue managers"
        />
        <Layouts.Content>
          <div style={{ padding: "24px" }}>
            <h2>Welcome to Events Manager</h2>
            <p>
              This plugin provides tools for managing events, showtimes, and
              ticket inventory.
            </p>
            <h3>Features</h3>
            <ul>
              <li>Bulk showtime creation</li>
              <li>Event duplication</li>
              <li>Ticket inventory management</li>
              <li>Event statistics</li>
            </ul>
            <h3>API Endpoints</h3>
            <ul>
              <li>
                <code>POST /events-manager/bulk-showtimes</code> - Create
                multiple showtimes
              </li>
              <li>
                <code>POST /events-manager/duplicate-event</code> - Duplicate an
                event
              </li>
              <li>
                <code>PUT /events-manager/ticket-inventory</code> - Update
                ticket counts
              </li>
              <li>
                <code>GET /events-manager/event-stats/:eventId</code> - Get
                event statistics
              </li>
            </ul>
          </div>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { HomePage }
