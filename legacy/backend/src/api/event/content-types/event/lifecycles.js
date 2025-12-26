module.exports = {

  async beforeDelete(event) {
    //DELETE all showtime releated to this event
    
    const { data, where, select, populate } = event.params;
    try {
      
      if (where && where.id) {
        const showtimesToDelete = await strapi.entityService.findMany('api::showtime.showtime', {
          fields: ['id'],
          filters: {
            event: {
              id: where.id
            }
          },
        });

        const showtimeIdsToDelete = showtimesToDelete.map(item => item.id);

        if (showtimeIdsToDelete.length>0){
          const deletedItems = await strapi.db.query('api::showtime.showtime').deleteMany({
            where: {
              id: {
                $in: showtimeIdsToDelete,
              },
            },
          });
        }
      }

    } catch (e) {
      console.log("ERROR - e ", e);
    }
  },

};
