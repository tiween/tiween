export default {
  type: "admin",
  routes: [
    {
      method: "POST",
      path: "/tickets/:ticketId/scan",
      handler: "ticket.scan",
      config: {
        policies: ["admin::isAuthenticatedAdmin"],
      },
    },
  ],
}
