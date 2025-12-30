import * as React from "react"
import { useRouter } from "next/router"
import { Menu } from "@headlessui/react"
import ChevronDownIcon from "@heroicons/react/solid/ChevronDownIcon"
import classNames from "classnames"

const localeSettings = {
  "fr-FR": {
    label: "Français",
    flag: "🇫🇷",
  },
  "ar-TN": {
    label: "عربية",
    flag: "🇹🇳",
  },
}
const LanguageSwitcher: React.FunctionComponent = () => {
  const { locales, locale, push, asPath } = useRouter()

  return (
    <Menu
      as="div"
      className="flex flex-col relative items-center  justify-between py-0"
    >
      <Menu.Button className="flex justify-around items-center h-full space-x-3">
        {localeSettings[locale].label}
        <ChevronDownIcon className="w-5 h-5" />
      </Menu.Button>
      <Menu.Items className="flex flex-col absolute top-5 z-50 ">
        {locales.map((l) => (
          <Menu.Item key={l}>
            {({ active }) => (
              <button
                className={classNames("", {
                  "bg-blue-500": active,
                })}
                onClick={() => {
                  push(asPath, asPath, { locale: l })
                }}
              >
                {localeSettings[l].label}
                <span role="img">{localeSettings[l].flag}</span>
              </button>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  )
}

export default LanguageSwitcher
