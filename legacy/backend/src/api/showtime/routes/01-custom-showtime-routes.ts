module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/showtimes/movies/upcoming', 
      handler: 'showtime.upcomingMovies',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/showtimes/movie-timetable/:tmdbid', 
      handler: 'showtime.movieTimetable',
      config: {
        auth: false,
      },
    }
  ]
}
