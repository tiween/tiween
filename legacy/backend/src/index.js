'use strict';
const axios = require('axios');
const legacyApiBaseUrl = 'https://tiween-admin-production.herokuapp.com';


module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },
  async bootstrap(/*{ strapi }*/) {
    // run something before creating file
    strapi.db.lifecycles.subscribe({
      models: ['plugin::upload.file'],
      async beforeCreate(event) {
        const { data } = event.params
        const swatches = await strapi.services['api::shared.shared'].getImageSwatches(data.url);
        event.params.data.colors = swatches;
      }
    })
  },
};
