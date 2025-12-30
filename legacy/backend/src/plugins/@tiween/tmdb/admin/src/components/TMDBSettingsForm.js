import React from "react"
import { Box } from "@strapi/design-system/Box"
import { Button } from "@strapi/design-system/Button"
import { Field, FieldInput, FieldLabel } from "@strapi/design-system/Field"
import { Loader } from "@strapi/design-system/Loader"
import { Stack } from "@strapi/design-system/Stack"
import { useNotification } from "@strapi/helper-plugin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useFormik } from "formik"

import tmdbSettingsRequests from "../api/settings"

function TMDBSettingsForm() {
  const queryClient = useQueryClient()
  // TODO handle errors
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tmdb-settings"],
    queryFn: tmdbSettingsRequests.getSettings,
  })
  const mutation = useMutation({
    mutationFn: tmdbSettingsRequests.setSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tmdb-settings"] })
    },
  })
  const toggleNotification = useNotification()
  const initialValues = {
    apiKey: "",
    apiBaseUrl: "",
    imageBaseUrl: "",
    ...data,
  }
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values) => {
      mutation.mutate(values)
      toggleNotification({
        type: "success",
        message: "Settings successfully updated",
      })
    },
  })
  const { values, setFieldValue, isSubmitting, handleSubmit } = formik

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      {isLoading ? (
        <Loader />
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Field name="apiKey">
              <Stack spacing={1}>
                <FieldLabel>API Key</FieldLabel>
                <FieldInput
                  type="text"
                  value={values.apiKey}
                  onChange={(event) => {
                    console.log("value changed", event.target.value)
                    setFieldValue("apiKey", event.target.value)
                  }}
                />
              </Stack>
            </Field>
            <Field name="apiBaseUrl">
              <Stack spacing={1}>
                <FieldLabel>API Base URL</FieldLabel>
                <FieldInput
                  type="text"
                  value={values.apiBaseUrl}
                  onChange={(event) => {
                    setFieldValue("apiBaseUrl", event.target.value)
                  }}
                />
              </Stack>
            </Field>
            <Field name="imageBaseUrl">
              <Stack spacing={1}>
                <FieldLabel>Image Base URL</FieldLabel>
                <FieldInput
                  type="text"
                  value={values.imageBaseUrl}
                  onChange={(event) => {
                    setFieldValue("imageBaseUrl", event.target.value)
                  }}
                />
              </Stack>
            </Field>
            <Box>
              <Button
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Save
              </Button>
            </Box>
          </Stack>
        </form>
      )}
    </Box>
  )
}

export default TMDBSettingsForm
