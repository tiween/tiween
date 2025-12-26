import Link from 'next/link';
import * as React from 'react';
import ImageModel from '../../shared/models/image';
import get from 'lodash/get';
interface IHomePageHeroProps {
  title: string;
  subtitle?: string;
  image: ImageModel;
  ctas: Array<{
    url: string;
    title: string;
  }>;
}

const HomePageHero: React.FunctionComponent<IHomePageHeroProps> = ({
  title,
  subtitle,
  image,
  ctas,
}) => {
  const colors = get(image, ['colors'], null);

  return (
    <div className="home-page-hero">
      <div
        className="aspect-w-16 aspect-h-9  bg-center bg-cover md:rounded-md relative"
        style={{ backgroundImage: `url(${image.url})` }}
      >
        {colors && (
          <div
            className="absolute inset-0 opacity-60"
            style={{ backgroundColor: colors.Vibrant.hex }}
          ></div>
        )}

        <div className="absolute flex flex-col md:justify-center md:items-between inset-0 text-shadow-base font-fira md:p-24 px-6 py-12">
          <div className="md:text-8xl text-xl font-bold">{title}</div>
          <div className="md:text-3xl text-base font-normal md:pl-2">{subtitle}</div>
          {colors && (
            <div className="flex justify-between md:mt-12 mt-2 md:pl-12">
              {ctas.map((cta) => (
                <Link href={cta.url} passHref key={cta.url}>
                  <a
                    className="md:py-2 md:px-4 py-1 px-3 rounded uppercase md:font-semibold font-normal md:text-base text-sm"
                    style={{ backgroundColor: colors.DarkVibrant.hex }}
                  >
                    {cta.title}
                  </a>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePageHero;
