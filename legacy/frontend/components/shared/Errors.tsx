import XCircleIcon from '@heroicons/react/solid/XCircleIcon';
import * as React from 'react';
import errorsMap from '../../shared/constants/errors-map';

interface IErrorsProps {
  errors: Array<{ id: string; message: string }>;
}

const Errors: React.FunctionComponent<IErrorsProps> = ({ errors }) => {
  console.log('Errors', errors);
  return (
    <div className="rounded-md bg-red-50 p-4 mb-3">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            Il y&apos; a {errors?.length} erreur(s) dans le formulaire
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">
              {errors?.map((error) => (
                <li key={error.id}>{errorsMap[error.id]}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Errors;
