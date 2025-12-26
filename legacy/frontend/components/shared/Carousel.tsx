import Image from 'next/image';
import ImageInterface from '../../shared/models/image';
import React from 'react';
import SwipeableViews from 'react-swipeable-views';
import { ar1619ImageLoader } from '../../shared/services/cdn';
import classNames from 'classnames';
// import 'tw-elements';
interface ICarouselProps {
  items: Array<ImageInterface>;
}

const Carousel: React.FunctionComponent<ICarouselProps> = ({ items }) => {
  return (
    <SwipeableViews style={{ padding: '0 12px 0 0' }}>
      {/*  Single item */}
      {items.map((item, index) => (
        <div className={classNames({ 'pr-3': index < items.length })} key={item.id}>
          <div className="aspect-w-16 aspect-h-9">
            <Image src={item.hash} loader={ar1619ImageLoader} layout="fill" />
          </div>
        </div>
      ))}
    </SwipeableViews>
  );
};

export default Carousel;
