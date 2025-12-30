const { parse } = require("pg-connection-string")

module.exports = ({ env }) => {
  if (env("NODE_ENV") === "development") {
    return {
      connection: {
        client: "postgres",
        connection: {
          host: env("DATABASE_HOST"),
          port: env("DATABASE_PORT"),
          database: env("DATABASE_NAME"),
          user: env("DATABASE_USERNAME"),
          password: env("DATABASE_PASSWORD"),
        },
      },
    }
  }
  if (env("NODE_ENV") === "production") {
    const { host, port, database, user, password } = parse(env("DATABASE_URL"))
    return {
      connection: {
        client: "postgres",
        connection: {
          host,
          port,
          database,
          user,
          password,
          ssl: {
            rejectUnauthorized: env.bool("DATABASE_SSL_SELF", false),
          },
        },
        debug: false,
      },
    }
  }
}
