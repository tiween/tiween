import ExclamationCircleIcon from '@heroicons/react/solid/ExclamationCircleIcon';
import { Formik, FormikHelpers } from 'formik';
import React from 'react';
import * as Yup from 'yup';

interface Values {
  email: string;
}
const SubscriptionSchema = Yup.object().shape({
  email: Yup.string()
    .email("Nous avons besoin d'une adresse email valide pour vous écrire")
    .required('Nous avons besoin de votre email pour vous écrire'),
});

const SubscriptionForm: React.FunctionComponent = () => {
  return (
    <Formik
      initialValues={{ email: '' }}
      validationSchema={SubscriptionSchema}
      onSubmit={(values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        setTimeout(() => {
          alert(JSON.stringify(values, null, 2));
          setSubmitting(false);
        }, 400);
      }}
    >
      {({
        errors,
        handleSubmit,
        isSubmitting,
        getFieldProps,
        /* and other goodies */
      }) => (
        <form onSubmit={handleSubmit} className="">
          <div className="flex md:flex-col flex-row md:mb-3 ">
            <div className="flex md:flex-row flex-col justify-between items-end md:space-x-10 space-y-3 md:space-y-0 w-full">
              <div className="flex flex-col md:w-3/4 w-full">
                <input
                  id="email-address"
                  autoComplete="email"
                  className="box-border w-full px-3 py-4  pl-0 bg-transparent placeholder-manatee border-b-2 border-mulled-wine focus:ring-0 focus:border-b-2 focus:border-wild-strawberry focus:outline-none"
                  placeholder="Votre adresse email"
                  {...getFieldProps}
                />
              </div>
              <div className="block md:w-1/4 w-full md:h-1/4 p-0.5 bg-gradient-to-r from-amaranth via-wild-strawberry to-gold ">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-black h-full w-full px-8 py-3 hover:bg-transparent font-semibold"
                >
                  Je valide
                </button>
              </div>
            </div>
          </div>
          {errors && errors['email'] && (
            <p className="mt-2 text-sm text-red-600 flex" id="email-error">
              <ExclamationCircleIcon className="h-5 w-5 text-amaranth mr-2" aria-hidden="true" />
              {errors['email']}
            </p>
          )}
        </form>
      )}
    </Formik>
  );
};

export default SubscriptionForm;
