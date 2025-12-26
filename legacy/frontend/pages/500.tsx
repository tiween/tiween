import * as React from 'react';

import Layout from '../components/shared/Layout';
import Link from 'next/link';

const Custom500: React.FunctionComponent = () => {
  return (
    <Layout>
      <div className="flex min-h-full flex-col  lg:relative py:6">
        <div className="flex flex-grow flex-col">
          <main className="flex flex-grow flex-col">
            <div className="mx-auto flex w-full max-w-7xl flex-grow flex-col px-4 sm:px-6 lg:px-8">
              <div className="my-auto flex-shrink-0 py-16 sm:py-32">
                <p className="text-xl font-semibold text-wild-strawberry-dark">Oops</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-selago sm:text-5xl">
                  &quot; It&apos;s not you it&apos;s us&quot;
                </h1>
                <p className="mt-2 text-base text-gray-500">Nah, shit happens</p>
                <div className="mt-6">
                  <Link href="/" passHref>
                    <a className="text-base font-medium text-wild-strawberry hover:text-wild-strawberry-light">
                      <span aria-hidden="true">Revenir à l&apos;accueil</span>
                    </a>
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
        <div className="hidden lg:absolute lg:inset-y-0 lg:right-0 lg:block lg:w-1/2">
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src="/images/error-travolta.gif"
            alt=""
          />
        </div>
      </div>
    </Layout>
  );
};

export default Custom500;
