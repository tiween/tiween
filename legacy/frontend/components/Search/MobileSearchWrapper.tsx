import { Transition } from '@headlessui/react';
import ArrowLeftIcon from '@heroicons/react/solid/ArrowLeftIcon';
import XIcon from '@heroicons/react/solid/XIcon';
import * as React from 'react';
import Autocomplete from './Autocomplete';

interface IMobileSearchWrapperProps {
  show: boolean;
  handleAction: (action) => void;
}

const MobileSearchWrapper: React.FunctionComponent<IMobileSearchWrapperProps> = ({
  show = false,
  handleAction,
}) => {
  return (
    <Transition
      show={show}
      enter="transition-opacity duration-75"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-75"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="mobile-search-wrapper h-screen bg-cinder  w-full z-50 absolute top-0 left-0 p-6 ">
        <div className="fixed  inset-x-6 h-10  z-50 bg-cinder">
          <div className="flex justify-between items-center">
            <button
              className="flex justify-end mb-5"
              onClick={() => {
                handleAction({ type: 'search.close' });
              }}
            >
              <ArrowLeftIcon className="text-selago w-5" />
            </button>
            <button
              className="flex justify-end mb-5"
              onClick={() => {
                handleAction({ type: 'search.close' });
              }}
            >
              <XIcon className="text-selago w-5" />
            </button>
          </div>
        </div>
        <div className="">
          <Autocomplete />
        </div>
      </div>
    </Transition>
  );
};

export default MobileSearchWrapper;
