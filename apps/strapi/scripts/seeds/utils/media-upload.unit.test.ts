/**
 * Unit tests for the SSRF-safe image downloader and the upload-provider guard
 * (plan 01-10, threats T-01-30 and T-01-31). `fetch` is injected: no network.
 */
import { EventEmitter } from "node:events"

import {
  assertUploadProvider,
  DEFAULT_MEDIA_HOSTS,
  describeUploadFailure,
  downloadImage,
  findOrUploadImage,
  guardUnobservedRejections,
  MediaUploadError,
  youtubeThumbnailCandidates,
} from "./media-upload"

/** Valid magic bytes for each supported type, padded so they look like a file. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
])
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32),
])
const HTML = Buffer.from("<html><body>not an image</body></html>")

const HOSTS = [...DEFAULT_MEDIA_HOSTS, "cdn.example.org"]

type Fetch = typeof fetch

function imageResponse(
  body: Buffer | ReadableStream<Uint8Array>,
  contentType = "image/png",
  headers: Record<string, string> = {}
) {
  return new Response(body as never, {
    status: 200,
    headers: { "content-type": contentType, ...headers },
  })
}

function redirect(location: string, status = 302) {
  return new Response(null, { status, headers: { location } })
}

/** A fetch that serves the responses in order and records every call. */
function scriptedFetch(...responses: Response[]) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const impl: Fetch = async (input, init) => {
    calls.push({ url: String(input), init })
    const next = responses.shift()
    if (!next) throw new Error("UNEXPECTED_FETCH")
    return next
  }
  return { impl, calls }
}

const run = (url: string, impl: Fetch, extra: object = {}) =>
  downloadImage(url, { allowedHosts: HOSTS, fetchImpl: impl, ...extra })

