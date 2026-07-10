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
