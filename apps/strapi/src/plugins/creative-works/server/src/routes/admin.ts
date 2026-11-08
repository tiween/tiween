export default {
  type: "admin",
  routes: [
    // ----------------------------------------------------------------
    // The Works edit page's read (plan 01-15, gap G-01-1).
    //
    // WHY NOT the content-manager single-document GET: it builds its populate
    // with `populateDeep(Infinity).countRelations()` and ignores the `populate`
    // query parameter, so every relation (genres, credit persons and roles,
    // cast persons and characters, the premiere venue) arrives as
    // `{ count: n }`. The form cannot edit, and would save back, a relation it
    // only has a count of. This route resolves them and answers the
    // content-manager's own `{ data, meta }` envelope.
    //
    // WHY THE `/admin/works` PREFIX rather than a bare `/works`: `@strapi/core`
    // mounts BOTH routers of a plugin under the same `/<pluginName>` prefix, so
    // an admin route at a bare path would collide with a content-api route of
    // the same path and the first registered would win. The extra segment keeps
    // the two namespaces disjoint (same reason as the venues admin routes).
    //
    // `admin::hasPermissions` is the RBAC grant check on the content-manager
    // read action for this content type; the controller then applies the
    // permission checker (conditions, field sanitization) like the
    // content-manager does.
    // ----------------------------------------------------------------
    {
      method: "GET",
      path: "/admin/works/:documentId",
      handler: "work-editor.findOne",
      config: {
        policies: [
          {
            name: "admin::hasPermissions",
            config: {
              actions: [
                {
                  action: "plugin::content-manager.explorer.read",
                  subject: "plugin::creative-works.creative-work",
                },
              ],
            },
          },
        ],
      },
    },
  ],
}
