import { Button } from '@strapi/design-system/Button';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { FormButtons } from './styles';
import { Typography } from '@strapi/design-system/Typography';
import pluginId from '../pluginId';
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
  );
};
ShowtimeSettingsFooter.propTypes = {
  onClosed: PropTypes.func.isRequired,
};

export default ShowtimeSettingsFooter;
