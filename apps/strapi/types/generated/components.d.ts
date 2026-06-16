import type { Schema, Struct } from "@strapi/strapi"

export interface CommonLink extends Struct.ComponentSchema {
  collectionName: "components_common_links"
  info: {
    description: "External links (social media, websites, contact info)"
    displayName: "Link"
    icon: "link"
  }
  attributes: {
    label: Schema.Attribute.String
    type: Schema.Attribute.Enumeration<
      [
        "website",
        "facebook",
        "instagram",
        "youtube",
        "twitter",
        "tiktok",
        "linkedin",
        "vimeo",
        "spotify",
        "soundcloud",
        "whatsapp",
        "phone",
        "email",
        "imdb",
        "tmdb",
        "letterboxd",
        "allocine",
        "wikipedia",
        "maps",
        "booking",
        "other",
      ]
    > &
      Schema.Attribute.Required
    url: Schema.Attribute.String & Schema.Attribute.Required
  }
}

export interface CommonRemarkableFact extends Struct.ComponentSchema {
  collectionName: "components_common_remarkable_facts"
  info: {
    description: "Awards, festivals, and notable achievements"
    displayName: "Remarkable Fact"
    icon: "star"
  }
  attributes: {
    country: Schema.Attribute.String
    name: Schema.Attribute.String & Schema.Attribute.Required
    year: Schema.Attribute.Integer
  }
}

export interface CommonVideo extends Struct.ComponentSchema {
  collectionName: "components_common_videos"
  info: {
    description: "Video link with type classification"
    displayName: "Video"
    icon: "file-video"
  }
  attributes: {
    type: Schema.Attribute.Enumeration<["FULL_LENGTH", "TEASER", "CLIP"]> &
      Schema.Attribute.DefaultTo<"TEASER">
    url: Schema.Attribute.String & Schema.Attribute.Required
    videoType: Schema.Attribute.Enumeration<
      [
        "trailer",
        "teaser",
        "clip",
        "featurette",
        "interview",
        "behind-the-scenes",
        "full-length",
      ]
    >
  }
}

export interface CreativeWorksCast extends Struct.ComponentSchema {
  collectionName: "components_creative_works_casts"
  info: {
    description: "An actor's portrayal of a character in a creative work (person \u2192 character graph edge)"
    displayName: "Cast"
    icon: "users"
  }
  attributes: {
    billing: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1
        },
        number
      > &
      Schema.Attribute.DefaultTo<99>
    character: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::creative-works.character"
    >
    person: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::creative-works.person"
    > &
      Schema.Attribute.Required
  }
}

export interface CreativeWorksCredit extends Struct.ComponentSchema {
  collectionName: "components_creative_works_credits"
  info: {
    description: "A crew member's contribution to a creative work (person \u2192 credit-role graph edge)"
    displayName: "Credit"
    icon: "user-tie"
  }
  attributes: {
    billing: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1
        },
        number
      > &
      Schema.Attribute.DefaultTo<99>
    creditRole: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::creative-works.credit-role"
    > &
      Schema.Attribute.Required
    customRole: Schema.Attribute.String
    person: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::creative-works.person"
    > &
      Schema.Attribute.Required
  }
}

export interface CreativeWorksDistinction extends Struct.ComponentSchema {
  collectionName: "components_creative_works_distinctions"
  info: {
    description: "Festival selections, awards, nominations, and recognitions"
    displayName: "Distinction"
    icon: "trophy"
  }
  attributes: {
    awardName: Schema.Attribute.String
    category: Schema.Attribute.String
    edition: Schema.Attribute.String
    name: Schema.Attribute.String & Schema.Attribute.Required
    result: Schema.Attribute.Enumeration<
      [
        "selected",
        "nominated",
        "winner",
        "special-mention",
        "honorable-mention",
        "grand-prize",
      ]
    > &
      Schema.Attribute.DefaultTo<"selected">
    section: Schema.Attribute.String
    year: Schema.Attribute.Integer & Schema.Attribute.Required
  }
}

export interface CreativeWorksExternalIds extends Struct.ComponentSchema {
  collectionName: "components_creative_works_external_ids"
  info: {
    description: "External database identifiers for syncing (TMDB, IMDB, etc.)"
    displayName: "External IDs"
    icon: "link"
  }
  attributes: {
    imdbId: Schema.Attribute.String
    lastSyncedAt: Schema.Attribute.DateTime
    tmdbId: Schema.Attribute.Integer
  }
}