describe("downloadImage", () => {
  it("downloads an allowlisted https image and reports mime and extension", async () => {
    const { impl, calls } = scriptedFetch(imageResponse(PNG))
    const image = await run(
      "https://i.ytimg.com/vi/abc/maxresdefault.jpg",
      impl
    )

    expect(image.mime).toBe("image/png")
    expect(image.ext).toBe(".png")
    expect(image.buffer.equals(PNG)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].init?.redirect).toBe("manual")
  })

  it("trusts the file signature over a wrong but image/* content-type", async () => {
    const { impl } = scriptedFetch(imageResponse(JPEG, "image/png"))
    const image = await run("https://artify.tn/a.png", impl)
    expect(image.mime).toBe("image/jpeg")
    expect(image.ext).toBe(".jpg")
  })

  it("matches hostnames case-insensitively", async () => {
    const { impl } = scriptedFetch(imageResponse(PNG))
    await expect(run("https://I.YTIMG.com/x.jpg", impl)).resolves.toBeDefined()
  })

  it("rejects http://", async () => {
    const { impl, calls } = scriptedFetch(imageResponse(PNG))
    await expect(run("http://i.ytimg.com/x.jpg", impl)).rejects.toMatchObject({
      code: "HTTPS_REQUIRED",
    })
    expect(calls).toHaveLength(0)
  })

  it("rejects a host outside the allowlist", async () => {
    const { impl, calls } = scriptedFetch(imageResponse(PNG))
    await expect(
      run("https://evil.example.com/x.png", impl)
    ).rejects.toMatchObject({ code: "HOST_NOT_ALLOWED" })
    expect(calls).toHaveLength(0)
  })

  it("rejects a lookalike subdomain of an allowed host", async () => {
    const { impl } = scriptedFetch(imageResponse(PNG))
    await expect(
      run("https://i.ytimg.com.evil.example.com/x.png", impl)
    ).rejects.toMatchObject({ code: "HOST_NOT_ALLOWED" })
  })

  it.each([
    "https://203.0.113.5/x.png",
    "https://127.0.0.1/x.png",
    "https://[::1]/x.png",
    "https://169.254.169.254/latest/meta-data",
  ])("rejects the IP-literal host %s even when allowlisted", async (url) => {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "")
    const { impl, calls } = scriptedFetch(imageResponse(PNG))
    await expect(
      downloadImage(url, { allowedHosts: [host], fetchImpl: impl })
    ).rejects.toMatchObject({ code: "IP_HOST_FORBIDDEN" })
    expect(calls).toHaveLength(0)
  })

  it("rejects a redirect to a host outside the allowlist", async () => {
    const { impl, calls } = scriptedFetch(
      redirect("https://evil.example.com/x.png"),
      imageResponse(PNG)
    )
    await expect(run("https://i.ytimg.com/x.jpg", impl)).rejects.toMatchObject({
      code: "HOST_NOT_ALLOWED",
    })
    expect(calls).toHaveLength(1)
  })

  it("rejects a redirect to http", async () => {
    const { impl } = scriptedFetch(redirect("http://i.ytimg.com/x.jpg"))
    await expect(run("https://i.ytimg.com/x.jpg", impl)).rejects.toMatchObject({
      code: "HTTPS_REQUIRED",
    })
  })

  it("follows a relative redirect and an allowlisted redirect", async () => {
    const { impl, calls } = scriptedFetch(
      redirect("/other.jpg"),
      redirect("https://cdn.example.org/final.png", 301),
      imageResponse(PNG)
    )
    const image = await run("https://artify.tn/start.jpg", impl)
    expect(image.ext).toBe(".png")
    expect(calls.map((call) => call.url)).toEqual([
      "https://artify.tn/start.jpg",
      "https://artify.tn/other.jpg",
      "https://cdn.example.org/final.png",
    ])
  })

  it("allows exactly three redirects", async () => {
    const { impl } = scriptedFetch(
      redirect("/a"),
      redirect("/b"),
      redirect("/c"),
      imageResponse(PNG)
    )
    await expect(run("https://artify.tn/start", impl)).resolves.toBeDefined()
  })

  it("rejects more than three redirects", async () => {
    const { impl, calls } = scriptedFetch(
      redirect("/a"),
      redirect("/b"),
      redirect("/c"),
      redirect("/d"),
      imageResponse(PNG)
    )
    await expect(run("https://artify.tn/start", impl)).rejects.toMatchObject({
      code: "TOO_MANY_REDIRECTS",
    })
    expect(calls).toHaveLength(4)
  })

  it("rejects a redirect without a location", async () => {
    const { impl } = scriptedFetch(new Response(null, { status: 302 }))
    await expect(run("https://artify.tn/start", impl)).rejects.toMatchObject({
      code: "REDIRECT_WITHOUT_LOCATION",
    })
  })

  it("rejects a text/html content-type", async () => {
    const { impl } = scriptedFetch(imageResponse(HTML, "text/html"))
    await expect(run("https://artify.tn/page", impl)).rejects.toMatchObject({
      code: "NOT_AN_IMAGE",
    })
  })

  it("rejects an image/* content-type whose bytes are not an image", async () => {
    const { impl } = scriptedFetch(imageResponse(HTML, "image/png"))
    await expect(run("https://artify.tn/x.png", impl)).rejects.toMatchObject({
      code: "NOT_AN_IMAGE",
    })
  })

  it("rejects svg (active content)", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')
    const { impl } = scriptedFetch(imageResponse(svg, "image/svg+xml"))
    await expect(run("https://artify.tn/x.svg", impl)).rejects.toMatchObject({
      code: "NOT_AN_IMAGE",
    })
  })

  it("rejects a non-2xx answer", async () => {
    const { impl } = scriptedFetch(
      new Response(PNG as never, {
        status: 404,
        headers: { "content-type": "image/jpeg" },
      })
    )
    await expect(run("https://i.ytimg.com/x.jpg", impl)).rejects.toMatchObject({
      code: "HTTP_ERROR",
    })
  })

  it("rejects a body over 10 MB while streaming", async () => {
    const chunk = new Uint8Array(1024 * 1024)
    chunk.set(PNG)
    let sent = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > 11) return controller.close()
        sent += 1
        controller.enqueue(chunk)
      },
    })
    const { impl } = scriptedFetch(imageResponse(stream))
    await expect(
      run("https://i.ytimg.com/big.jpg", impl)
    ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" })
    // The reader stopped: it did not drain the whole (unbounded) stream.
    expect(sent).toBeLessThanOrEqual(12)
  })

  it("rejects early on a declared content-length over the cap", async () => {
    const { impl } = scriptedFetch(
      imageResponse(PNG, "image/png", { "content-length": "99999999" })
    )
    await expect(
      run("https://i.ytimg.com/big.jpg", impl)
    ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" })
  })

  it("honours a custom byte cap", async () => {
    const { impl } = scriptedFetch(imageResponse(PNG))
    await expect(
      run("https://artify.tn/x.png", impl, { maxBytes: 16 })
    ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" })
  })

  it("times out a request that never answers", async () => {
    const hanging: Fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted"))
        )
      })
    await expect(
      run("https://artify.tn/slow.png", hanging, { timeoutMs: 20 })
    ).rejects.toMatchObject({ code: "DOWNLOAD_TIMEOUT" })
  })

  it("wraps a network failure in a coded error", async () => {
    const failing: Fetch = async () => {
      throw new TypeError("fetch failed")
    }
    await expect(run("https://artify.tn/x.png", failing)).rejects.toMatchObject(
      { code: "DOWNLOAD_FAILED" }
    )
  })

  it("rejects a URL that does not parse", async () => {
    const { impl } = scriptedFetch(imageResponse(PNG))
    await expect(run("not a url", impl)).rejects.toMatchObject({
      code: "INVALID_URL",
    })
  })
})

