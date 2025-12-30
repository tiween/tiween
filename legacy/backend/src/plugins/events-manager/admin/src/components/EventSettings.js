import React, { Suspense, useEffect, useMemo, useState } from "react"
import { Alert } from "@strapi/design-system/Alert"
import { Box } from "@strapi/design-system/Box"
import { Button } from "@strapi/design-system/Button"
import { Loader } from "@strapi/design-system/Loader"
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
} from "@strapi/design-system/ModalLayout"
import { Stack } from "@strapi/design-system/Stack"
import { Typography } from "@strapi/design-system/Typography"
import { request } from "@strapi/helper-plugin"
import { FieldArray, Form, Formik } from "formik"
import { identity, keyBy, map, mapValues, pickBy } from "lodash"
import get from "lodash/get"
import { DateTime } from "luxon"
import PropTypes from "prop-types"
import { BsXOctagonFill } from "react-icons/bs"

import { EventFormSchema } from "../../../utils/validators"
import { SHOWTIME_TYPES } from "../constants"
import ShowtimeForm from "./ShowtimeForm"

const showtimeSettingsTitle = ({ start, mediumName, eventGroupName }) => {
  const mediumTag = ` -- ${mediumName} ${eventGroupName ? eventGroupName : ""}`
  const date = DateTime.fromISO(start)

  // eslint-disable-next-line quotes
  return `Séance du ${date.toFormat("EEEE dd MMM y à HH'h'mm", { locale: "fr" })} ${mediumTag}`
}

