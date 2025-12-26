/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Listbox } from '@headlessui/react';
import ChevronDownIcon from '@heroicons/react/solid/ChevronDownIcon';
import CheckIcon from '@heroicons/react/solid/CheckIcon';
import { connectMenu } from 'react-instantsearch-dom';
import classNames from 'classnames';
const MenuSelect = ({ items, currentRefinement, refine }) => {
  return (
    <Listbox as="div" className="relative" value={currentRefinement || ''} onChange={refine}>
      <Listbox.Button className="flex space-x-3 justify-around items-center">
        {currentRefinement?.label || 'Genres'}
        <ChevronDownIcon className="w-5 h-5" />
      </Listbox.Button>
      <Listbox.Options className="absolute p-px bg-gradient-to-r from-amaranth via-wild-strawberry to-gold z-50">
        <div className="px-8 py-4 bg-bastille">
          {items.map((item) => (
            <Listbox.Option
              className={() => {
                return classNames('capitalize text-sm font-lato font-normal relative');
              }}
              key={item.label}
              value={item.value}
            >
              {({ selected, active }) => {
                return (
                  <>
                    <span
                      className={classNames(
                        selected ? 'font-semibold' : 'font-normal',
                        'block truncate',
                      )}
                    >
                      {item.label}
                    </span>
                    {selected ? (
                      <span
                        className={classNames(
                          active ? 'text-white' : 'text-indigo-600',
                          'absolute inset-y-0 right-0 flex items-center pr-4',
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                );
              }}
            </Listbox.Option>
          ))}
        </div>
      </Listbox.Options>
    </Listbox>
  );
};

export default connectMenu(MenuSelect);
