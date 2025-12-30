import React from "react"
import { Switch } from "@headlessui/react"
import CalendarIcon from "@heroicons/react/outline/CalendarIcon"
import PlusCircleIcon from "@heroicons/react/solid/PlusCircleIcon"
import classNames from "classnames"
import { Form, Formik } from "formik"
import * as Yup from "yup"

const AgendaSchema = Yup.object().shape({
  name: Yup.string().required("Choisissez un nom pour votre agenda"),
})

interface Values {
  name: string
  public: boolean
}

const AgendaForm: React.FunctionComponent<{
  handleSubmit: (values: Values) => void
}> = ({ handleSubmit }) => {
  return (
    <div className="py-3 px-4 rounded-t-md border-b border-gray-800">
      <Formik
        initialValues={{
          name: "",
          public: false,
        }}
        validationSchema={AgendaSchema}
        onSubmit={(values: Values, { resetForm }) => {
          resetForm()
          return handleSubmit(values)
        }}
      >
        {({ values, setFieldValue, getFieldProps, isSubmitting, errors }) => {
          return (
            <Form className="flex flex-col space-y-2">
              <label
                htmlFor="email"
                className="block text-md  text-selago font-semibold"
              >
                Créez un Agenda
              </label>
              <div
                className={classNames(
                  "mt-1 flex border  rounded-md",
                  errors["name"] ? "border-amaranth" : "border-gray-600",
                  {}
                )}
              >
                <div className="relative flex items-stretch flex-grow focus-within:z-10">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon
                      className="h-5 w-5 text-gray-700"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    type="text"
                    {...getFieldProps("name")}
                    className="focus:outline-none focus:border-gray-500 block w-full rounded-none rounded-l-md pl-10 sm:text-sm border-gray-600 bg-cinder placeholder-gray-700"
                    placeholder="Ma Séléction des JCC 2021"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  className="-ml-px relative inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-r-md text-gray-300  hover:text-wild-strawberry-dark focus:outline-none"
                >
                  <div className="relative">
                    {isSubmitting && (
                      <div
                        style={{ borderTopColor: "transparent" }}
                        className="absolute inset-0 w-5 h-5 border-2 border-wild-strawberry-dark rounded-full animate-spin"
                      ></div>
                    )}

                    <PlusCircleIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </div>
              {errors["name"] && (
                <span className="text-amaranth text-xs font-semibold">
                  {errors["name"]}
                </span>
              )}
              <Switch.Group
                as="div"
                className="flex items-start justify-between"
              >
                <span className="flex-grow flex flex-col justify-between">
                  <Switch.Label
                    as="span"
                    className="text-sm font-semibold text-gray-300"
                    passive
                  >
                    Public
                  </Switch.Label>
                  <Switch.Description
                    as="span"
                    className="text-xs text-gray-400"
                  >
                    Votre agenda est privé, rendez-le public pour le partager
                    avec vos amis !
                  </Switch.Description>
                </span>
                <Switch
                  checked={values["public"]}
                  onChange={(value) => {
                    setFieldValue("public", value)
                  }}
                  className={classNames(
                    values["public"] ? "bg-mulled-wine" : "bg-mulled-wine",
                    "relative inline-flex flex-shrink-0 h-4 w-9 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-0 "
                  )}
                >
                  <span
                    className={classNames(
                      values["public"] ? "translate-x-5" : "translate-x-0",
                      "pointer-events-none relative inline-block h-3 w-3 rounded-full bg-bastille shadow transform ring-0 transition ease-in-out duration-200"
                    )}
                  >
                    <span
                      className={classNames(
                        values["public"]
                          ? "opacity-0 ease-out duration-100"
                          : "opacity-100 ease-in duration-200",
                        "absolute inset-0 h-full w-full flex items-center justify-center transition-opacity"
                      )}
                      aria-hidden="true"
                    >
                      <svg
                        className="h-2 w-2 text-gray-600"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span
                      className={classNames(
                        values["public"]
                          ? "opacity-100 ease-in duration-200"
                          : "opacity-0 ease-out duration-100",
                        "absolute inset-0 h-full w-full flex items-center justify-center transition-opacity"
                      )}
                      aria-hidden="true"
                    >
                      <svg
                        className="h-3 w-3 text-wild-strawberry-dark"
                        fill="currentColor"
                        viewBox="0 0 12 12"
                      >
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                      </svg>
                    </span>
                  </span>
                </Switch>
              </Switch.Group>
            </Form>
          )
        }}
      </Formik>
    </div>
  )
}

export default React.memo(AgendaForm)