describe("youtubeThumbnailCandidates", () => {
  const ID = "dQw4w9WgXcQ"
  const expected = [
    `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
  ]

  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=10s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
  ])("lists maxresdefault then hqdefault for %s", (url) => {
    expect(youtubeThumbnailCandidates(url)).toEqual(expected)
  })

  it.each([
    "https://vimeo.com/123456789",
    "https://example.org/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/watch",
    "not a url",
  ])("returns nothing for %s", (url) => {
    expect(youtubeThumbnailCandidates(url)).toEqual([])
  })

  it("only ever produces allowlisted https hosts", () => {
    for (const candidate of youtubeThumbnailCandidates(
      `https://youtu.be/${ID}`
    )) {
      expect(DEFAULT_MEDIA_HOSTS).toContain(new URL(candidate).hostname)
    }
  })
})

describe("assertUploadProvider", () => {
  const strapiWith = (provider: unknown) =>
    ({ config: { get: () => ({ provider }) } }) as never

  const original = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = original
  })

  it("accepts the ImageKit provider", () => {
    expect(() =>
      assertUploadProvider(strapiWith("strapi-provider-upload-imagekit"), {
        allowLocal: false,
      })
    ).not.toThrow()
  })

  it("refuses the local provider by default", () => {
    expect(() =>
      assertUploadProvider(strapiWith("local"), { allowLocal: false })
    ).toThrow("UPLOAD_PROVIDER_NOT_IMAGEKIT")
  })

  it("refuses a missing provider by default", () => {
    expect(() =>
      assertUploadProvider(strapiWith(undefined), { allowLocal: false })
    ).toThrow("UPLOAD_PROVIDER_NOT_IMAGEKIT")
  })

  it("accepts the local provider with allowLocal outside production", () => {
    process.env.NODE_ENV = "development"
    expect(() =>
      assertUploadProvider(strapiWith("local"), { allowLocal: true })
    ).not.toThrow()
  })

  it("always throws with allowLocal in production", () => {
    process.env.NODE_ENV = "production"
    expect(() =>
      assertUploadProvider(strapiWith("local"), { allowLocal: true })
    ).toThrow("UPLOAD_PROVIDER_NOT_IMAGEKIT")
    expect(() =>
      assertUploadProvider(strapiWith("strapi-provider-upload-imagekit"), {
        allowLocal: true,
      })
    ).toThrow("ALLOW_LOCAL_UPLOADS_REFUSED_IN_PRODUCTION")
  })
})

