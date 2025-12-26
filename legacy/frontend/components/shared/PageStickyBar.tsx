import { useScrollPosition } from '@n8tb1t/use-scroll-position';
import classNames from 'classnames';
import React, { useState } from 'react';

interface PageStickyBar {
  children: React.ReactNode;
}
const PageStickyBar: React.FunctionComponent<PageStickyBar> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  useScrollPosition(
    ({ currPos }) => {
      if (Math.abs(currPos.y) > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    },
    [visible],
  );
  const wrapperClasses = [
    'h-auto',
    'w-full',
    'bg-cinder',
    'border-b',
    'border-mulled-wine',
    'px-4',
    'pt-3',
    'fixed',
    'top-0',
    'left-0',
    'z-10',
  ];
  const visibility = visible ? 'block' : 'hidden';
  return (
    <div className={classNames(wrapperClasses, visibility)}>
      <div>{children}</div>
    </div>
  );
};

export default PageStickyBar;
