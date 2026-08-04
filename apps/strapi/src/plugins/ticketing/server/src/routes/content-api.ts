export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/tickets/validate/:ticketNumber",
      handler: "ticket.validate",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/orders/:orderNumber",
      handler: "order.findByOrderNumber",
      config: {
        policies: [],
      },
    },
    {
      // Checkout: create order + init Konnect payment (Story 6.3). Guest-capable
      // — userId is derived server-side from the JWT, not the body.
      method: "POST",
      path: "/orders",
      handler: "order.create",
      config: {
        policies: [],
      },
    },
    {
      // The caller's own tickets (Story 6.4). JWT-self-scoped by the HANDLER:
      // it reads `ctx.state.user` and returns 401 `UNAUTHORIZED` (with no data)
      // when there is none, and the service filters by that id only.
      //
      // Deliberately NO `is-ticket-owner` policy: a policy rejects before the
      // handler runs, so Strapi's generic 403 ForbiddenError would win and the
      // spec'd 401 `UNAUTHORIZED` response could never reach the wire. The
      // handler check IS the gate here, and it is unit-tested.
      method: "GET",
      path: "/my-tickets",
      handler: "order.myTickets",
      config: {
        policies: [],
      },
    },
    {
      // One order's tickets for a guest holding the order access token
      // (Story 6.4). Public route — authorization is the token (or the owner's
      // JWT), enforced in the service.
      method: "GET",
      path: "/order-tickets/:orderNumber",
      handler: "order.orderTickets",
      config: {
        policies: [],
      },
    },
    {
      // Client-triggered idempotent reconciliation (Story 6.3).
      method: "POST",
      path: "/orders/:orderNumber/confirm",
      handler: "order.confirm",
      config: {
        policies: [],
      },
    },
  ],
}
