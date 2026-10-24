"use strict"

const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { Readable } = require("node:stream")

const provider = require("./index.js")

const { createImageKitProvider, folderSegment, init } = provider

const FAKE_PRIVATE_KEY = "private_" + "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MCs="
const FAKE_PUBLIC_KEY = "public_" + "YWJjZGVmZ2hpamtsbW5vcHFyc3Q="

/** Fake ImageKit SDK client recording every call. */
function fakeClient(options = {}) {
  const calls = { upload: [], deleteFile: [] }
  let counter = 0
  return {
    calls,
    async upload(args) {
      calls.upload.push(args)
      if (options.uploadError) throw options.uploadError
      counter += 1
      const filePath = `${args.folder}/${args.fileName}`
      return {
        fileId: `fid-${counter}`,
        url: `https://ik.example/test${filePath}`,
        filePath,
      }
    },
    async deleteFile(fileId) {
      calls.deleteFile.push(fileId)
      if (options.deleteError) throw options.deleteError
      return {}
    },
  }
}

/** Fake Media Library folder rows keyed by pathId. */
function fakeFinder(rows, { delay = 0, fail = false } = {}) {
  const finder = async (ids) => {
    finder.calls.push(ids)
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (fail) throw new Error("db down")
    return ids
      .filter((id) => rows[id] !== undefined)
      .map((id) => ({ pathId: id, name: rows[id] }))
  }
  finder.calls = []
  return finder
}

function fakeLog() {
  const lines = []
  const push = (level) => (message) => lines.push(`${level}: ${message}`)
  return {
    lines,
    info: push("info"),
    warn: push("warn"),
    error: push("error"),
  }
}

function mainFile(overrides = {}) {
  return {
    hash: "poster_abc123",
    ext: ".jpg",
    folderPath: "/1/3",
    stream: Readable.from([Buffer.from("hello "), Buffer.from("world")]),
    ...overrides,
  }
}

function build(options = {}) {
  const client = options.client ?? fakeClient()
  const findFolders =
    options.findFolders ?? fakeFinder({ 1: "Short films", 3: "Posters" })
  const log = options.log ?? fakeLog()
  const instance = createImageKitProvider({
    config: {
      publicKey: FAKE_PUBLIC_KEY,
      privateKey: FAKE_PRIVATE_KEY,
      urlEndpoint: "https://ik.imagekit.io/test",
      ...(options.config ?? {}),
    },
    client,
    findFolders,
    log,
    nodeEnv: options.nodeEnv ?? "development",
    ...(options.extra ?? {}),
  })
  return { instance, client, findFolders, log }
}

test("T1: uploadStream places a main file in the mirrored folder", async () => {
  const { instance, client } = build()
  const file = mainFile()
  await instance.uploadStream(file)

  assert.equal(client.calls.upload.length, 1)
  const call = client.calls.upload[0]
  assert.equal(call.folder, "/tiween/development/short-films/posters")
  assert.equal(call.fileName, "poster_abc123.jpg")
  assert.equal(call.useUniqueFileName, false)
  assert.equal(call.overwriteFile, false)
  assert.ok(Buffer.isBuffer(call.file))
  assert.equal(call.file.toString(), "hello world")
  assert.equal(
    file.url,
    "https://ik.example/test/tiween/development/short-films/posters/poster_abc123.jpg"
  )
  assert.equal(file.provider_metadata.fileId, "fid-1")
})

test("T2: root folderPath and malformed folderPath go to unsorted", async () => {
  const root = build()
  await root.instance.uploadStream(mainFile({ folderPath: "/" }))
  assert.equal(
    root.client.calls.upload[0].folder,
    "/tiween/development/unsorted"
  )

  const bad = build()
  await bad.instance.uploadStream(mainFile({ folderPath: "/1/../etc" }))
  assert.equal(
    bad.client.calls.upload[0].folder,
    "/tiween/development/unsorted"
  )
  assert.equal(bad.log.lines.filter((l) => l.startsWith("warn")).length, 1)
})

test("T3: folderSegment slugifies and falls back to folder-{pathId}", async () => {
  assert.equal(folderSegment("Écoles d'été"), "ecoles-d-ete")
  assert.equal(folderSegment("  Courts   métrages!! "), "courts-metrages")
  assert.equal(folderSegment("مجلد"), "")
  assert.equal(folderSegment("a".repeat(100)).length, 64)

  const { instance, client } = build({
    findFolders: fakeFinder({ 1: "Short films", 7: "مجلد" }),
  })
  await instance.uploadStream(mainFile({ folderPath: "/1/7" }))
  assert.equal(
    client.calls.upload[0].folder,
    "/tiween/development/short-films/folder-7"
  )

  const missing = build({ findFolders: fakeFinder({ 1: "Short films" }) })
  await missing.instance.uploadStream(mainFile({ folderPath: "/1/9" }))
  assert.equal(
    missing.client.calls.upload[0].folder,
    "/tiween/development/short-films/folder-9"
  )
})

test("T4: root and env folders follow config and NODE_ENV", async () => {
  const a = build({ config: { rootFolder: "Tiween Media" } })
  await a.instance.uploadStream(mainFile())
  assert.equal(
    a.client.calls.upload[0].folder,
    "/tiween-media/development/short-films/posters"
  )

  const b = build({ config: { envFolder: "staging" } })
  await b.instance.uploadStream(mainFile())
  assert.equal(
    b.client.calls.upload[0].folder,
    "/tiween/staging/short-films/posters"
  )

  const c = build({ config: { envFolder: "" }, nodeEnv: "production" })
  await c.instance.uploadStream(mainFile())
  assert.equal(
    c.client.calls.upload[0].folder,
    "/tiween/production/short-films/posters"
  )

  const d = build({ config: { rootFolder: "", envFolder: undefined } })
  await d.instance.uploadStream(mainFile())
  assert.equal(
    d.client.calls.upload[0].folder,
    "/tiween/development/short-films/posters"
  )
})

