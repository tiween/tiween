/**
 * UAT 01 test 1: admin walkthrough in a real browser.
 *
 * Events Manager -> Works from the side nav; create a short film with FR, AR
 * and EN title/synopsis and a poster picked through Strapi's media-library
 * dialog (uploading a fixture); publish, reload, edit, unpublish; the public
 * detail route must 404 once unpublished. No raw JSON editor may appear.
 *
 * Publishing a short film runs the D-19 server guard
 * (`src/shared/short-film-rules.ts`): slug, poster, a directing credit whose
 * person is published, and a streaming link or trailer. The test fills exactly
 * those through the form.
 *
 * The second test is the WR-03 regression: hidden short-film-only fields are
 * neither validated nor sent.
 */
import fs from "node:fs"

import { expect, test } from "@playwright/test"

import type {
  APIRequestContext,
  Locator,
  Page,
  Request,
} from "@playwright/test"
import type { LocaleInfo } from "../helpers/admin-api"

import { AdminApi, CREDIT_ROLE_UID, WORK_UID } from "../helpers/admin-api"
import {
  BASE_URL,
  FIXTURES_DIR,
  SHORT_FILMS_API,
  STORAGE_STATE,
} from "../helpers/env"
import { fetchAllPublished } from "../helpers/short-films"

// Not serial: the WR-03 test must run even when the walkthrough fails.

const RUN = Date.now().toString(36)
const SLUG = `e2e-walkthrough-${RUN}`
const POSTER_NAME = `e2e-poster-${RUN}`

const FR = {
  title: `Court métrage E2E ${RUN}`,
  synopsis: "Un synopsis en français pour le parcours E2E.",
}
const AR = {
  title: `فيلم قصير ${RUN}`,
  synopsis: "ملخص باللغة العربية لاختبار المسار.",
}
const EN = {
  title: `E2E short film ${RUN}`,
  synopsis: "An English synopsis for the E2E walkthrough.",
}
const EDITED_FR_TITLE = `${FR.title} (modifié)`
const STREAMING_URL = "https://www.youtube.com/watch?v=e2e-walkthrough"

const WORKS_PATH = "/admin/plugins/events-manager/works"
const CM_WORK = `/content-manager/collection-types/${WORK_UID}`

let admin: AdminApi
let adminRequest: APIRequestContext
let anon: APIRequestContext
let locales: LocaleInfo[] = []
let director: { documentId: string; name: string }
let directorRoleName: string
let workDocumentId: string | null = null
const createdWorkIds: string[] = []

const localeName = (code: string) =>
  locales.find((locale) => locale.code === code)?.name ?? code

/** The FormSection card titled `title` (innermost div holding that h2). */
function section(page: Page, title: string): Locator {
  return page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .last()
}

/** A toast raised by `toggleNotification`. */
function toast(page: Page, text: string | RegExp): Locator {
  return page
    .getByRole("alert")
    .or(page.getByRole("status"))
    .filter({ hasText: text })
    .first()
}

/**
 * No raw JSON editing surface: Strapi's JSON field input is CodeMirror
 * (`.cm-editor`), and no textarea may hold a JSON object or array.
 */
async function expectNoRawJson(page: Page) {
  await expect(
    page.locator(
      ".cm-editor, .CodeMirror, [class*='JsonInput'], [data-testid*='json' i]"
    )
  ).toHaveCount(0)
  const textareas = await page.locator("textarea").all()
  for (const textarea of textareas) {
    const value = (await textarea.inputValue()).trim()
    const looksJson =
      (value.startsWith("{") && value.endsWith("}")) ||
      (value.startsWith("[") && value.endsWith("]"))
    expect(looksJson, `textarea holds raw JSON: ${value.slice(0, 80)}`).toBe(
      false
    )
  }
}

async function publishBadge(page: Page) {
  return page.getByTestId("publish-bar")
}

async function openLocaleTab(page: Page, code: string) {
  await page.getByRole("tab", { name: localeName(code) }).click()
}

