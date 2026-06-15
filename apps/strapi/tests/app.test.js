const { setupStrapi, cleanupStrapi } = require("./helpers/strapi")

jest.setTimeout(60000)

let strapi

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

it("strapi is defined", () => {
  expect(strapi).toBeDefined()
})
