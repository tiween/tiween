import classNames from 'classnames';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useReducer } from 'react';

import Footer from './Footer';
import MainNavigation from './MainNavigation';
const routesWithoutMobileToolBar = ['/auth/signin', '/auth/signup'];
const MobileSearchWrapper = dynamic(() => import('../Search/MobileSearchWrapper'));
const MobileToolBar = dynamic(() => import('./MobileToolBar'));
type State = {
  home?: boolean;
  search?: boolean;
  favorite?: boolean;
  share?: boolean;
  subscription?: boolean;
};
type Action = { type: 'search' } | { type: 'search.close' } | { type: 'subscription.close' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'search':
      return { search: true };
    case 'search.close':
      return { search: false };
    case 'subscription.close':
      return { subscription: false };
    default:
      throw new Error();
  }
};

interface LayoutProps {
  pageName?: string;
  className?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  const [{ search }, dispatch] = useReducer(reducer, {
    home: false,
    search: false,
    favorite: false,
    share: false,
    subscription: true,
  });

  const handleAction = (action: Action): void => {
    dispatch(action);
  };
  const router = useRouter();

  return (
    <>
      <Head>
        <link rel="apple-touch-icon" href="/example.png"></link>
      </Head>
      <div
        id="layout"
        className={classNames(
          'flex flex-col justify-between',
          'bg-cinder',
          'text-white',
          className,
        )}
      >
        <div id="page-wrapper" className="relative sm:-mb-20 md:mb-0 sm:pb-20 md:pb-0">
          <MainNavigation />
          {search ? (
            <MobileSearchWrapper show={search} handleAction={handleAction} />
          ) : (
            <main className="z-0">{children}</main>
          )}

          {!search && !routesWithoutMobileToolBar.includes(router.pathname) && (
            <MobileToolBar handleAction={handleAction} />
          )}
        </div>
        <Footer />
        {/* <SubscriptionModal show /> */}
      </div>
    </>
  );
};

export default Layout;
