/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { GetServerSideProps } from "next"
import slugify from "slugify"

import CreativeWork from "../shared/models/creative-work"
import { TMDBMovie } from "../shared/models/tmdb-movie"
import fetcher from "../shared/services/fetcher"

const staticPages = ["/contact", "/"]
// todo fix creating sitemap
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=1800, stale-while-revalidate=300"
  )

  const movies = (await fetcher("/api/nowplaying")) as TMDBMovie[]
  const shortMovies = (await fetcher("/api/short-movies")) as CreativeWork[]
  const eventGroups = (await fetcher("/api/event-groups/upcoming")) as any
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map((url) => {
          return `
            <url>
              <loc>${process.env.NEXT_PUBLIC_BASE_URL}${url}</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>monthly</changefreq>
              <priority>1.0</priority>
            </url>
          `
        })
        .join("")}
        ${movies
          ?.map((movie) => {
            return `
            <url>
              <loc>${process.env.NEXT_PUBLIC_BASE_URL}/film/${slugify(
                movie.title,
                {
                  lower: true,
                  strict: true,
                }
              )}/${movie.id}</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>hourly</changefreq>
              <priority>1.0</priority>
            </url>
          `
          })
          .join("")}
        ${shortMovies
          ?.map((shortMovie) => {
            return `
            <url>
              <loc>${process.env.NEXT_PUBLIC_BASE_URL}/court-metrage/${slugify(
                shortMovie.title,
                {
                  lower: true,
                  strict: true,
                }
              )}</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>daily</changefreq>
              <priority>1.0</priority>
            </url>
          `
          })
          .join("")}
        ${eventGroups
          ?.map((eventGroup) => {
            return `
            <url>
              <loc>${process.env.NEXT_PUBLIC_BASE_URL}/event-group/${
                eventGroup?.attributes.title
              }</loc>
              <lastmod>${new Date().toISOString()}</lastmod>
              <changefreq>daily</changefreq>
              <priority>1.0</priority>
            </url>
          `
          })
          .join("")}
    </urlset>
  `

  res.setHeader("Content-Type", "text/xml")
  res.write(sitemap)
  res.end()

  return {
    props: {},
  }
}

const Sitemap = () => {}

export default Sitemap