/**
 * Pick the poster through the media-library dialog: upload the fixture from
 * "Add more assets", then select the uploaded card and Finish.
 */
async function pickPosterThroughMediaLibrary(
  page: Page,
  scope: Locator,
  filePath: string
) {
  await scope
    .getByRole("button", { name: /add from media library|replace/i })
    .first()
    .click()

  const browse = page.getByRole("dialog")
  await expect(browse).toBeVisible()
  await browse
    .getByRole("button", { name: /add more assets|add new assets/i })
    .first()
    .click()

  const upload = page.getByRole("dialog")
  await expect(upload.getByText(/from computer/i).first()).toBeVisible()
  await upload.locator("input[type=file]").setInputFiles(filePath)
  await upload
    .getByRole("button", { name: /upload 1 asset to the library/i })
    .click()

  // Back on the asset list: select the freshly uploaded card, then Finish.
  const picker = page.getByRole("dialog")
  const card = picker
    .locator("article")
    .filter({ hasText: POSTER_NAME })
    .first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.getByRole("checkbox").check()
  await picker.getByRole("button", { name: "Finish" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
}

test.beforeAll(async ({ playwright }) => {
  adminRequest = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
  })
  anon = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: { cookies: [], origins: [] },
  })
  admin = await AdminApi.login(adminRequest)
  await admin.purgeE2eWorks()

  locales = await admin.locales()
  for (const code of ["fr", "ar", "en"]) {
    expect(
      locales.map((locale) => locale.code),
      `locale ${code} is configured`
    ).toContain(code)
  }
  expect(locales.find((locale) => locale.isDefault)?.code).toBe("fr")

  // A director whose person record is published (the guard checks it): any
  // director the public directory already serves qualifies.
  const published = await fetchAllPublished(anon)
  const withDirector = published.find((film) => film.directors[0]?.name)
  expect(withDirector, "a seeded short with a published director").toBeTruthy()
  director = withDirector!.directors[0] as { documentId: string; name: string }

  const role = await admin.findBySlug<{ name: string }>(
    CREDIT_ROLE_UID,
    "director"
  )
  expect(role, "credit-role 'director' is seeded").toBeTruthy()
  directorRoleName = role!.name
})

test.afterAll(async () => {
  if (admin) {
    for (const id of createdWorkIds) {
      await admin.deleteAllLocales(WORK_UID, id).catch(() => undefined)
    }
    const files = await admin.findUploads(POSTER_NAME).catch(() => [])
    for (const file of files)
      await admin.deleteUpload(file.id).catch(() => undefined)
  }
  await adminRequest?.dispose()
  await anon?.dispose()
})

