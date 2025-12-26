module.exports = [
  {
    method: 'GET',
    path: '/mediums/autocomplete',
    handler: 'eventsManagerController.mediumsAutoComplete',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/events',
    handler: 'eventsManagerController.findEvents',
    config: {
      policies: [],
    },
  },
  {
    method: 'GET',
    path: '/event-group/autocomplete',
    handler: 'eventsManagerController.eventGroupsAutoComplete',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/calendar/upcoming',
    handler: 'eventsManagerController.upcomingEvents',
    config: {
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/events',
    handler: 'eventsManagerController.createEvent',
    config: {
      policies: [],
    },
  },
  {
    method: 'DELETE',
    path: '/events/:id',
    handler: 'eventsManagerController.deleteEvent',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
