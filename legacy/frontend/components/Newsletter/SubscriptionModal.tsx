import React, { useState } from 'react';
import Modal from '../shared/Modal';
import Subscription from './Subscription';

interface ISubscriptionModalProps {
  show: boolean;
}

const SubscriptionModal: React.FC<ISubscriptionModalProps> = ({ show = true }) => {
  const [showModal, setShowModal] = useState(show);
  return (
    <Modal
      handleClose={() => {
        setShowModal(false);
      }}
      show={showModal}
      style={{
        backgroundImage: `url(https://res.cloudinary.com/tiween/image/upload/b_rgb:000000,e_grayscale,o_13/v1631534602/3658604.jpg)`,
        backgroundSize: 'cover',
      }}
    >
      <Subscription />
    </Modal>
  );
};

export default React.memo(SubscriptionModal);
