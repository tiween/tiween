import { Form, Formik, FormikValues } from 'formik';
import Link from 'next/link';
import React, { useState, useCallback } from 'react';
import { SigninSchema } from '../../shared/schemas/auth-schemas';
/* eslint-disable @typescript-eslint/no-explicit-any */
import EyeIconOn from '@heroicons/react/solid/EyeIcon';
import EyeIconOff from '@heroicons/react/solid/EyeOffIcon';
import ExclamationIcon from '@heroicons/react/solid/ExclamationIcon';
interface SigninSignupForm {
  onSubmit: (values: FormikValues) => void;
  type: 'signin' | 'signup';
}

const SigninSignupForm: React.FunctionComponent<SigninSignupForm> = ({ onSubmit, type }) => {
  SigninSignupForm;
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword(!showPassword);
  }, [showPassword, setShowPassword]);
  return (
    <Formik
      initialValues={{
        email: '',
        password: '',
      }}
      validationSchema={SigninSchema}
      onSubmit={onSubmit}
    >
      {({ getFieldProps, errors, values, touched }) => {
        console.log('values errors', values, errors);
        return (
          <Form method="post">
            <div className="">
              <label htmlFor="email" className="block text-sm font-semibold text-selago">
                Email
              </label>
              <div className="mt-1">
                <input
                  {...getFieldProps('email')}
                  type="email"
                  data-test="user-signup-form-email"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-wild-strawberry-dark focus:border-wild-strawberry-dark sm-text-sm"
                />
              </div>
              {touched['email'] && errors['email'] && (
                <div className="text-xs text-wild-strawberry-light flex justify-start items-center mt-1 sp">
                  <>
                    <ExclamationIcon className="h-4 w-4" /> {errors['email']}
                  </>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-selago">
                Mot de passe
              </label>
              <div className="mt-1 relative text-cinder">
                <input
                  {...getFieldProps('password')}
                  type={showPassword ? 'text' : 'password'}
                  data-test="user-signup-form-password"
                  autoComplete="current-password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-wild-strawberry-dark focus:border-wild-strawberry-dark sm:text-sm"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                  <button type="button" onClick={togglePassword}>
                    {showPassword ? (
                      <EyeIconOff className="text-bastille-400 w-5 h-5" />
                    ) : (
                      <EyeIconOn className="text-bastille-400 w-5 h-5" />
                    )}
                  </button>
                </div>
                {touched['password'] && errors['password'] && (
                  <div className="text-xs text-wild-strawberry-light flex justify-start items-center mt-1 sp">
                    <>
                      <ExclamationIcon className="h-4 w-4" />
                      {errors['password']}
                    </>
                  </div>
                )}
              </div>

              {type === 'signin' && (
                <div className="text-xs text-center py-2">
                  <Link href="/auth/reset-password" passHref>
                    <a className="font-medium text-selago  hover:text-wild-strawberry-dark underline">
                      mot de passe oublié?
                    </a>
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-col ">
              <button
                data-test="user-signup-form-submit"
                type="submit"
                className=" py-2 px-4 no-underline font-bold text-white font-lato text-xs uppercase text-center rounded-sm  inset-x-5 bottom-4 bg-wild-strawberry hover:bg-wild-strawberry-dark my-3"
              >
                {type === 'signin' ? 'se connecter' : 'Continuer'}
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
};

export default SigninSignupForm;
