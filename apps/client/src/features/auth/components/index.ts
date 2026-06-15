// Login Form
export { LoginForm, loginSchema } from "./LoginForm"
export type {
  LoginFormProps,
  LoginFormLabels,
  LoginFormData,
} from "./LoginForm"

// Register Form
export {
  RegisterForm,
  PasswordStrengthIndicator,
  registerSchema,
  getPasswordStrength,
} from "./RegisterForm"
export type {
  RegisterFormProps,
  RegisterFormLabels,
  RegisterFormData,
  PasswordStrength,
  PasswordStrengthIndicatorProps,
  PasswordStrengthLabels,
} from "./RegisterForm"

// Profile Form
export { ProfileForm, AvatarUpload } from "./ProfileForm"
export type {
  ProfileFormProps,
  ProfileFormLabels,
  ProfileFormData,
  Language,
  Region,
  AvatarUploadProps,
  AvatarUploadLabels,
} from "./ProfileForm"

// Social Login
export { SocialLogin } from "./SocialLogin"
export type { SocialLoginProps, SocialLoginLabels } from "./SocialLogin"
