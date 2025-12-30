import React, { useReducer } from "react"
import { NextPage } from "next"
/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import get from "lodash/get"
import isEmpty from "lodash/isEmpty"
import { getCsrfToken, getProviders, getSession, signIn } from "next-auth/react"

import AuthPagesContainer from "../../components/Auth/AuthPagesContainer"
import SigninSignupForm from "../../components/Auth/SigninSignupForm"
import Layout from "../../components/shared/Layout"

const reducer = (state, action): any => {
  switch (action.type) {
    case "success":
      return {
        step: "success",
        payload: action.payload,
      }
      break
    case "error":
      return {
        step: "error",
        payload: action.payload,
      }
      break
    default:
      return {
        step: "initial",
      }
  }
}
const SignupPage: NextPage = () => {
  const [state, dispatch] = useReducer(reducer, { step: "initial" })

  const registerNewUser = (values: any): any => {
    return axios
      .post(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/register`, values)
      .then(() => {
        dispatch({ type: "success", payload: values })
      })
      .catch((error) => {
        dispatch({
          type: "error",
          payload: get(error, ["response", "data", "messages"], []),
        })
      })
      .finally(() => {
        console.log("finally")
      })
  }

  return (
    <Layout>
      {state.step === "success" ? (
        <AuthPagesContainer
          title="Inscription réussie"
          subtitle={`un email a été envoyé à: ${state.payload.email}`}
        >
          <p className="leading-5 font-lato">
            Veuillez vous rendre dans votre boite mail et suivre les
            instructions pour confirmer votre inscription{" "}
          </p>
        </AuthPagesContainer>
      ) : (
        <AuthPagesContainer
          title="Inscrivez-vous en 2 clics"
          subtitle="Et rejoignez la communauté Tiween pour prolonger votre expérience Cinéma"
        >
          <div className="bg-bastille-light py-6 px-4 rounded w-full text-cinder">
            <SigninSignupForm type="signup" onSubmit={registerNewUser} />
            <div className="text-xs text-center">
              <span className="font-medium text-selago ">
                Déjà un compte ?&nbsp;
                <button
                  type="button"
                  className="underline hover:text-wild-strawberry-dark"
                  onClick={(e) => {
                    e.preventDefault()
                    signIn()
                  }}
                >
                  Connectez-vous
                </button>
              </span>
            </div>
          </div>
        </AuthPagesContainer>
      )}
    </Layout>
  )
}

SignupPage.getInitialProps = async (context) => {
  const { res, req } = context
  const session = await getSession({ req })

  const user = get(session, ["user"], null)

  if (!isEmpty(user)) {
    res.writeHead(302, { Location: "/" })
    res.end()
    return
  }
  return {
    session: undefined,
    providers: await getProviders(),
    csrfToken: await getCsrfToken(),
  }
}

export default SignupPage
