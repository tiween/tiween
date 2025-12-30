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
    {
      method: "GET",
      path: "/health/redis",
      handler: "health.redis",
      config: {
        auth: false,
        description: "Check Redis connectivity",
      },
    },
  ],
}