test("T5: a failing folder lookup uploads to unsorted without unhandled rejection", async () => {
  const unhandled = []
  const onUnhandled = (reason) => unhandled.push(reason)
  process.on("unhandledRejection", onUnhandled)
  try {
    const { instance, client, log } = build({
      findFolders: fakeFinder({}, { fail: true }),
    })
    await instance.uploadStream(mainFile())
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(client.calls.upload[0].folder, "/tiween/development/unsorted")
    assert.equal(log.lines.filter((l) => l.startsWith("warn")).length, 1)
    assert.deepEqual(unhandled, [])
  } finally {
    process.off("unhandledRejection", onUnhandled)
  }
})

test("T6: upload (buffer variant) places like uploadStream", async () => {
  const { instance, client } = build()
  const file = mainFile({ stream: undefined, buffer: Buffer.from("abc") })
  await instance.upload(file)
  assert.equal(
    client.calls.upload[0].folder,
    "/tiween/development/short-films/posters"
  )
  assert.equal(client.calls.upload[0].file.toString(), "abc")
  assert.equal(file.buffer, undefined)
})

test("T7: provider errors are safe and never expose the private key", async () => {
  const statusError = { message: "forbidden", help: "x" }
  Object.defineProperty(statusError, "$ResponseMetadata", {
    value: { statusCode: 403 },
    enumerable: false,
  })
  const a = build({ client: fakeClient({ uploadError: statusError }) })
  await assert.rejects(a.instance.uploadStream(mainFile()), (error) => {
    assert.ok(error instanceof Error)
    assert.equal(error.statusCode, 403)
    assert.equal(error.cause, undefined)
    return true
  })

  const axiosError = new Error(
    `Request failed with status code 401 for ${FAKE_PRIVATE_KEY} and ${FAKE_PUBLIC_KEY}`
  )
  axiosError.config = { auth: { username: FAKE_PRIVATE_KEY, password: "" } }
  axiosError.response = { status: 401 }
  const b = build({ client: fakeClient({ uploadError: axiosError }) })
  let caught
  try {
    await b.instance.uploadStream(mainFile())
  } catch (error) {
    caught = error
  }
  assert.ok(caught instanceof Error)
  assert.equal(caught.statusCode, 401)
  assert.equal("cause" in caught, false)
  assert.equal("config" in caught, false)
  for (const text of [
    caught.message,
    JSON.stringify(caught),
    String(caught.stack),
    ...b.log.lines,
  ]) {
    assert.ok(!text.includes(FAKE_PRIVATE_KEY), "private key leaked")
    assert.ok(!text.includes(FAKE_PUBLIC_KEY), "public key leaked")
    assert.ok(!text.includes("YWJjZGVmZ2hp"), "key fragment leaked")
  }
})

test("T8: delete uses the stored fileId and tolerates 404 and missing id", async () => {
  const ok = build()
  await ok.instance.delete({ provider_metadata: { fileId: "abc" } })
  assert.deepEqual(ok.client.calls.deleteFile, ["abc"])

  const notFound = Object.assign(new Error("not found"), {
    $ResponseMetadata: { statusCode: 404 },
  })
  const missing = build({ client: fakeClient({ deleteError: notFound }) })
  await missing.instance.delete({ provider_metadata: { fileId: "abc" } })
  assert.equal(missing.client.calls.deleteFile.length, 1)

  const noId = build()
  await noId.instance.delete({ hash: "x", ext: ".jpg" })
  assert.equal(noId.client.calls.deleteFile.length, 0)
  assert.equal(noId.log.lines.filter((l) => l.startsWith("warn")).length, 1)

  const boom = build({
    client: fakeClient({
      deleteError: Object.assign(new Error(`bad ${FAKE_PRIVATE_KEY}`), {
        status: 500,
      }),
    }),
  })
  await assert.rejects(
    boom.instance.delete({ provider_metadata: { fileId: "abc" } }),
    (error) => {
      assert.equal(error.statusCode, 500)
      assert.ok(!error.message.includes(FAKE_PRIVATE_KEY))
      return true
    }
  )
})

test("T9: the folder lookup starts synchronously", async () => {
  const { instance, findFolders } = build()
  const pending = instance.uploadStream(mainFile())
  assert.equal(findFolders.calls.length, 1)
  await pending
})

test("T10: init returns the provider methods without touching globals or network", () => {
  const hadStrapi = Object.prototype.hasOwnProperty.call(globalThis, "strapi")
  const instance = init({
    publicKey: "public_test",
    privateKey: "private_test",
    urlEndpoint: "https://ik.imagekit.io/test",
  })
  assert.equal(typeof instance.upload, "function")
  assert.equal(typeof instance.uploadStream, "function")
  assert.equal(typeof instance.delete, "function")
  assert.equal(
    Object.prototype.hasOwnProperty.call(globalThis, "strapi"),
    hadStrapi
  )
})

test("T11: Strapi's loader resolves the package to this directory", () => {
  const appDir = path.resolve(__dirname, "../../apps/strapi")
  const uploadEntry = require.resolve("@strapi/upload/strapi-server", {
    paths: [appDir],
  })
  const resolved = require.resolve("@tiween/strapi-provider-upload-imagekit", {
    paths: [path.dirname(uploadEntry)],
  })
  assert.equal(
    fs.realpathSync(resolved),
    fs.realpathSync(path.join(__dirname, "index.js"))
  )
})
