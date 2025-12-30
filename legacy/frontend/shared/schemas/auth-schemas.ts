import { object, string } from "yup"

export const ForgotPasswordSchema = object({
  email: string()
    .email("ceci n'est pas un email valide")
    .required("nous avons besoin d'une adresse email"),
})

export const SigninSchema = object({
  email: string()
    .email("ceci n'est pas un email valide")
    .required("nous avons besoin d'une adresse email"),
  password: string().required("mot de passe obligatoire"),
})
