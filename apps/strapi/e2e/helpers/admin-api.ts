/**
 * Thin admin-API client for test setup and cleanup.
 *
 * It talks to the same content-manager routes the events-manager Works screen
 * uses (`/content-manager/collection-types/<uid>`, flat bodies), authenticated
 * with an admin JWT from `POST /admin/login`. Never used for the assertions of
 * the admin walkthrough itself: that goes through the browser.
 */
import fs from "node:fs"
import path from "node:path"

import { expect } from "@playwright/test"

import type { APIRequestContext, APIResponse } from "@playwright/test"

import { ADMIN_EMAIL, ADMIN_PASSWORD, E2E_SLUG_PREFIX } from "./env"

export const WORK_UID = "plugin::creative-works.creative-work"
export const PERSON_UID = "plugin::creative-works.person"
export const CREDIT_ROLE_UID = "plugin::creative-works.credit-role"
export const GENRE_UID = "plugin::creative-works.genre"

type Params = Record<string, string | number | boolean>

export interface LocaleInfo {
  code: string
  name: string
  isDefault: boolean
}

export interface UploadedFile {
  id: number
  documentId?: string
  name: string
  url: string
}

async function json<T>(response: APIResponse, what: string): Promise<T> {
  if (!response.ok()) {
    throw new Error(
      `${what} failed: ${response.status()} ${await response.text()}`
    )
  }
  return (await response.json()) as T
}

export class AdminApi {
  private constructor(
    private readonly request: APIRequestContext,
    private readonly token: string
  ) {}

  /**
   * An admin API client. `request` should carry the saved admin session
   * (`storageState`): the token is then minted from its refresh cookie through
   * `/admin/access-token`, which is not rate limited. `/admin/login` (limited
   * to a few calls per window) is only the fallback.
   */
  static async login(request: APIRequestContext): Promise<AdminApi> {
    const refreshed = await request.post("/admin/access-token", { data: {} })
    if (refreshed.ok()) {
      const token = (await refreshed.json())?.data?.token
      if (token) return new AdminApi(request, token)
    }
    const response = await request.post("/admin/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    const body = await json<{ data: { token: string } }>(
      response,
      "admin login"
    )
    expect(body.data.token, "admin login returns a token").toBeTruthy()
    return new AdminApi(request, body.data.token)
  }

  private get headers() {
    return { Authorization: `Bearer ${this.token}` }
  }

  private cm(uid: string, documentId?: string) {
    const base = `/content-manager/collection-types/${uid}`
    return documentId ? `${base}/${documentId}` : base
  }

  async locales(): Promise<LocaleInfo[]> {
    const response = await this.request.get("/i18n/locales", {
      headers: this.headers,
    })
    return json<LocaleInfo[]>(response, "list locales")
  }

  async defaultLocale(): Promise<string> {
    const locales = await this.locales()
    const found = locales.find((locale) => locale.isDefault)
    if (!found) throw new Error("no default locale configured")
    return found.code
  }

  async list<T = any>(uid: string, params: Params = {}): Promise<T[]> {
    const response = await this.request.get(this.cm(uid), {
      headers: this.headers,
      params: { page: 1, pageSize: 100, ...params },
    })
    const body = await json<{ results?: T[] }>(response, `list ${uid}`)
    return body.results ?? []
  }

  /** One locale row of a document, or null when that locale has no row. */
  async get<T = any>(
    uid: string,
    documentId: string,
    locale?: string
  ): Promise<{ data: T | null; meta: any }> {
    const response = await this.request.get(this.cm(uid, documentId), {
      headers: this.headers,
      params: locale ? { locale } : undefined,
    })
    if (response.status() === 404) return { data: null, meta: null }
    const body = await json<{ data: T; meta: any }>(response, `get ${uid}`)
    return { data: body.data ?? null, meta: body.meta }
  }

  async create<T = any>(
    uid: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const response = await this.request.post(this.cm(uid), {
      headers: this.headers,
      data,
    })
    const body = await json<{ data: T }>(response, `create ${uid}`)
    return body.data
  }

  async update<T = any>(
    uid: string,
    documentId: string,
    data: Record<string, unknown>,
    locale?: string
  ): Promise<T> {
    const response = await this.request.put(this.cm(uid, documentId), {
      headers: this.headers,
      data,
      params: locale ? { locale } : undefined,
    })
    const body = await json<{ data: T }>(response, `update ${uid}`)
    return body.data
  }

  async publish(uid: string, documentId: string, locale?: string) {
    const response = await this.request.post(
      `${this.cm(uid, documentId)}/actions/publish`,
      {
        headers: this.headers,
        data: {},
        params: locale ? { locale } : undefined,
      }
    )
    return json<any>(response, `publish ${uid} ${documentId}`)
  }

  async unpublish(uid: string, documentId: string, locale?: string) {
    const response = await this.request.post(
      `${this.cm(uid, documentId)}/actions/unpublish`,
      {
        headers: this.headers,
        data: {},
        params: locale ? { locale } : undefined,
      }
    )
    return json<any>(response, `unpublish ${uid} ${documentId}`)
  }

  /** Delete every locale row of a document. Missing rows are ignored. */
  async deleteAllLocales(uid: string, documentId: string) {
    const locales = await this.locales()
    // Translations first, default locale last.
    const ordered = [...locales].sort(
      (a, b) => Number(a.isDefault) - Number(b.isDefault)
    )
    for (const locale of ordered) {
      const response = await this.request.delete(this.cm(uid, documentId), {
        headers: this.headers,
        params: { locale: locale.code },
      })
      if (!response.ok() && response.status() !== 404) {
        throw new Error(
          `delete ${uid} ${documentId} (${locale.code}) failed: ${response.status()} ${await response.text()}`
        )
      }
    }
  }

  /** Remove every work whose slug starts with the E2E prefix (crashed runs). */
  async purgeE2eWorks(): Promise<number> {
    const rows = await this.list<{ documentId: string; slug: string | null }>(
      WORK_UID,
      { "filters[slug][$startsWith]": E2E_SLUG_PREFIX }
    )
    const ids = [...new Set(rows.map((row) => row.documentId))]
    for (const id of ids) await this.deleteAllLocales(WORK_UID, id)
    return ids.length
  }

  async findBySlug<T = any>(uid: string, slug: string): Promise<T | null> {
    const rows = await this.list<T>(uid, { "filters[slug][$eq]": slug })
    return rows[0] ?? null
  }

  /** Upload one local file to the media library (local provider in E2E). */
  async upload(filePath: string, fileName?: string): Promise<UploadedFile> {
    const response = await this.request.post("/upload", {
      headers: this.headers,
      multipart: {
        files: {
          name: fileName ?? path.basename(filePath),
          mimeType: "image/png",
          buffer: fs.readFileSync(filePath),
        },
      },
    })
    const body = await json<UploadedFile[]>(response, "upload")
    return body[0]
  }

  async findUploads(namePrefix: string): Promise<UploadedFile[]> {
    const response = await this.request.get("/upload/files", {
      headers: this.headers,
      params: { "filters[name][$startsWith]": namePrefix, pageSize: 100 },
    })
    const body = await json<UploadedFile[] | { results?: UploadedFile[] }>(
      response,
      "list uploads"
    )
    return Array.isArray(body) ? body : body.results ?? []
  }

  async deleteUpload(id: number) {
    await this.request.delete(`/upload/files/${id}`, { headers: this.headers })
  }
}
