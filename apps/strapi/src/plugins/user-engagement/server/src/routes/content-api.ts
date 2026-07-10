export default {
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/watchlist",
      handler: "watchlist.list",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "POST",
      path: "/watchlist",
      handler: "watchlist.add",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "POST",
      path: "/watchlist/toggle",
      handler: "watchlist.toggle",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "DELETE",
      path: "/watchlist/:creativeWorkId",
      handler: "watchlist.remove",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "GET",
      path: "/watchlist/check/:creativeWorkId",
      handler: "watchlist.check",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    // Schedule-change notifications (Story 5.6). All JWT-self-scoped.
    {
      method: "GET",
      path: "/notifications",
      handler: "notification.list",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "GET",
      path: "/notifications/unread-count",
      handler: "notification.unreadCount",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
    {
      method: "PUT",
      path: "/notifications/read-all",
      handler: "notification.markAllRead",
      config: {
        policies: ["plugin::user-engagement.is-owner"],
      },
    },
  ],
}