export interface CreativeWorksTheatreDetails extends Struct.ComponentSchema {
  collectionName: "components_creative_works_theatre_details"
  info: {
    description: "Theatre-specific metadata for plays and performances"
    displayName: "Theatre Details"
    icon: "theater-masks"
  }
  attributes: {
    actCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1
        },
        number
      >
    basedOn: Schema.Attribute.String
    format: Schema.Attribute.Enumeration<
      [
        "full-length",
        "one-act",
        "monologue",
        "sketch",
        "musical",
        "opera",
        "dance",
      ]
    > &
      Schema.Attribute.DefaultTo<"full-length">
    hasIntermission: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>
    isTourProduction: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>
    originalLanguage: Schema.Attribute.Enumeration<
      ["arabic", "darija", "french", "english", "arabic-french", "other"]
    >
    performedLanguages: Schema.Attribute.JSON
    playType: Schema.Attribute.Enumeration<
      ["original", "adaptation", "revival", "translation", "devised"]
    > &
      Schema.Attribute.DefaultTo<"original">
    premiereDate: Schema.Attribute.Date
    premiereVenue: Schema.Attribute.Relation<"oneToOne", "plugin::venues.venue">
    productionCompany: Schema.Attribute.String
  }
}

export interface EntityPropertiesPropertyValue extends Struct.ComponentSchema {
  collectionName: "components_entity_properties_property_values"
  info: {
    description: "Stores a property value attached to an entity"
    displayName: "Property Value"
    icon: "check-square"
  }
  attributes: {
    booleanValue: Schema.Attribute.Boolean
    definition: Schema.Attribute.Relation<
      "oneToOne",
      "plugin::venues.property-definition"
    >
    enumValue: Schema.Attribute.String
    integerValue: Schema.Attribute.Integer
    stringValue: Schema.Attribute.String
  }
}

export interface SeoUtilitiesMetaSocial extends Struct.ComponentSchema {
  collectionName: "components_seo_utilities_meta_socials"
  info: {
    displayName: "metaSocial"
    icon: "project-diagram"
  }
  attributes: {
    description: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 65
      }>
    image: Schema.Attribute.Media<"images" | "files" | "videos">
    socialNetwork: Schema.Attribute.Enumeration<["Facebook", "Twitter"]> &
      Schema.Attribute.Required
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60
      }>
  }
}

export interface SeoUtilitiesSeo extends Struct.ComponentSchema {
  collectionName: "components_seo_utilities_seos"
  info: {
    description: ""
    displayName: "seo"
    icon: "search"
  }
  attributes: {
    applicationName: Schema.Attribute.String
    canonicalUrl: Schema.Attribute.String
    email: Schema.Attribute.String
    keywords: Schema.Attribute.Text
    metaDescription: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 160
      }>
    metaImage: Schema.Attribute.Media<"images">
    metaRobots: Schema.Attribute.Enumeration<
      [
        "all",
        "index",
        "index,follow",
        "noindex",
        "noindex,follow",
        "noindex,nofollow",
        "none",
        "noarchive",
        "nosnippet",
        "max-snippet",
      ]
    > &
      Schema.Attribute.DefaultTo<"all">
    metaTitle: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 60
      }>
    og: Schema.Attribute.Component<"seo-utilities.seo-og", false>
    siteName: Schema.Attribute.String
    structuredData: Schema.Attribute.JSON
    twitter: Schema.Attribute.Component<"seo-utilities.seo-twitter", false>
  }
}

export interface SeoUtilitiesSeoOg extends Struct.ComponentSchema {
  collectionName: "components_seo_utilities_seo_ogs"
  info: {
    displayName: "SeoOg"
    icon: "oneToMany"
  }
  attributes: {
    description: Schema.Attribute.String
    image: Schema.Attribute.Media<"images">
    title: Schema.Attribute.String
    type: Schema.Attribute.Enumeration<["website", "article"]> &
      Schema.Attribute.DefaultTo<"website">
    url: Schema.Attribute.String
  }
}

