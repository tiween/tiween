import type { Schema, Struct } from '@strapi/strapi';

export interface CommonAward extends Struct.ComponentSchema {
  collectionName: 'components_common_awards';
  info: {
    description: '';
    displayName: 'award';
    icon: 'birthday-cake';
  };
  attributes: {
    name: Schema.Attribute.String;
    year: Schema.Attribute.Integer;
  };
}

export interface CommonHeroDisplay extends Struct.ComponentSchema {
  collectionName: 'components_common_hero_displays';
  info: {
    displayName: 'HeroDisplay';
    icon: 'star';
  };
  attributes: {
    body: Schema.Attribute.Text;
    displayOnHomePage: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    media: Schema.Attribute.Media<'images' | 'videos'> &
      Schema.Attribute.Required;
    subtitle: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface CommonHomePageDisplay extends Struct.ComponentSchema {
  collectionName: 'components_common_home_page_displays';
  info: {
    displayName: 'HomePageDisplay';
    icon: 'home';
  };
  attributes: {
    image: Schema.Attribute.Media<'images'>;
    subtitle: Schema.Attribute.String;
    text: Schema.Attribute.RichText;
    title: Schema.Attribute.String;
  };
}

export interface CommonLink extends Struct.ComponentSchema {
  collectionName: 'components_common_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    type: Schema.Attribute.Enumeration<
      ['facebook', 'instagram', 'youtube', 'twitter', 'website', 'phone']
    >;
    url: Schema.Attribute.String;
  };
}

export interface CommonRemarkableFacts extends Struct.ComponentSchema {
  collectionName: 'components_common_remarkable_facts';
  info: {
    description: '';
    displayName: 'RemarkableFact';
    icon: 'star';
  };
  attributes: {
    country: Schema.Attribute.Relation<'oneToOne', 'api::country.country'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    year: Schema.Attribute.Integer;
  };
}

export interface CommonVideo extends Struct.ComponentSchema {
  collectionName: 'components_common_videos';
  info: {
    displayName: 'Video';
    icon: 'file-video';
  };
  attributes: {
    type: Schema.Attribute.Enumeration<['FULL_LENGTH', 'TEASER', 'CLIP']> &
      Schema.Attribute.DefaultTo<'TEASER'>;
    url: Schema.Attribute.String;
  };
}

export interface CreativeWorksCast extends Struct.ComponentSchema {
  collectionName: 'components_creative_works_casts';
  info: {
    description: '';
    displayName: 'Cast';
    icon: 'user-circle';
  };
  attributes: {
    character: Schema.Attribute.String;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
  };
}

export interface CreativeWorksCredit extends Struct.ComponentSchema {
  collectionName: 'components_creative_works_credits';
  info: {
    description: '';
    displayName: 'Credit';
    icon: 'user-tie';
  };
  attributes: {
    job: Schema.Attribute.Relation<'oneToOne', 'api::job.job'>;
    person: Schema.Attribute.Relation<'oneToOne', 'api::person.person'>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'common.award': CommonAward;
      'common.hero-display': CommonHeroDisplay;
      'common.home-page-display': CommonHomePageDisplay;
      'common.link': CommonLink;
      'common.remarkable-facts': CommonRemarkableFacts;
      'common.video': CommonVideo;
      'creative-works.cast': CreativeWorksCast;
      'creative-works.credit': CreativeWorksCredit;
    }
  }
}
