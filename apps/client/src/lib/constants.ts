export const FALLBACK_IMAGE_PATH = "/images/broken-image.png"

// Password policy. Kept in sync with the Strapi register override
// (apps/strapi/src/extensions/users-permissions/strapi-server.ts), which
// enforces the SAME rule server-side. 8 chars + at least one uppercase,
// one lowercase, and one digit.
export const PASSWORD_MIN_LENGTH = 8
// bcrypt only hashes the first 72 bytes of a password; anything longer is
// silently truncated, so cap the input length on both client and server.
export const PASSWORD_MAX_LENGTH = 72
export const PASSWORD_REQUIRE_UPPERCASE = true
export const PASSWORD_REQUIRE_LOWERCASE = true
export const PASSWORD_REQUIRE_DIGIT = true
