import path from "path"

/**
 * Test environment database config.
 *
 * Loaded automatically by Strapi when NODE_ENV=test. Uses an in-process
 * SQLite database under .tmp/test.db so the suite doesn't depend on a
 * running Postgres instance and can be wiped between runs.
 *
 * SQLite caveats vs. production Postgres are documented in tests/README.md.
 */
export default ({
  env,
}: {
  env: (key: string, fallback?: string) => string
}) => ({
  connection: {
    client: "sqlite",
    connection: {
      filename: path.join(
        __dirname,
        "..",
        "..",
        "..",
        env("DATABASE_FILENAME", ".tmp/test.db")
      ),
    },
    useNullAsDefault: true,
    debug: false,
  },
})
