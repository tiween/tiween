'use strict';

/**
 * creative-work service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::creative-work.creative-work', ({ strapi }) => ({
    indexShortMovie: (sm) => {
        const shortMovieToIndex = strapi.services['creative-work'].getIndexableShortMovie(sm);
        const { locale } = shortMovieToIndex;

        strapi.services.algolia.saveObject(shortMovieToIndex, `short-movies-${locale}`);

    },
    getIndexableShortMovie: (cw) => {
        const { id, original_title, title, poster, production_countries, cast, crew, terms, slug, about, runtime, locale, photos } = cw;
        let actors = [];
        const cover = photos[0] || null;
        // const actorsRaw = get(credits, 'cast', []);
        //st directors = getDirectors(credits);

        // if (actorsRaw.length > 0) {
        //   actors = actorsRaw.slice(0, 10).map((a) => a.name);
        // }

        return {
            objectID: id,
            original_title,
            poster,
            title,
            actors,
            terms,
            about,
            slug,
            runtime,
            cover,
            countries: production_countries,
            locale,
        };
    }
}

));