export interface SeoUtilitiesSeoTwitter extends Struct.ComponentSchema {
  collectionName: "components_seo_utilities_seo_twitters"
  info: {
    displayName: "SeoTwitter"
    icon: "oneToMany"
  }
  attributes: {
    card: Schema.Attribute.String
    creator: Schema.Attribute.String
    creatorId: Schema.Attribute.String
    description: Schema.Attribute.String
    images: Schema.Attribute.Media<"images", true>
    siteId: Schema.Attribute.String
    title: Schema.Attribute.String
  }
}

export interface SeoUtilitiesSocialIcons extends Struct.ComponentSchema {
  collectionName: "components_seo_utilities_social_icons"
  info: {
    displayName: "SocialIcons"
  }
  attributes: {
    socials: Schema.Attribute.Component<"utilities.image-with-link", true>
    title: Schema.Attribute.String
  }
}

export interface SharedGeoPoint extends Struct.ComponentSchema {
  collectionName: "components_shared_geo_points"
  info: {
    displayName: "Geo point"
    icon: "pinMap"
  }
  attributes: {
    latitude: Schema.Attribute.Decimal
    longitude: Schema.Attribute.Decimal
  }
}

export interface UtilitiesAccordions extends Struct.ComponentSchema {
  collectionName: "components_utilities_accordions"
  info: {
    description: ""
    displayName: "Accordions"
  }
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required
    question: Schema.Attribute.String & Schema.Attribute.Required
  }
}

export interface UtilitiesBasicImage extends Struct.ComponentSchema {
  collectionName: "components_utilities_basic_images"
  info: {
    displayName: "BasicImage"
  }
  attributes: {
    alt: Schema.Attribute.String
    fallbackSrc: Schema.Attribute.String
    height: Schema.Attribute.Integer
    media: Schema.Attribute.Media<"images" | "videos"> &
      Schema.Attribute.Required
    width: Schema.Attribute.Integer
  }
}

export interface UtilitiesImageWithLink extends Struct.ComponentSchema {
  collectionName: "components_utilities_image_with_links"
  info: {
    description: ""
    displayName: "ImageWithLink"
  }
  attributes: {
    image: Schema.Attribute.Component<"utilities.basic-image", false>
    link: Schema.Attribute.Component<"utilities.link", false>
  }
}

export interface UtilitiesLink extends Struct.ComponentSchema {
  collectionName: "components_utilities_links"
  info: {
    displayName: "Link"
  }
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required
    label: Schema.Attribute.String & Schema.Attribute.Required
    newTab: Schema.Attribute.Boolean
  }
}

export interface UtilitiesLinksWithTitle extends Struct.ComponentSchema {
  collectionName: "components_utilities_links_with_titles"
  info: {
    displayName: "LinksWithTitle"
  }
  attributes: {
    links: Schema.Attribute.Component<"utilities.link", true>
    title: Schema.Attribute.String
  }
}

export interface UtilitiesText extends Struct.ComponentSchema {
  collectionName: "components_utilities_texts"
  info: {
    displayName: "Text"
  }
  attributes: {
    text: Schema.Attribute.String
  }
}

declare module "@strapi/strapi" {
  export module Public {
    export interface ComponentSchemas {
      "common.link": CommonLink
      "common.remarkable-fact": CommonRemarkableFact
      "common.video": CommonVideo
      "creative-works.cast": CreativeWorksCast
      "creative-works.credit": CreativeWorksCredit
      "creative-works.distinction": CreativeWorksDistinction
      "creative-works.external-ids": CreativeWorksExternalIds
      "creative-works.theatre-details": CreativeWorksTheatreDetails
      "entity-properties.property-value": EntityPropertiesPropertyValue
      "seo-utilities.meta-social": SeoUtilitiesMetaSocial
      "seo-utilities.seo": SeoUtilitiesSeo
      "seo-utilities.seo-og": SeoUtilitiesSeoOg
      "seo-utilities.seo-twitter": SeoUtilitiesSeoTwitter
      "seo-utilities.social-icons": SeoUtilitiesSocialIcons
      "shared.geo-point": SharedGeoPoint
      "utilities.accordions": UtilitiesAccordions
      "utilities.basic-image": UtilitiesBasicImage
      "utilities.image-with-link": UtilitiesImageWithLink
      "utilities.link": UtilitiesLink
      "utilities.links-with-title": UtilitiesLinksWithTitle
      "utilities.text": UtilitiesText
    }
  }
}