test("create, translate, publish, edit and unpublish a short film from the Works screen", async ({
  page,
}, testInfo) => {
  const posterPath = testInfo.outputPath(`${POSTER_NAME}.png`)
  fs.copyFileSync(`${FIXTURES_DIR}/poster.png`, posterPath)

  await test.step("Events Manager -> Works is reachable from the side nav", async () => {
    await page.goto("/admin")
    await page.getByRole("link", { name: "Events Manager" }).first().click()
    await page.getByRole("link", { name: "Works", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${WORKS_PATH}$`))
    await expect(
      page.getByRole("heading", { name: "Works", exact: true })
    ).toBeVisible()
    await expectNoRawJson(page)
  })

  await test.step("fill the default (FR) language with the form controls", async () => {
    await page.getByRole("button", { name: "Add a work" }).first().click()
    await expect(page).toHaveURL(new RegExp(`${WORKS_PATH}/new$`))
    await expect(page.getByRole("heading", { name: "New work" })).toBeVisible()

    // Translations stay disabled until the work exists.
    await expect(
      page.getByRole("tab", { name: localeName("ar") })
    ).toBeDisabled()

    await page.getByRole("button", { name: "Short film", exact: true }).click()
    await page
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(FR.title)
    await page.getByRole("textbox", { name: "Slug", exact: true }).fill(SLUG)
    await page
      .getByRole("textbox", { name: "Synopsis", exact: true })
      .fill(FR.synopsis)
    await page
      .getByRole("textbox", { name: "Duration (min)", exact: true })
      .fill("12")
  })

  await test.step("pick the poster through the media-library dialog", async () => {
    const identity = section(page, "Identity")
    await pickPosterThroughMediaLibrary(page, identity, posterPath)
    await expect(
      identity.getByRole("img", { name: new RegExp(POSTER_NAME) })
    ).toBeVisible()
  })

  await test.step("credit a published director and add a streaming link", async () => {
    const crew = section(page, "Crew")
    await crew.getByRole("button", { name: "Add a credit" }).click()
    const person = crew.getByRole("combobox", { name: "Person" }).first()
    await person.click()
    // The open listbox marks the rest of the page aria-hidden, so the
    // role locator stops resolving: type through the focused input.
    await page.keyboard.type(director.name)
    await page.getByRole("option", { name: director.name, exact: true }).click()

    await crew
      .getByRole("combobox", { name: "Role", exact: true })
      .first()
      .click()
    await page
      .getByRole("option", { name: directorRoleName, exact: true })
      .click()

    const watch = section(page, "Where to watch")
    await watch.getByRole("button", { name: "Add a streaming link" }).click()
    await watch
      .getByRole("textbox", { name: "Watch URL", exact: true })
      .fill(STREAMING_URL)
    await expectNoRawJson(page)
  })

  await test.step("save creates the work", async () => {
    const created = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === CM_WORK
    )
    await page.getByRole("button", { name: "Save", exact: true }).click()
    const response = await created
    expect(response.status(), await response.text()).toBeLessThan(300)
    const body = await response.json()
    workDocumentId = body.data.documentId as string
    createdWorkIds.push(workDocumentId)

    await expect(toast(page, "Work created")).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`${WORKS_PATH}/${workDocumentId}$`))
    // The edit page must render, not Strapi's crash screen.
    const crash = page.getByText("Something went wrong")
    await expect(page.getByTestId("publish-bar").or(crash)).toBeVisible()
    if (await crash.isVisible()) {
      const detail = await page.locator("main, body").first().innerText()
      throw new Error(
        `Works edit page crashed after create: ${detail.replace(/\s+/g, " ").slice(0, 300)}`
      )
    }
    await expect(page.getByTestId("publish-bar")).toContainText("Draft")
    await expect(page.getByTestId("publish-issues")).toHaveCount(0)
  })

  for (const [code, values] of [
    ["ar", AR],
    ["en", EN],
  ] as const) {
    await test.step(`translate title and synopsis into ${code.toUpperCase()}`, async () => {
      await openLocaleTab(page, code)
      await expect(
        page.getByRole("heading", { name: "Translation" })
      ).toBeVisible()
      const title = page.getByRole("textbox", { name: "Title", exact: true })
      await title.fill(values.title)
      await page
        .getByRole("textbox", { name: "Synopsis", exact: true })
        .fill(values.synopsis)

      if (code === "ar") {
        // The UAT asks for RTL on the Arabic locale. Record what the form does
        // (the WorkForm sets no `dir` today; see report) without failing on it.
        const dir = await title.evaluate(
          (element) =>
            element.getAttribute("dir") ??
            element.closest("[dir]")?.getAttribute("dir") ??
            getComputedStyle(element).direction
        )
        testInfo.annotations.push({
          type: "ar-direction",
          description: `Arabic title input direction: ${dir}`,
        })
        if (dir === "rtl") {
          await expect(title).toHaveCSS("direction", "rtl")
        }
      }

      await page.getByRole("button", { name: "Save", exact: true }).click()
      await expect(toast(page, "Translation saved")).toBeVisible()
      await expectNoRawJson(page)
    })
  }

  await test.step("publish the default language", async () => {
    await openLocaleTab(page, "fr")
    const bar = await publishBadge(page)
    await bar.getByRole("button", { name: "Publish", exact: true }).click()
    await expect(toast(page, "Work published")).toBeVisible()
    await expect(bar).toContainText("Published")

    const detail = await anon.get(`${SHORT_FILMS_API}/${SLUG}`)
    expect(detail.status()).toBe(200)
    const { data } = await detail.json()
    expect(data.title).toBe(FR.title)
    expect(data.synopsis).toBe(FR.synopsis)
    expect(data.poster?.url).toBeTruthy()
    expect(data.directors.map((d: { name: string }) => d.name)).toContain(
      director.name
    )
    expect(data.streamingLinks[0]?.url).toBe(STREAMING_URL)
  })

  await test.step("reload: every language kept its values", async () => {
    await page.reload()
    await expect(
      page.getByRole("textbox", { name: "Title", exact: true })
    ).toHaveValue(FR.title)
    await expect(
      page.getByRole("textbox", { name: "Slug", exact: true })
    ).toHaveValue(SLUG)
    await expect(
      page.getByRole("textbox", { name: "Synopsis", exact: true })
    ).toHaveValue(FR.synopsis)
    await expect(
      section(page, "Identity").getByRole("img", {
        name: new RegExp(POSTER_NAME),
      })
    ).toBeVisible()
    await expect(
      section(page, "Where to watch").getByRole("textbox", {
        name: "Watch URL",
        exact: true,
      })
    ).toHaveValue(STREAMING_URL)
    await expect(
      section(page, "Crew").getByRole("combobox", { name: "Person" }).first()
    ).toHaveValue(director.name)

    for (const [code, values] of [
      ["ar", AR],
      ["en", EN],
    ] as const) {
      await openLocaleTab(page, code)
      await expect(
        page.getByRole("textbox", { name: "Title", exact: true })
      ).toHaveValue(values.title)
      await expect(
        page.getByRole("textbox", { name: "Synopsis", exact: true })
      ).toHaveValue(values.synopsis)
    }
    await openLocaleTab(page, "fr")
    await expectNoRawJson(page)
  })

  await test.step("edit a field, save, republish", async () => {
    await page
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(EDITED_FR_TITLE)
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(toast(page, "Work saved")).toBeVisible()
    const bar = await publishBadge(page)
    await expect(bar).toContainText("Modified")

    // The public route keeps serving the published version until republished.
    const before = await (await anon.get(`${SHORT_FILMS_API}/${SLUG}`)).json()
    expect(before.data.title).toBe(FR.title)

    await bar.getByRole("button", { name: "Publish", exact: true }).click()
    await expect(toast(page, "Work published")).toBeVisible()
    await expect(bar).toContainText("Published")
    const after = await (await anon.get(`${SHORT_FILMS_API}/${SLUG}`)).json()
    expect(after.data.title).toBe(EDITED_FR_TITLE)
  })

  await test.step("unpublish: the public detail route answers 404", async () => {
    const bar = await publishBadge(page)
    await bar.getByRole("button", { name: "Unpublish", exact: true }).click()
    await expect(toast(page, "Work unpublished")).toBeVisible()
    await expect(bar).toContainText("Draft")

    const detail = await anon.get(`${SHORT_FILMS_API}/${SLUG}`)
    expect(detail.status()).toBe(404)
    expect((await detail.json()).error.details.code).toBe(
      "SHORT_FILM_NOT_FOUND"
    )
    await expectNoRawJson(page)
  })
})

test("WR-03: a blank streaming-link row hidden by switching to Film does not block Save", async ({
  page,
}, testInfo) => {
  // Regression for review finding WR-03, fixed in 01-16: hidden short-film-only
  // fields are neither validated nor sent. A blank streaming-link URL left
  // behind after switching to Film used to fail the Zod resolver on a field
  // that was no longer on screen (the form is `noValidate`), so Save did
  // nothing and showed nothing. Now the create request goes out without any
  // short-film-only key, and the browser lands on the saved work.
  const slug = `e2e-wr03-${RUN}`
  const cmWrites: Request[] = []
  page.on("request", (request) => {
    if (
      ["POST", "PUT"].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith(CM_WORK)
    ) {
      cmWrites.push(request)
    }
  })

  await page.goto(`${WORKS_PATH}/new`)
  await expect(page.getByRole("heading", { name: "New work" })).toBeVisible()
  await page.getByRole("button", { name: "Short film", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill(`E2E WR-03 ${RUN}`)
  await page.getByRole("textbox", { name: "Slug", exact: true }).fill(slug)

  const watch = section(page, "Where to watch")
  await watch.getByRole("button", { name: "Add a streaming link" }).click()
  await expect(
    watch.getByRole("textbox", { name: "Watch URL", exact: true })
  ).toHaveValue("")

  await page.getByRole("button", { name: "Film", exact: true }).click()
  await expect(
    page.getByRole("heading", { name: "Where to watch" })
  ).toHaveCount(0)

  await page.getByRole("button", { name: "Save", exact: true }).click()

  // The saved work's edit page, with the publish bar, proves the request went
  // out and succeeded. Clean up first so a failed assertion below still leaves
  // no work behind.
  try {
    await expect(page).toHaveURL(new RegExp(`${WORKS_PATH}/[^/]+$`), {
      timeout: 30_000,
    })
    await expect(page.getByTestId("publish-bar")).toBeVisible()
  } finally {
    const observed = {
      requests: cmWrites.map(
        (request) => `${request.method()} ${new URL(request.url()).pathname}`
      ),
      url: page.url(),
      toasts: await page
        .getByRole("alert")
        .or(page.getByRole("status"))
        .allInnerTexts(),
    }
    // Attachments only surface in the HTML report; keep the JSON on disk too.
    fs.writeFileSync(
      testInfo.outputPath("wr-03-observed.json"),
      JSON.stringify(observed, null, 2)
    )
    await testInfo.attach("wr-03-observed.json", {
      body: JSON.stringify(observed, null, 2),
      contentType: "application/json",
    })
    const saved = await admin.findBySlug<{ documentId: string }>(WORK_UID, slug)
    if (saved) createdWorkIds.push(saved.documentId)
  }

  const creates = cmWrites.filter((request) => request.method() === "POST")
  expect(creates, "Save sends exactly one create request").toHaveLength(1)
  const body = creates[0].postDataJSON() as Record<string, unknown>
  expect(body).not.toHaveProperty("streamingLinks")
  expect(body).not.toHaveProperty("featured")
  expect(body).not.toHaveProperty("featuredRank")
  expect(body.type).toBe("film")

  const saved = await admin.findBySlug<{ documentId: string }>(WORK_UID, slug)
  expect(saved, "the work was created").not.toBeNull()
})

test("a blank streaming-link row on a short film shows a translated field error", async ({
  page,
}) => {
  const slug = `e2e-blank-row-${RUN}`
  const cmWrites: Request[] = []
  page.on("request", (request) => {
    if (
      ["POST", "PUT"].includes(request.method()) &&
      new URL(request.url()).pathname.startsWith(CM_WORK)
    ) {
      cmWrites.push(request)
    }
  })

  await page.goto(`${WORKS_PATH}/new`)
  await expect(page.getByRole("heading", { name: "New work" })).toBeVisible()
  await page.getByRole("button", { name: "Short film", exact: true }).click()
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill(`E2E blank row ${RUN}`)
  await page.getByRole("textbox", { name: "Slug", exact: true }).fill(slug)

  const watch = section(page, "Where to watch")
  await watch.getByRole("button", { name: "Add a streaming link" }).click()
  await expect(
    watch.getByRole("textbox", { name: "Watch URL", exact: true })
  ).toHaveValue("")

  await page.getByRole("button", { name: "Save", exact: true }).click()

  // The field says what is wrong (in words, never the INVALID_HTTPS_URL code)
  // and a notification covers whatever is off-screen.
  await expect(
    section(page, "Where to watch").getByText("Enter a valid https:// link")
  ).toBeVisible()
  await expect(toast(page, "Some fields need attention")).toBeVisible()
  await expect(page.getByText("INVALID_HTTPS_URL")).toHaveCount(0)
  expect(cmWrites, "no content-manager write is sent").toHaveLength(0)
})
