import React from "react"
import { Badge } from "@strapi/design-system/Badge"
import { Box } from "@strapi/design-system/Box"
import { Flex } from "@strapi/design-system/Flex"
import {
  RadioGroup as BaseRadioGroup,
  Radio,
} from "@strapi/design-system/Radio"
import { Stack } from "@strapi/design-system/Stack"
import { Switch } from "@strapi/design-system/Switch"
import { Typography } from "@strapi/design-system/Typography"
import { useFormikContext } from "formik"
import get from "lodash/get"
import trim from "lodash/trim"
import PropTypes from "prop-types"
import styled from "styled-components"

import { SHOWTIME_TYPES } from "../constants"
import CreativeWorkSelector from "./CreativeWorkSelector"
import TMDBMovieSelector from "./TMDBMovieSelector"

const RadioGroup = styled(BaseRadioGroup)`
  z-index: 0;
`
const ShowtimeForm = ({ schema, type, index, children }) => {
  const { values, setFieldValue, errors } = useFormikContext()
  const language = get(schema, ["attributes", "language"], {})
  const videoFormats = get(schema, ["attributes", "video_format"], {})
  const key = "showtimes"
  console.log("errors", errors)
  console.log("values", values)
  return (
    <div className="w-100">
      <Box shadow="filterShadow" padding={5} hasRadius>
        <Stack spacing={6}>
          <Box>
            <Badge>{SHOWTIME_TYPES[type]}</Badge>
          </Box>
          <Box>
            {type === SHOWTIME_TYPES.MOVIE && (
              <div>
                <label message="Film" htmlFor={`showtimes.${index}.tmdbid`} />
                <TMDBMovieSelector
                  id={`showtimes.${index}.tmdbid`}
                  onSelectMovie={(selectedMovie) => {
                    setFieldValue(
                      `showtimes.${index}.tmdbid`,
                      selectedMovie.value
                    )
                  }}
                />
                {get(errors, [key, index], null) && (
                  <Typography>
                    {get(errors, [key, index, "tmbdid"], "")}
                  </Typography>
                )}
              </div>
            )}
            {type !== SHOWTIME_TYPES.MOVIE && (
              <div>
                {/* <Label message={type} htmlFor={`showtimes.${index}.creative_work`} /> */}
                <CreativeWorkSelector
                  id={`showtimes.${index}.creative_work`}
                  onSelectCreativeWork={(selectedCreativeWork) => {
                    setFieldValue(
                      `showtimes.${index}.creative_work`,
                      selectedCreativeWork.value
                    )
                  }}
                />
                {get(errors, [key, index], null) && (
                  <Typography>
                    {get(errors, [key, index, "creative_work"], "")}
                  </Typography>
                )}
              </div>
            )}
          </Box>
          <Flex justifyContent="space-between" alignItems="center">
            {/* Language Selector */}
            <Stack spacing={1}>
              <Typography variant="delta" id="language">
                Langue
              </Typography>
              <RadioGroup
                labelledBy="language"
                onChange={(e) =>
                  setFieldValue(`showtimes.${index}.language`, e.target.value)
                }
                value={get(
                  values,
                  `showtimes.${index}.language`,
                  language.default
                )}
                name={`showtimes.${index}.language`}
              >
                <Stack horizontal spacing={2}>
                  {language.enum.map((i) =>
                    i == language.default ? (
                      <Radio
                        id="radio-tab"
                        key={`showtimes.${index}.language.${i}`}
                        value={i}
                        defaultChecked
                      >
                        {trim(i, "_").toUpperCase()}
                      </Radio>
                    ) : (
                      <Radio
                        id="radio-tab"
                        key={`showtimes.${index}.language.${i}`}
                        value={i}
                      >
                        {trim(i, "_").toUpperCase()}
                      </Radio>
                    )
                  )}
                </Stack>
              </RadioGroup>
            </Stack>

            {type === SHOWTIME_TYPES.MOVIE && (
              <Stack spacing={1}>
                <Typography variant="delta" id="video-format">
                  Format
                </Typography>
                <RadioGroup
                  labelledBy="video-format"
                  onChange={(e) =>
                    setFieldValue(
                      `showtimes.${index}.video_format`,
                      e.target.value
                    )
                  }
                  value={get(
                    values,
                    `showtimes.${index}.video_format`,
                    videoFormats.default
                  )}
                  name={`showtimes.${index}.video_format`}
                >
                  <Stack horizontal spacing={2}>
                    {videoFormats.enum.map((i) =>
                      i == videoFormats.default ? (
                        <Radio
                          key={`showtimes.${index}.video_format.${i}`}
                          value={i}
                          defaultChecked
                        >
                          {trim(i, "_").toUpperCase()}
                        </Radio>
                      ) : (
                        <Radio
                          key={`showtimes.${index}.video_format.${i}`}
                          value={i}
                        >
                          {trim(i, "_").toUpperCase()}
                        </Radio>
                      )
                    )}
                  </Stack>
                </RadioGroup>
              </Stack>
            )}
            <Stack spacing={1}>
              <Typography variant="delta">Avant-première</Typography>
              <div>
                <Switch
                  label="Avant-première"
                  selected={get(values, `showtimes.${index}.premiere`, false)}
                  onChange={() => {
                    setFieldValue(
                      `showtimes.${index}.premiere`,
                      !get(values, `showtimes.${index}.premiere`, false)
                    )
                  }}
                  visibleLabels
                />
              </div>
            </Stack>
          </Flex>
          <Flex justifyContent="end">{children}</Flex>
        </Stack>
      </Box>
    </div>
  )
}
ShowtimeForm.propTypes = {
  schema: PropTypes.object,
  index: PropTypes.number,
  children: PropTypes.node,
  type: PropTypes.oneOf([
    SHOWTIME_TYPES.MOVIE,
    SHOWTIME_TYPES.PLAY,
    SHOWTIME_TYPES.SHORT_MOVIE,
  ]),
}

export default ShowtimeForm
