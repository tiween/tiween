module.exports = {
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/settings",
      handler: "settings.get",
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: "POST",
      path: "/settings",
      handler: "settings.set",
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
}