const ShowtimeTypeButtons = React.lazy(() => import("./ShowtimeTypeButtons"))
const EventSettings = ({
  start,
  isOpen,
  onClosed,
  onToggle,
  medium,
  eventGroup,
}) => {
  const mediumName = get(medium, "label", "")
  const eventGroupName = get(eventGroup, "label", "")
  const [eventContentType, setEventContentType] = useState(null)
  const [showtimeContentSchema, setShowtimeContentSchema] = useState(null)
  // show informative alert state
  const [showAlert, setShowAlert] = useState(false)
  const [showFormValidationErrors, setShowFormValidationErrors] =
    useState(false)

  useEffect(() => {
    const fetchEventContentType = async () => {
      try {
        const { data } = await request(
          "/content-manager/content-types/api::event.event/configuration"
        )

        setEventContentType(data.contentType)
      } catch (error) {
        console.error(error)
      }
    }

    const getShowtimeContentSchema = async () => {
      // const contentTypesSettings = res
      try {
        const { data } = await request(
          "/content-type-builder/content-types/api::showtime.showtime"
        )

        setShowtimeContentSchema(data.schema)
      } catch (error) {
        console.error(error)
      }
    }
    fetchEventContentType()
    getShowtimeContentSchema()
  }, [])

  const initialFormValues = useMemo(() => {
    const metadatas = get(eventContentType, ["metadatas"], null)
    const fields = map(metadatas, (attribute, index) => {
      const defaultValue = get(
        eventContentType,
        ["schema", "attributes", index, "default"],
        ""
      )
      const field = Object.assign(attribute.edit, {
        default: defaultValue,
        fieldName: index,
      })

      return field
    }).filter((attribute) => {
      return (
        attribute.editable &&
        attribute.fieldName !== "createdAt" &&
        attribute.fieldName !== "updatedAt"
      )
    })
    return mapValues(keyBy(fields, "fieldName"), "default")
  }, [eventContentType])

  return (
    <>
      {isOpen && (
        <ModalLayout onClose={onClosed} labelledBy="title">
          <ModalHeader>
            <Typography
              fontWeight="bold"
              textColor="neutral800"
              as="h2"
              id="title"
            >
              {showtimeSettingsTitle({ start, mediumName, eventGroupName })}
            </Typography>
          </ModalHeader>
          <Formik
            initialValues={{
              ...initialFormValues,
              medium: get(medium, "value", ""),
              event_group: get(eventGroup, "value", ""),
              startDate: start ?? null,
              fullStartDate: start ?? null,
              recurring: false,
              recurringRule: "",
              showtimes: [
                {
                  type: SHOWTIME_TYPES.MOVIE,
                  language: get(showtimeContentSchema, [
                    "attributes",
                    "language",
                    "default",
                  ]),
                  video_format: get(showtimeContentSchema, [
                    "attributes",
                    "video_format",
                    "default",
                  ]),
                  premiere: get(
                    showtimeContentSchema,
                    ["attributes", "premiere", "default"],
                    false
                  ),
                },
              ],
            }}
            enableReinitialize
            validationSchema={EventFormSchema}
            onSubmit={(values) => {
              const cleanedValues = pickBy(values, identity)
              return request("/events-manager/events", {
                method: "POST",
                body: {
                  ...cleanedValues,
                },
              })
                .then(() => {
                  onClosed()
                })
                .catch((error) => {
                  // strapi.plugins.sentry.services.sentry.sendError(error);
                  strapi.notification.toggle({
                    type: "warning",
                    blockTransition: true,
                    message: error.message,
                  })
                })
            }}
          >
            {({ values, errors, dirty, isValid }) => {
              const canSubmit = dirty && isValid
              return (
                <Form>
                  {errors?.length > 0 && (
                    <Alert
                      closeLabel="Fermer"
                      title="Fonctionnalité desactivée"
                      onClose={() => {}}
                    >
                      Cette fonctionnalité a été desactivée intentionnelemment
                      en attendant de régler quelques bugs. Navré pour la gène
                      occasionnée.
                    </Alert>
                  )}
                  <ModalBody>
                    <Box>
                      <Suspense fallback={<Loader />}>
                        <div className="shadow-sm bg-white rounded py-3 px-4">
                          <FieldArray
                            name="showtimes"
                            render={(arrayHelpers) => (
                              <Stack spacing={2}>
                                {values.showtimes &&
                                  values.showtimes.length > 0 &&
                                  values.showtimes.map((showtime, index) => (
                                    <ShowtimeForm
                                      key={`showtime-form-${index}`}
                                      type={showtime.type}
                                      index={index}
                                      schema={showtimeContentSchema}
                                    >
                                      <Button
                                        onClick={() =>
                                          arrayHelpers.remove(index)
                                        }
                                        label="Remove"
                                        endIcon={<BsXOctagonFill />}
                                        variant="danger"
                                      >
                                        Supprimer
                                      </Button>
                                    </ShowtimeForm>
                                  ))}
                                <ShowtimeTypeButtons
                                  handleOnClick={(eventType) =>
                                    arrayHelpers.push({
                                      type: eventType,
                                      language: get(showtimeContentSchema, [
                                        "attributes",
                                        "language",
                                        "default",
                                      ]),
                                      video_format: get(showtimeContentSchema, [
                                        "attributes",
                                        "video_format",
                                        "default",
                                      ]),
                                      premiere: get(showtimeContentSchema, [
                                        "attributes",
                                        "premiere",
                                        "default",
                                      ]),
                                    })
                                  }
                                />
                              </Stack>
                            )}
                          />
                          {showAlert && (
                            <Stack spacing={1}>
                              <Typography variant="delta">
                                Récurrence (désactivée momentanément)
                              </Typography>
                              <Alert
                                closeLabel="Close alert"
                                title="Fonctionnalité desactivée"
                                onClose={() => {
                                  setShowAlert(false)
                                }}
                              >
                                Cette fonctionnalité a été desactivée
                                intentionnelemment en attendant de régler
                                quelques bugs. Navré pour la gène occasionnée.
                              </Alert>
                              {/* <Switch  label="recurring" selected={get(values, `recurring`, false)} onChange={() => { setFieldValue(`recurring`, !get(values, `recurring`, false)) }} visibleLabels /> */}
                            </Stack>
                          )}

                          {/* {values['recurring'] && (
                            <RecurrenceRuleGenerator
                                startDate={start}
                                onChange={(rrule) => {
                                  console.log('rrule', rrule);
                                  setFieldValue(`recurringRule`, rrule);

                                }}
                              />
                          )} */}
                        </div>
                      </Suspense>
                    </Box>
                  </ModalBody>
                  <ModalFooter
                    startActions={
                      <Button variant="tertiary" onClick={onClosed}>
                        Annuler
                      </Button>
                    }
                    endActions={
                      <>
                        <Button type="submit" disabled={!canSubmit}>
                          Enregistrer
                        </Button>
                      </>
                    }
                  />
                </Form>
              )
            }}
          </Formik>
        </ModalLayout>
      )}
    </>
  )
}

EventSettings.propTypes = {
  start: PropTypes.string,
  isOpen: PropTypes.bool,
  onClosed: PropTypes.func,
  onToggle: PropTypes.func,
  medium: PropTypes.shape({
    label: PropTypes.string,
    _id: PropTypes.string,
  }),
  eventGroup: PropTypes.shape({
    label: PropTypes.string,
    id: PropTypes.string,
  }),
}

export default EventSettings
