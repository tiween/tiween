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
  ],
}
