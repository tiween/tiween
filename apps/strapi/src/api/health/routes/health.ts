export default {
  routes: [
    {
      method: "GET",
      path: "/health",
      handler: "health.check",
      config: {
        auth: false,
        description: "Check overall system health",
      },
    },
  ],
}