/* -------------------------------------------------------------------------- */
/* Upload failures                                                            */
/* -------------------------------------------------------------------------- */

/** What the ImageKit SDK rejects an upload with: no `message`, status hidden. */
function imagekitRejection(statusCode: number, body: object = {}) {
  return Object.defineProperty({ ...body }, "$ResponseMetadata", {
    value: { statusCode, headers: {} },
    enumerable: false,
  })
}

const FAKE_PRIVATE_KEY = "private_AAAAAAAAAAAAAAAAAAAAAAAAAAAA="

describe("describeUploadFailure", () => {
  it("reports the hidden HTTP status of an ImageKit upload rejection", () => {
    expect(describeUploadFailure(imagekitRejection(403))).toBe(
      "HTTP 403, check the upload provider credentials and account status"
    )
  })

  it("adds the provider's message when there is one", () => {
    const rejection = imagekitRejection(403, {
      message: "Your account cannot be authenticated.",
      help: "For support kindly contact us",
    })
    expect(describeUploadFailure(rejection)).toBe(
      "HTTP 403, check the upload provider credentials and account status, " +
        "Your account cannot be authenticated."
    )
  })

  it("gives no credentials hint for other statuses", () => {
    expect(describeUploadFailure(imagekitRejection(429))).toBe("HTTP 429")
  })

  it("never echoes the private key an axios error carries in config.auth", () => {
    const axiosLike = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
      config: { auth: { username: FAKE_PRIVATE_KEY, password: "" } },
    })
    const text = describeUploadFailure(axiosLike)
    expect(text).toBe("ECONNREFUSED, connect ECONNREFUSED")
    expect(text).not.toContain("private_")
  })

  it("redacts a key that leaks into a message and caps its length", () => {
    const leaky = describeUploadFailure(
      new Error(`bad key ${FAKE_PRIVATE_KEY} ${"x".repeat(500)}`)
    )
    expect(leaky).not.toContain(FAKE_PRIVATE_KEY)
    expect(leaky).toContain("[redacted-key]")
    expect(leaky.length).toBeLessThan(200)
  })

  it("copes with values that are not objects", () => {
    expect(describeUploadFailure(undefined)).toBe("no detail")
    expect(describeUploadFailure(null)).toBe("no detail")
    expect(describeUploadFailure("plain text")).toBe("plain text")
    expect(describeUploadFailure({})).toBe("no detail from the provider")
  })
})

