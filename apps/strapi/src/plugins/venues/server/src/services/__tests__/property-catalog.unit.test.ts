/**
 * `property-catalog` service (Story 7.2) — the amenity vocabulary the profile
 * form renders one control per entry of.
 *
 * Pinned: the sort contract (categories AND their definitions), the whitelist
 * (no numeric ids), and the "no definitions → not rendered" rule that keeps the
 * seeded grouping parents ("Facilities") out of the editor.
 */
import propertyCatalogService from "../property-catalog"

const PROPERTY_CATEGORY_UID = "plugin::venues.property-category"

function buildStrapi(rows: unknown) {
  const api = { findMany: jest.fn(async () => rows) }
  const strapi: any = {
    documents: jest.fn(() => api),
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  }
  return { strapi, api }
}

const CATEGORY = {
  id: 1,
  documentId: "cat-1",
  name: "Accessibility",
  slug: "accessibility",
  icon: "accessibility",
  sortOrder: 1,
  parent: null,
  properties: [
    {
      id: 11,
      documentId: "def-2",
      name: "Hearing Loop",
      slug: "hearing-loop",
      type: "boolean",
      sortOrder: 2,
    },
    {
      id: 10,
      documentId: "def-1",
      name: "Wheelchair Accessible",
      slug: "wheelchair-accessible",
      type: "boolean",
      description: "Venue has wheelchair access",
      icon: "wheelchair",
      sortOrder: 1,
    },
  ],
}

describe("property-catalog.listPropertyCatalog (unit)", () => {
  it("reads categories sortOrder-ascending with their definitions populated", async () => {
    const { strapi, api } = buildStrapi([CATEGORY])
    const service = propertyCatalogService({ strapi })

    await service.listPropertyCatalog("fr")

    expect(strapi.documents).toHaveBeenCalledWith(PROPERTY_CATEGORY_UID)
    expect(api.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fr",
        sort: [{ sortOrder: "asc" }, { name: "asc" }],
        populate: { properties: true, parent: true },
      })
    )
  })

  it("projects the whitelist and sorts definitions by their own sortOrder", async () => {
    const { strapi } = buildStrapi([CATEGORY])
    const service = propertyCatalogService({ strapi })

    const catalog = await service.listPropertyCatalog()

    expect(catalog).toEqual([
      {
        documentId: "cat-1",
        name: "Accessibility",
        slug: "accessibility",
        icon: "accessibility",
        sortOrder: 1,
        parent: null,
        definitions: [
          {
            documentId: "def-1",
            name: "Wheelchair Accessible",
            slug: "wheelchair-accessible",
            type: "boolean",
            description: "Venue has wheelchair access",
            icon: "wheelchair",
            sortOrder: 1,
          },
          {
            documentId: "def-2",
            name: "Hearing Loop",
            slug: "hearing-loop",
            type: "boolean",
            sortOrder: 2,
          },
        ],
      },
    ])
  })

  it("emits no internal numeric ids", async () => {
    const { strapi } = buildStrapi([CATEGORY])
    const service = propertyCatalogService({ strapi })

    const catalog = await service.listPropertyCatalog()

    expect(JSON.stringify(catalog)).not.toContain('"id"')
  })

  it("carries enumOptions through for an enum definition", async () => {
    const { strapi } = buildStrapi([
      {
        ...CATEGORY,
        properties: [
          {
            documentId: "def-enum",
            name: "Seating Type",
            slug: "seating-type",
            type: "enum",
            enumOptions: ["fixed", "flexible"],
            sortOrder: 1,
          },
        ],
      },
    ])
    const service = propertyCatalogService({ strapi })

    const catalog = await service.listPropertyCatalog()

    expect(catalog[0].definitions[0].enumOptions).toEqual(["fixed", "flexible"])
  })

  it("reports the parent by SLUG so the editor can nest without ids", async () => {
    const { strapi } = buildStrapi([
      {
        ...CATEGORY,
        documentId: "cat-2",
        slug: "seating",
        parent: { id: 1, documentId: "cat-1", slug: "facilities" },
      },
    ])
    const service = propertyCatalogService({ strapi })

    const catalog = await service.listPropertyCatalog()

    expect(catalog[0].parent).toBe("facilities")
  })

  it("drops categories with no definitions (the grouping parents)", async () => {
    const { strapi } = buildStrapi([
      { documentId: "cat-empty", name: "Facilities", properties: [] },
      CATEGORY,
    ])
    const service = propertyCatalogService({ strapi })

    const catalog = await service.listPropertyCatalog()

    expect(catalog.map((c) => c.documentId)).toEqual(["cat-1"])
  })

  it("returns an empty list rather than throwing on an unusable read", async () => {
    const { strapi } = buildStrapi(null)
    const service = propertyCatalogService({ strapi })

    expect(await service.listPropertyCatalog()).toEqual([])
  })
})
