import React from "react"
import { Box } from "@strapi/design-system/Box"
import { Button } from "@strapi/design-system/Button"
import { Typography } from "@strapi/design-system/Typography"
import PropTypes from "prop-types"
import { FormattedMessage } from "react-intl"

import pluginId from "../pluginId"
import { FormButtons } from "./styles"

const ShowtimeSettingsFooter = ({ onClosed }) => {
  return (
    <FormButtons>
      <Button onClick={onClosed} color="cancel">
        Annuler
      </Button>
      <Button type="submit" color="success">
        Enregistrer
      </Button>
    </FormButtons>
  )
}
ShowtimeSettingsFooter.propTypes = {
  onClosed: PropTypes.func.isRequired,
}

export default ShowtimeSettingsFooter
