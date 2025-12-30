import React from "react"
import { Badge } from "@strapi/design-system/Badge"
import { Flex } from "@strapi/design-system/Flex"
import { Stack } from "@strapi/design-system/Stack"
import { Typography } from "@strapi/design-system/Typography"
import { get, isEmpty } from "lodash"
import styled from "styled-components"

const posterBaseUrl = "https://image.tmdb.org/t/p/"
const noPoster =
  "https://res.cloudinary.com/tiween/image/upload/c_scale,q_auto,w_50/v1573680548/film-poster-placeholder.png"
const size = "w45"
const StyledTMDBMovieSelectorOption = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: flex-start;
  align-items: stretch;
  align-content: stretch;
  border-bottom: 1px solid #ddd;
  padding: 4px;
  img {
    margin-right: 10px;
    width: 45px;
  }
  .meta-wrapper {
    font-weight: 700;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    align-content: stretch;
  }
  &:hover {
    cursor: pointer;
    background-color: #eee;
  }
`

function TMDBMovieSelectorOption({ innerProps, isDisabled, data, ...rest }) {
  const posterPath = get(data, ["poster_path"], null)
  const label = get(data, ["label"], null)
  const year = data.release_date && data.release_date.slice(0, 4)
  const posterFullPath = isEmpty(posterPath)
    ? `${noPoster}`
    : `${posterBaseUrl}/${size}${posterPath}`

  if (!isDisabled) {
    return (
      <StyledTMDBMovieSelectorOption {...innerProps}>
        <Flex gap={1} alignItems="start">
          <img src={posterFullPath} alt={label} />
          <Stack spacing={2}>
            <Stack horizontal spacing={1}>
              {year && <Badge active>{year}</Badge>}
              <Typography variant="pi" fontWeight="bold">
                {data.title}
              </Typography>
            </Stack>
            {data.original_title && data.title !== data.original_title && (
              <Typography variant="pi">{data.original_title}</Typography>
            )}
          </Stack>
        </Flex>
      </StyledTMDBMovieSelectorOption>
    )
  }

  return ""
}

export default TMDBMovieSelectorOption
