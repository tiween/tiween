export default {
  type: "content-api",
  routes: [
    {
      // Public, unauthenticated notification endpoint hit by Konnect servers:
      // POST /api/payments/konnect/webhook?payment_ref=…
      method: "POST",
      path: "/konnect/webhook",
      handler: "webhook.handle",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}
