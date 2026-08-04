import type { Schema, Struct } from "@strapi/strapi"

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_tokens"
  info: {
    description: ""
    displayName: "Api Token"
    name: "Api Token"
    pluralName: "api-tokens"
    singularName: "api-token"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }> &
      Schema.Attribute.DefaultTo<"">
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    expiresAt: Schema.Attribute.DateTime
    lastUsedAt: Schema.Attribute.DateTime
    lifespan: Schema.Attribute.BigInteger
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::api-token"> &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "admin::api-token-permission"
    >
    publishedAt: Schema.Attribute.DateTime
    type: Schema.Attribute.Enumeration<["read-only", "full-access", "custom"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"read-only">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: "strapi_api_token_permissions"
  info: {
    description: ""
    displayName: "API Token Permission"
    name: "API Token Permission"
    pluralName: "api-token-permissions"
    singularName: "api-token-permission"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::api-token-permission"
    > &
      Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    token: Schema.Attribute.Relation<"manyToOne", "admin::api-token">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: "admin_permissions"
  info: {
    description: ""
    displayName: "Permission"
    name: "Permission"
    pluralName: "permissions"
    singularName: "permission"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::permission"> &
      Schema.Attribute.Private
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.Relation<"manyToOne", "admin::role">
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: "admin_roles"
  info: {
    description: ""
    displayName: "Role"
    name: "Role"
    pluralName: "roles"
    singularName: "role"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::role"> &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    permissions: Schema.Attribute.Relation<"oneToMany", "admin::permission">
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    users: Schema.Attribute.Relation<"manyToMany", "admin::user">
  }
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: "strapi_sessions"
  info: {
    description: "Session Manager storage"
    displayName: "Session"
    name: "Session"
    pluralName: "sessions"
    singularName: "session"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
    i18n: {
      localized: false
    }
  }
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private
    childId: Schema.Attribute.String & Schema.Attribute.Private
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::session"> &
      Schema.Attribute.Private
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique
    status: Schema.Attribute.String & Schema.Attribute.Private
    type: Schema.Attribute.String & Schema.Attribute.Private
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private
  }
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_tokens"
  info: {
    description: ""
    displayName: "Transfer Token"
    name: "Transfer Token"
    pluralName: "transfer-tokens"
    singularName: "transfer-token"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }> &
      Schema.Attribute.DefaultTo<"">
    expiresAt: Schema.Attribute.DateTime
    lastUsedAt: Schema.Attribute.DateTime
    lifespan: Schema.Attribute.BigInteger
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token-permission"
    >
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_transfer_token_permissions"
  info: {
    description: ""
    displayName: "Transfer Token Permission"
    name: "Transfer Token Permission"
    pluralName: "transfer-token-permissions"
    singularName: "transfer-token-permission"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "admin::transfer-token-permission"
    > &
      Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    token: Schema.Attribute.Relation<"manyToOne", "admin::transfer-token">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: "admin_users"
  info: {
    description: ""
    displayName: "User"
    name: "User"
    pluralName: "users"
    singularName: "user"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6
      }>
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<"oneToMany", "admin::user"> &
      Schema.Attribute.Private
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6
      }>
    preferedLanguage: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private
    roles: Schema.Attribute.Relation<"manyToMany", "admin::role"> &
      Schema.Attribute.Private
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    username: Schema.Attribute.String
  }
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_releases"
  info: {
    displayName: "Release"
    pluralName: "releases"
    singularName: "release"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    actions: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    >
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String & Schema.Attribute.Required
    publishedAt: Schema.Attribute.DateTime
    releasedAt: Schema.Attribute.DateTime
    scheduledAt: Schema.Attribute.DateTime
    status: Schema.Attribute.Enumeration<
      ["ready", "blocked", "failed", "done", "empty"]
    > &
      Schema.Attribute.Required
    timezone: Schema.Attribute.String
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_release_actions"
  info: {
    displayName: "Release Action"
    pluralName: "release-actions"
    singularName: "release-action"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    entryDocumentId: Schema.Attribute.String
    isEntryValid: Schema.Attribute.Boolean
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::content-releases.release-action"
    > &
      Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    release: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::content-releases.release"
    >
    type: Schema.Attribute.Enumeration<["publish", "unpublish"]> &
      Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginCreativeWorksCategory
  extends Struct.CollectionTypeSchema {
  collectionName: "categories"
  info: {
    description: "Event and content categories (Cinema, Theatre, Concerts, etc.)"
    displayName: "Category"
    pluralName: "categories"
    singularName: "category"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    icon: Schema.Attribute.String
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.category"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginCreativeWorksCharacter
  extends Struct.CollectionTypeSchema {
  collectionName: "characters"
  info: {
    description: "Fictional characters portrayed in creative works (schema.org Person)"
    displayName: "Character"
    pluralName: "characters"
    singularName: "character"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.character"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginCreativeWorksCreativeWork
  extends Struct.CollectionTypeSchema {
  collectionName: "creative_works"
  info: {
    description: "Films, plays, short films and other creative works"
    displayName: "Creative Work"
    pluralName: "creative-works"
    singularName: "creative-work"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    ageRating: Schema.Attribute.Enumeration<["TP", "PG12", "PG16", "PG18"]> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    backdrop: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    cast: Schema.Attribute.Component<"creative-works.cast", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    credits: Schema.Attribute.Component<"creative-works.credit", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    distinctions: Schema.Attribute.Component<
      "creative-works.distinction",
      true
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    duration: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    externalIds: Schema.Attribute.Component<
      "creative-works.external-ids",
      false
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    genres: Schema.Attribute.Relation<
      "manyToMany",
      "plugin::creative-works.genre"
    >
    links: Schema.Attribute.Component<"common.link", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.creative-work"
    >
    originalTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    photos: Schema.Attribute.Media<"images", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    poster: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    rating: Schema.Attribute.Decimal &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    releaseYear: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    slug: Schema.Attribute.UID<"title"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    synopsis: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    theatreDetails: Schema.Attribute.Component<
      "creative-works.theatre-details",
      false
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    type: Schema.Attribute.Enumeration<["film", "play", "short-film"]> &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    videos: Schema.Attribute.Component<"common.video", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
  }
}

export interface PluginCreativeWorksCreditRole
  extends Struct.CollectionTypeSchema {
  collectionName: "credit_roles"
  info: {
    description: "Crew vocabulary for creative-work credits (director, writer, composer, playwright, \u2026). Named 'credit-role' to avoid the Strapi RBAC 'role' collision (admin::role / plugin::users-permissions.role)."
    displayName: "Credit Role"
    pluralName: "credit-roles"
    singularName: "credit-role"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    department: Schema.Attribute.Enumeration<
      [
        "directing",
        "writing",
        "production",
        "camera",
        "editing",
        "sound",
        "music",
        "art",
        "costume-makeup",
        "lighting",
        "stage",
        "other",
      ]
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.credit-role"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginCreativeWorksGenre extends Struct.CollectionTypeSchema {
  collectionName: "genres"
  info: {
    description: "Content categories like Drama, Comedy, Action, etc."
    displayName: "Genre"
    pluralName: "genres"
    singularName: "genre"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    color: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    icon: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.genre"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginCreativeWorksPerson extends Struct.CollectionTypeSchema {
  collectionName: "persons"
  info: {
    description: "Filmmakers, actors, directors, and other creative professionals"
    displayName: "Person"
    pluralName: "persons"
    singularName: "person"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    bio: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    birthDate: Schema.Attribute.Date &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    externalIds: Schema.Attribute.Component<
      "creative-works.external-ids",
      false
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    links: Schema.Attribute.Component<"common.link", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::creative-works.person"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    nationality: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    photo: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    roles: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginEventsManagerEvent extends Struct.CollectionTypeSchema {
  collectionName: "events"
  info: {
    description: "Occurrence datee et localisee (conteneur / superEvent)"
    displayName: "Event"
    pluralName: "events"
    singularName: "event"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    category: Schema.Attribute.Enumeration<
      [
        "movie_screening",
        "theater_performance",
        "concert",
        "exhibition",
        "other",
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    endDateTime: Schema.Attribute.DateTime &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    eventGroup: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.event-group"
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    eventStatus: Schema.Attribute.Enumeration<
      ["scheduled", "cancelled", "postponed", "rescheduled"]
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<"scheduled">
    externalId: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    featured: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<false>
    images: Schema.Attribute.Media<"images", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.event"
    >
    performances: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.performance"
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    screenings: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.screening"
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    slug: Schema.Attribute.UID &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    startDateTime: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    venue: Schema.Attribute.Relation<"manyToOne", "plugin::venues.venue"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
  }
}

export interface PluginEventsManagerEventGroup
  extends Struct.CollectionTypeSchema {
  collectionName: "event_groups"
  info: {
    description: "Groups of events for festivals, seasons, or themed collections"
    displayName: "Event Group"
    pluralName: "event-groups"
    singularName: "event-group"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    endDate: Schema.Attribute.Date &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    events: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.event"
    >
    featured: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<false>
    gallery: Schema.Attribute.Media<"images", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    hero: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    links: Schema.Attribute.Component<"common.link", true> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.event-group"
    >
    poster: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    shortTitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    slug: Schema.Attribute.UID<"title"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    startDate: Schema.Attribute.Date &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    subtitle: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    type: Schema.Attribute.Enumeration<
      ["festival", "season", "series", "retrospective", "special"]
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<"festival">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginEventsManagerFeature
  extends Struct.CollectionTypeSchema {
  collectionName: "features"
  info: {
    description: "Vocabulaire controle : caracteristiques d'une seance (premiere, equipe presente, VOSTFR...)"
    displayName: "Feature"
    pluralName: "features"
    singularName: "feature"
  }
  options: {
    draftAndPublish: true
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    category: Schema.Attribute.Enumeration<
      ["technical", "event", "accessibility"]
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    icon: Schema.Attribute.Media<"images"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    label: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.feature"
    >
    performances: Schema.Attribute.Relation<
      "manyToMany",
      "plugin::events-manager.performance"
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    screenings: Schema.Attribute.Relation<
      "manyToMany",
      "plugin::events-manager.screening"
    > &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    slug: Schema.Attribute.UID &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginEventsManagerPerformance
  extends Struct.CollectionTypeSchema {
  collectionName: "performances"
  info: {
    description: "Sous-evenement theatre (schema.org TheaterEvent)"
    displayName: "Performance"
    pluralName: "performances"
    singularName: "performance"
  }
  options: {
    draftAndPublish: true
  }
  attributes: {
    audioLanguage: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    event: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.event"
    >
    features: Schema.Attribute.Relation<
      "manyToMany",
      "plugin::events-manager.feature"
    >
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.performance"
    > &
      Schema.Attribute.Private
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>
    play: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::creative-works.creative-work"
    >
    price: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    startDateTime: Schema.Attribute.DateTime
    surtitleLanguage: Schema.Attribute.String
    ticketsAvailable: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    ticketsSold: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    ticketTiers: Schema.Attribute.Component<"ticketing.ticket-tier", true>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginEventsManagerScreening
  extends Struct.CollectionTypeSchema {
  collectionName: "screenings"
  info: {
    description: "Sous-evenement cine (schema.org ScreeningEvent)"
    displayName: "Screening"
    pluralName: "screenings"
    singularName: "screening"
  }
  options: {
    draftAndPublish: true
  }
  attributes: {
    audioLanguage: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    event: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.event"
    >
    features: Schema.Attribute.Relation<
      "manyToMany",
      "plugin::events-manager.feature"
    >
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.screening"
    > &
      Schema.Attribute.Private
    movie: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::creative-works.creative-work"
    >
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>
    price: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>
    publishedAt: Schema.Attribute.DateTime
    startDateTime: Schema.Attribute.DateTime
    subtitleLanguage: Schema.Attribute.String
    ticketsAvailable: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    ticketsSold: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>
    ticketTiers: Schema.Attribute.Component<"ticketing.ticket-tier", true>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    videoFormat: Schema.Attribute.Enumeration<
      ["standard", "threeD", "imax", "fourDX", "format70mm"]
    > &
      Schema.Attribute.DefaultTo<"standard">
  }
}

export interface PluginGeographyCity extends Struct.CollectionTypeSchema {
  collectionName: "cities"
  info: {
    description: "Cities and municipalities within regions"
    displayName: "City"
    pluralName: "cities"
    singularName: "city"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    latitude: Schema.Attribute.Decimal
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::geography.city"
    >
    longitude: Schema.Attribute.Decimal
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    region: Schema.Attribute.Relation<"manyToOne", "plugin::geography.region">
    slug: Schema.Attribute.UID<"name">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginGeographyRegion extends Struct.CollectionTypeSchema {
  collectionName: "regions"
  info: {
    description: "Geographic regions of Tunisia (governorates)"
    displayName: "Region"
    pluralName: "regions"
    singularName: "region"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    cities: Schema.Attribute.Relation<"oneToMany", "plugin::geography.city">
    code: Schema.Attribute.String
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::geography.region"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: "i18n_locale"
  info: {
    collectionName: "locales"
    description: ""
    displayName: "Locale"
    pluralName: "locales"
    singularName: "locale"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::i18n.locale"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50
          min: 1
        },
        number
      >
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows"
  info: {
    description: ""
    displayName: "Workflow"
    name: "Workflow"
    pluralName: "workflows"
    singularName: "workflow"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"[]">
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique
    publishedAt: Schema.Attribute.DateTime
    stageRequiredToPublish: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::review-workflows.workflow-stage"
    >
    stages: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    >
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: "strapi_workflows_stages"
  info: {
    description: ""
    displayName: "Stages"
    name: "Workflow Stage"
    pluralName: "workflow-stages"
    singularName: "workflow-stage"
  }
  options: {
    draftAndPublish: false
    version: "1.1.0"
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<"#4945FF">
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::review-workflows.workflow-stage"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String
    permissions: Schema.Attribute.Relation<"manyToMany", "admin::permission">
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    workflow: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::review-workflows.workflow"
    >
  }
}

export interface PluginTicketingTicket extends Struct.CollectionTypeSchema {
  collectionName: "tickets"
  info: {
    description: "Individual tickets within an order, each with unique QR code for validation"
    displayName: "Ticket"
    pluralName: "tickets"
    singularName: "ticket"
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::ticketing.ticket"
    > &
      Schema.Attribute.Private
    order: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::ticketing.ticket-order"
    >
    price: Schema.Attribute.Decimal & Schema.Attribute.Required
    publishedAt: Schema.Attribute.DateTime
    qrCode: Schema.Attribute.String
    scannedAt: Schema.Attribute.DateTime
    seatInfo: Schema.Attribute.JSON
    status: Schema.Attribute.Enumeration<
      ["valid", "scanned", "cancelled", "expired"]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"valid">
    ticketNumber: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique
    type: Schema.Attribute.Enumeration<["standard", "reduced", "vip"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"standard">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginTicketingTicketOrder
  extends Struct.CollectionTypeSchema {
  collectionName: "ticket_orders"
  info: {
    description: "Orders for ticket purchases, supports both registered users and guest checkout"
    displayName: "Ticket Order"
    pluralName: "ticket-orders"
    singularName: "ticket-order"
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    currency: Schema.Attribute.String & Schema.Attribute.DefaultTo<"TND">
    event: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.event"
    >
    guestEmail: Schema.Attribute.Email
    guestName: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::ticketing.ticket-order"
    > &
      Schema.Attribute.Private
    orderNumber: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique
    paymentMethod: Schema.Attribute.String
    paymentReference: Schema.Attribute.String
    paymentStatus: Schema.Attribute.Enumeration<
      ["pending", "paid", "failed", "refunded"]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"pending">
    performance: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.performance"
    >
    publishedAt: Schema.Attribute.DateTime
    purchasedAt: Schema.Attribute.DateTime
    screening: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::events-manager.screening"
    >
    tickets: Schema.Attribute.Relation<"oneToMany", "plugin::ticketing.ticket">
    totalAmount: Schema.Attribute.Decimal & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    user: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.user"
    >
  }
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: "files"
  info: {
    description: ""
    displayName: "File"
    pluralName: "files"
    singularName: "file"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    alternativeText: Schema.Attribute.Text
    caption: Schema.Attribute.Text
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    ext: Schema.Attribute.String
    folder: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder"> &
      Schema.Attribute.Private
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    formats: Schema.Attribute.JSON
    hash: Schema.Attribute.String & Schema.Attribute.Required
    height: Schema.Attribute.Integer
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::upload.file"
    > &
      Schema.Attribute.Private
    mime: Schema.Attribute.String & Schema.Attribute.Required
    name: Schema.Attribute.String & Schema.Attribute.Required
    previewUrl: Schema.Attribute.Text
    provider: Schema.Attribute.String & Schema.Attribute.Required
    provider_metadata: Schema.Attribute.JSON
    publishedAt: Schema.Attribute.DateTime
    related: Schema.Attribute.Relation<"morphToMany">
    size: Schema.Attribute.Decimal & Schema.Attribute.Required
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    url: Schema.Attribute.Text & Schema.Attribute.Required
    width: Schema.Attribute.Integer
  }
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: "upload_folders"
  info: {
    displayName: "Folder"
    pluralName: "folders"
    singularName: "folder"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    children: Schema.Attribute.Relation<"oneToMany", "plugin::upload.folder">
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    files: Schema.Attribute.Relation<"oneToMany", "plugin::upload.file">
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::upload.folder"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    parent: Schema.Attribute.Relation<"manyToOne", "plugin::upload.folder">
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1
      }>
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginUserEngagementScheduleNotification
  extends Struct.CollectionTypeSchema {
  collectionName: "schedule_notifications"
  info: {
    description: "In-app notification snapshot for a watchlisted event's schedule change"
    displayName: "Schedule Notification"
    pluralName: "schedule-notifications"
    singularName: "schedule-notification"
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    changeType: Schema.Attribute.Enumeration<
      ["showtime_changed", "cancelled", "postponed", "rescheduled"]
    >
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    creativeWorkDocumentId: Schema.Attribute.String
    eventDocumentId: Schema.Attribute.String
    eventTitle: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::user-engagement.schedule-notification"
    > &
      Schema.Attribute.Private
    newDateTime: Schema.Attribute.DateTime
    oldDateTime: Schema.Attribute.DateTime
    publishedAt: Schema.Attribute.DateTime
    read: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    user: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.user"
    >
  }
}

export interface PluginUserEngagementUserWatchlist
  extends Struct.CollectionTypeSchema {
  collectionName: "user_watchlists"
  info: {
    description: "User's saved creative works for later viewing with notification preferences"
    displayName: "User Watchlist"
    pluralName: "user-watchlists"
    singularName: "user-watchlist"
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    addedAt: Schema.Attribute.DateTime
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    creativeWork: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::creative-works.creative-work"
    >
    dedupeKey: Schema.Attribute.String &
      Schema.Attribute.Private &
      Schema.Attribute.Unique
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::user-engagement.user-watchlist"
    > &
      Schema.Attribute.Private
    notifyChanges: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>
    publishedAt: Schema.Attribute.DateTime
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    user: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.user"
    >
  }
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: "up_permissions"
  info: {
    description: ""
    displayName: "Permission"
    name: "permission"
    pluralName: "permissions"
    singularName: "permission"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.permission"
    > &
      Schema.Attribute.Private
    publishedAt: Schema.Attribute.DateTime
    role: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.role"
    >
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: "up_roles"
  info: {
    description: ""
    displayName: "Role"
    name: "role"
    pluralName: "roles"
    singularName: "role"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    "content-manager": {
      visible: false
    }
    "content-type-builder": {
      visible: false
    }
  }
  attributes: {
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.role"
    > &
      Schema.Attribute.Private
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3
      }>
    permissions: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.permission"
    >
    publishedAt: Schema.Attribute.DateTime
    type: Schema.Attribute.String & Schema.Attribute.Unique
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    users: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.user"
    >
  }
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: "up_users"
  info: {
    description: "Extended user model with preferences"
    displayName: "User"
    name: "user"
    pluralName: "users"
    singularName: "user"
  }
  options: {
    draftAndPublish: false
  }
  attributes: {
    avatar: Schema.Attribute.Media<"images">
    avatarUrl: Schema.Attribute.Text
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    defaultRegion: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::geography.region"
    >
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6
      }>
    emailChangeToken: Schema.Attribute.String & Schema.Attribute.Private
    emailChangeTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private
    emailNotificationsEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>
    firstName: Schema.Attribute.String
    lastName: Schema.Attribute.String
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::users-permissions.user"
    > &
      Schema.Attribute.Private
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6
      }>
    passwordChangedAt: Schema.Attribute.DateTime & Schema.Attribute.Private
    pendingEmail: Schema.Attribute.Email & Schema.Attribute.Private
    preferredLanguage: Schema.Attribute.Enumeration<["ar", "fr", "en"]> &
      Schema.Attribute.DefaultTo<"fr">
    provider: Schema.Attribute.String
    publishedAt: Schema.Attribute.DateTime
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private
    resetPasswordTokenExpiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Private
    role: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.role"
    >
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3
      }>
  }
}

export interface PluginVenuesPropertyCategory
  extends Struct.CollectionTypeSchema {
  collectionName: "property_categories"
  info: {
    description: "Groups related properties (e.g., Accessibility, Facilities, Services)"
    displayName: "Property Category"
    pluralName: "property-categories"
    singularName: "property-category"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    children: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::venues.property-category"
    >
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    icon: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::venues.property-category"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    parent: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::venues.property-category"
    >
    properties: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::venues.property-definition"
    >
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    sortOrder: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<0>
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginVenuesPropertyDefinition
  extends Struct.CollectionTypeSchema {
  collectionName: "property_definitions"
  info: {
    description: "Defines reusable property schemas with type, icon, and validation rules"
    displayName: "Property Definition"
    pluralName: "property-definitions"
    singularName: "property-definition"
  }
  options: {
    draftAndPublish: false
  }
  pluginOptions: {
    i18n: {
      localized: true
    }
  }
  attributes: {
    category: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::venues.property-category"
    >
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.Text &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    enumOptions: Schema.Attribute.JSON &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    icon: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    locale: Schema.Attribute.String
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::venues.property-definition"
    >
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true
        }
      }>
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name"> &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }>
    sortOrder: Schema.Attribute.Integer &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<0>
    type: Schema.Attribute.Enumeration<
      ["boolean", "integer", "string", "enum"]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: false
        }
      }> &
      Schema.Attribute.DefaultTo<"boolean">
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
  }
}

export interface PluginVenuesVenue extends Struct.CollectionTypeSchema {
  collectionName: "venues"
  info: {
    description: "Lieu (schema.org MovieTheater / PerformingArtsTheater / Place)"
    displayName: "Venue"
    pluralName: "venues"
    singularName: "venue"
  }
  options: {
    draftAndPublish: true
  }
  attributes: {
    address: Schema.Attribute.Text
    capacity: Schema.Attribute.Integer
    cityRef: Schema.Attribute.Relation<"manyToOne", "plugin::geography.city">
    createdAt: Schema.Attribute.DateTime
    createdBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    description: Schema.Attribute.Text
    email: Schema.Attribute.Email
    events: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::events-manager.event"
    >
    geo: Schema.Attribute.Component<"shared.geo-point", false>
    images: Schema.Attribute.Media<"images", true>
    locale: Schema.Attribute.String & Schema.Attribute.Private
    localizations: Schema.Attribute.Relation<
      "oneToMany",
      "plugin::venues.venue"
    > &
      Schema.Attribute.Private
    logo: Schema.Attribute.Media<"images">
    manager: Schema.Attribute.Relation<
      "manyToOne",
      "plugin::users-permissions.user"
    >
    name: Schema.Attribute.String & Schema.Attribute.Required
    phone: Schema.Attribute.String
    properties: Schema.Attribute.Component<
      "entity-properties.property-value",
      true
    >
    publishedAt: Schema.Attribute.DateTime
    slug: Schema.Attribute.UID<"name">
    status: Schema.Attribute.Enumeration<["pending", "approved", "suspended"]> &
      Schema.Attribute.DefaultTo<"pending">
    type: Schema.Attribute.Enumeration<
      ["cinema", "theater", "cultural-center", "museum", "other"]
    >
    updatedAt: Schema.Attribute.DateTime
    updatedBy: Schema.Attribute.Relation<"oneToOne", "admin::user"> &
      Schema.Attribute.Private
    website: Schema.Attribute.String
  }
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ContentTypeSchemas {
      "admin::api-token": AdminApiToken
      "admin::api-token-permission": AdminApiTokenPermission
      "admin::permission": AdminPermission
      "admin::role": AdminRole
      "admin::session": AdminSession
      "admin::transfer-token": AdminTransferToken
      "admin::transfer-token-permission": AdminTransferTokenPermission
      "admin::user": AdminUser
      "plugin::content-releases.release": PluginContentReleasesRelease
      "plugin::content-releases.release-action": PluginContentReleasesReleaseAction
      "plugin::creative-works.category": PluginCreativeWorksCategory
      "plugin::creative-works.character": PluginCreativeWorksCharacter
      "plugin::creative-works.creative-work": PluginCreativeWorksCreativeWork
      "plugin::creative-works.credit-role": PluginCreativeWorksCreditRole
      "plugin::creative-works.genre": PluginCreativeWorksGenre
      "plugin::creative-works.person": PluginCreativeWorksPerson
      "plugin::events-manager.event": PluginEventsManagerEvent
      "plugin::events-manager.event-group": PluginEventsManagerEventGroup
      "plugin::events-manager.feature": PluginEventsManagerFeature
      "plugin::events-manager.performance": PluginEventsManagerPerformance
      "plugin::events-manager.screening": PluginEventsManagerScreening
      "plugin::geography.city": PluginGeographyCity
      "plugin::geography.region": PluginGeographyRegion
      "plugin::i18n.locale": PluginI18NLocale
      "plugin::review-workflows.workflow": PluginReviewWorkflowsWorkflow
      "plugin::review-workflows.workflow-stage": PluginReviewWorkflowsWorkflowStage
      "plugin::ticketing.ticket": PluginTicketingTicket
      "plugin::ticketing.ticket-order": PluginTicketingTicketOrder
      "plugin::upload.file": PluginUploadFile
      "plugin::upload.folder": PluginUploadFolder
      "plugin::user-engagement.schedule-notification": PluginUserEngagementScheduleNotification
      "plugin::user-engagement.user-watchlist": PluginUserEngagementUserWatchlist
      "plugin::users-permissions.permission": PluginUsersPermissionsPermission
      "plugin::users-permissions.role": PluginUsersPermissionsRole
      "plugin::users-permissions.user": PluginUsersPermissionsUser
      "plugin::venues.property-category": PluginVenuesPropertyCategory
      "plugin::venues.property-definition": PluginVenuesPropertyDefinition
      "plugin::venues.venue": PluginVenuesVenue
    }
  }
}
