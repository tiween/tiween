import type { AppProps } from 'next/app';

import 'tailwindcss/tailwind.css';
import '../styles/global.css';
import { SessionProvider } from 'next-auth/react';

import NextNProgress from 'nextjs-progressbar';

const TiweenApp: React.FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <SessionProvider session={pageProps.session}>
      <NextNProgress color="#FF007A" height={4} showOnShallow={true} />
      <Component {...pageProps} />;
    </SessionProvider>
  );
};

export default TiweenApp;
