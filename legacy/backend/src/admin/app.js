import AuthLogo from "./extensions/auth-logo.png"
import MenuLogo from "./extensions/menu-logo.png"

export default {
  config: {
    locales: ["fr"],
    tutorials: false,
    // theme: lightTheme,
    auth: {
      logo: AuthLogo,
    },
    translations: {
      en: {
        "Auth.form.welcome.title": "tiween's dashboard",
        "Auth.form.welcome.subtitle": "login to your tiween account",
      },
    },
    // menu: {
    //   logo: MenuLogo,
    // },
  },
}
