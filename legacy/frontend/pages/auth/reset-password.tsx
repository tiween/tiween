import React, { useReducer } from "react"
import Link from "next/link"
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import { useFormik } from "formik"

import AuthPagesContainer from "../../components/Auth/AuthPagesContainer"
import Emoji from "../../components/shared/Emoji"
import Layout from "../../components/shared/Layout"
import { ForgotPasswordSchema } from "../../shared/schemas/auth-schemas"

const reducer = (state, action): any => {
  switch (action.type) {
    case "success":
      return {
        step: "success",
      }
      break
    case "error":
      return {
        step: "error",
      }
      break
    default:
      return {
        step: "initial",
      }
  }
}
const ResetPasswordPage: React.FunctionComponent = () => {
  const [state, dispatch] = useReducer(reducer, { step: "initial" })

  const formik = useFormik({
    initialValues: {
      password: "",
      email: "",
    },
    validationSchema: ForgotPasswordSchema,
    onSubmit: (values) => {
      return axios
        .post(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`, values)
        .then((response) => {
          console.log("response", response)
          dispatch({ type: "success" })
        })
        .catch((error) => {
          dispatch({ type: "error", payload: error.messages })
        })
    },
  })
  const { isSubmitting, values, handleSubmit, getFieldProps } = formik
  return (
    <Layout>
      {state.step === "success" ? (
        <AuthPagesContainer
          title="Email Envoyé?"
          subtitle={`un email a été envoyé à: ${values.email}`}
        >
          <p className="leading-5 font-lato">
            Veuillez vous rendre dans votre boite mail et suivre les
            instructions pour réinitialiser votre mot de passe !
          </p>
        </AuthPagesContainer>
      ) : state.step === "error" ? (
        <AuthPagesContainer
          title="Oops?"
          subtitle={
            <span>
              nous ne trouvons aucun compte avec cet email: {values.email}
              <Emoji symbol="☹️" />
            </span>
          }
        >
          <p className="leading-5 font-lato text-center">
            Verifiez que vous avez bien ecris votre adresse email.
          </p>

          <div className="text-xs text-center mt-2">
            <span className="font-medium text-selago t ">
              Vous pouvez aussi
              <Link href="/auth/signup" passHref>
                <a className="underline hover:text-wild-strawberry-dark ml-1">
                  vous inscrire ici
                </a>
              </Link>
            </span>
          </div>
        </AuthPagesContainer>
      ) : (
        <AuthPagesContainer
          title="Mot de passe oublié?"
          subtitle="Entrez votre email ci-dessous et nous vous enverrons un lien pour réinitialiser votre mot
          de passe"
        >
          <div className="bg-bastille-light py-6 px-4 rounded w-full text-cinder">
            <form
              className=""
              data-testid="AccountFormSignin"
              onSubmit={handleSubmit}
              method="post"
            >
              <div className="">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-selago"
                >
                  Email
                </label>
                <div className="mt-1">
                  <input
                    {...getFieldProps("email")}
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-wild-strawberry-dark focus:border-wild-strawberry-dark sm-text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col ">
                <button
                  type="submit"
                  className=" py-2 px-4 font-bold text-selago font-lato text-xs uppercase text-center rounded-sm    bg-wild-strawberry my-3 flex justify-center items-center"
                >
                  {isSubmitting && (
                    <div
                      style={{ borderTopColor: "transparent" }}
                      className=" w-4 h-4 border-2 border-selago rounded-full animate-spin mr-2"
                    />
                  )}
                  {isSubmitting ? "Traitement en cours" : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </AuthPagesContainer>
      )}
    </Layout>
  )
}

export default ResetPasswordPage
