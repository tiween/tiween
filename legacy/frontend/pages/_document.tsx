import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

class TiweenDocument extends Document {
  render(): JSX.Element {
    return (
      <Html lang="fr" prefix="og: https://ogp.me/ns#">
        <Head>
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link rel="icon" type="image/png" href="/icons/favicon-16x16.png" sizes="16x16" />
          <link rel="icon" type="image/png" href="/icons/favicon-32x32.png" sizes="32x32" />
          <link
            rel="icon"
            type="image/png"
            href="/icons/android-chrome-512x512.png"
            sizes="512x512"
          />
          <link
            rel="icon"
            type="image/png"
            href="/icons/android-chrome-192x192.png"
            sizes="192x192"
          />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" sizes="180x180" />
          <link
            href="https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&Tajawal:wght@300;400;700&family=Noto+Sans+Arabic:wght@300;400;700&Libre+Baskerville:wght@400;700&family=Tajawal:wght@200;300;400;500&display=swap"
            rel="stylesheet"
          />
          <meta name="theme-color" content="#0C0911" />
          <link rel="manifest" href="/manifest.json" />
          <meta property="og:site_name" content="Tiween" />
        </Head>
        <body className="h-screen bg-cinder">
          {process.env.NODE_ENV === 'production' && (
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T77TJC2');`,
              }}
            ></script>
          )}

          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
export default TiweenDocument;