describe("findOrUploadImage", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32),
  ])
  const download = jest.fn(async () => ({
    buffer: png,
    mime: "image/png",
    ext: ".png",
  }))

  function strapiWith(
    upload: jest.Mock,
    existing: { id: number } | null = null
  ) {
    return {
      db: { query: () => ({ findOne: async () => existing }) },
      plugin: () => ({ service: () => ({ upload }) }),
    } as never
  }

  it("returns the id of the uploaded file", async () => {
    const upload = jest.fn(async () => [{ id: 7 }])
    await expect(
      findOrUploadImage(
        strapiWith(upload),
        { name: "my-film-backdrop", url: "https://i.ytimg.com/a.jpg" },
        { download }
      )
    ).resolves.toBe(7)
  })

  it("reuses an existing file without downloading or uploading", async () => {
    const upload = jest.fn()
    download.mockClear()
    await expect(
      findOrUploadImage(
        strapiWith(upload, { id: 3 }),
        { name: "my-film-backdrop", url: "https://i.ytimg.com/a.jpg" },
        { download }
      )
    ).resolves.toBe(3)
    expect(download).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it("turns a refused upload into a MediaUploadError that names the image and the status", async () => {
    const upload = jest.fn(async () => {
      throw imagekitRejection(403)
    })
    const failure = await findOrUploadImage(
      strapiWith(upload),
      { name: "my-film-backdrop", url: "https://i.ytimg.com/a.jpg" },
      { download }
    ).catch((error) => error)

    expect(failure).toBeInstanceOf(MediaUploadError)
    expect(failure.code).toBe("UPLOAD_FAILED")
    expect(failure.message).toBe(
      "UPLOAD_FAILED: my-film-backdrop (HTTP 403, check the upload provider " +
        "credentials and account status)"
    )
  })

  it("does not leak a credential carried by the provider's error", async () => {
    const upload = jest.fn(async () => {
      throw Object.assign(new Error("socket hang up"), {
        code: "ECONNRESET",
        config: { auth: { username: FAKE_PRIVATE_KEY } },
      })
    })
    const failure = await findOrUploadImage(
      strapiWith(upload),
      { name: "my-film-backdrop", url: "https://i.ytimg.com/a.jpg" },
      { download }
    ).catch((error) => error)

    expect(failure.message).toBe(
      "UPLOAD_FAILED: my-film-backdrop (ECONNRESET, socket hang up)"
    )
    expect(JSON.stringify(failure)).not.toContain(FAKE_PRIVATE_KEY)
    expect(String(failure.stack)).not.toContain(FAKE_PRIVATE_KEY)
  })

  it("leaves a download failure as the downloader threw it", async () => {
    const failure = await findOrUploadImage(
      strapiWith(jest.fn()),
      { name: "my-film-backdrop", url: "https://i.ytimg.com/a.jpg" },
      {
        download: async () => {
          throw new Error("HTTP_ERROR")
        },
      }
    ).catch((error) => error)

    expect(failure).not.toBeInstanceOf(MediaUploadError)
    expect(failure.message).toBe("HTTP_ERROR")
  })
})

describe("guardUnobservedRejections", () => {
  /** Stands in for `process`, so the test can fire the event on demand. */
  const fakeProcess = () => new EventEmitter()

  it("hands an unobserved rejection to the callback instead of letting it escape", async () => {
    const emitter = fakeProcess()
    const seen: string[] = []

    const result = await guardUnobservedRejections(
      async () => {
        emitter.emit(
          "unhandledRejection",
          imagekitRejection(403),
          Promise.resolve()
        )
        return "done"
      },
      (detail) => seen.push(detail),
      emitter
    )

    expect(result).toBe("done")
    expect(seen).toEqual([
      "HTTP 403, check the upload provider credentials and account status",
    ])
  })

  it("listens only while the task runs", async () => {
    const emitter = fakeProcess()
    let listenersDuring = -1

    await guardUnobservedRejections(
      async () => {
        listenersDuring = emitter.listenerCount("unhandledRejection")
      },
      () => undefined,
      emitter
    )

    expect(listenersDuring).toBe(1)
    expect(emitter.listenerCount("unhandledRejection")).toBe(0)
  })

  it("removes the listener and rethrows when the task fails", async () => {
    const emitter = fakeProcess()

    await expect(
      guardUnobservedRejections(
        async () => {
          throw new Error("TASK_FAILED")
        },
        () => undefined,
        emitter
      )
    ).rejects.toThrow("TASK_FAILED")
    expect(emitter.listenerCount("unhandledRejection")).toBe(0)
  })

  it("still records a rejection that fires right after the task returned", async () => {
    const emitter = fakeProcess()
    const seen: string[] = []

    await guardUnobservedRejections(
      async () => {
        setImmediate(() =>
          emitter.emit(
            "unhandledRejection",
            new Error("LATE"),
            Promise.resolve()
          )
        )
      },
      (detail) => seen.push(detail),
      emitter
    )

    expect(seen).toEqual(["LATE"])
  })
})
