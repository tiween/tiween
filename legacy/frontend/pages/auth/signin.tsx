import React, { Fragment } from 'react';
import { getProviders, signIn } from 'next-auth/react';

import AuthPagesContainer from '../../components/Auth/AuthPagesContainer';
import { GetServerSideProps } from 'next';
import Layout from '../../components/shared/Layout';
import Link from 'next/link';
import { Provider } from 'next-auth/providers';
import SigninSignupForm from '../../components/Auth/SigninSignupForm';
import get from 'lodash/get';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const callbackUrl = get(context, ['query', 'callbackUrl'], '');
  return {
    props: {
      providers: await getProviders(),
      callbackUrl,
    },
  };
};

const SigninPage: React.FunctionComponent<{
  providers: Provider[];
  callbackUrl?: string;
}> = ({ providers, callbackUrl }) => {
  return (
    <Layout>
      <AuthPagesContainer
        title="Connectez vous"
        subtitle=" Et rejoignez la communauté Tiween pour prolonger votre expérience Cinéma"
      >
        {Object.values(providers).map((provider) => {
          if (provider.id === 'credentials') {
            return (
              <Fragment key={provider.id}>
                <div className="bg-bastille-light py-5 px-4 rounded w-full text-cinder">
                  <SigninSignupForm
                    type="signin"
                    onSubmit={(values) => {
                      // values['csrfToken'] = csrfToken;
                      console.log(
                        'values',
                        values,
                        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback/crendentials`,
                      );

                      signIn('credentials', { ...values, callbackUrl: callbackUrl });
                    }}
                  />
                  <div className="text-xs font-medium text-selago flex space-x-2 justify-center">
                    <span className="">Pas de compte?</span>
                    <Link href="/auth/signup" passHref>
                      <a
                        data-test="authentication-signup"
                        className="underline hover:text-wild-strawberry-dark"
                      >
                        Inscrivez vous
                      </a>
                    </Link>
                  </div>
                </div>
                <div className="relative w-full my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-bastille-lightest"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-6 bg-cinder text-selago">Ou continuez avec</span>
                  </div>
                </div>
              </Fragment>
            );
          } else {
            return (
              <button
                key={provider.id}
                className={`w-full md:w-3/5 m-x-auto bg-${provider.id} uppercase text-sm font-semibold bold px-4 py-2 rounded`}
                onClick={() => signIn(provider.id, { callbackUrl: callbackUrl })}
              >
                {provider.name}
              </button>
            );
          }
        })}
      </AuthPagesContainer>
    </Layout>
  );
};

export default SigninPage;
