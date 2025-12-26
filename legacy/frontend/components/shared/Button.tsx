import classNames from 'classnames';
import * as React from 'react';

interface IButtonProps {
  full?: boolean;
  onClick?: (event: React.MouseEvent | React.KeyboardEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  children: React.ReactNode;
}

const Button: React.FunctionComponent<IButtonProps> = ({
  children,
  onClick,
  onKeyDown,
  full = false,
}) => {
  return (
    <button
      className={classNames(
        'flex justify-start items-center px-3 py-2 text-center bg-wild-strawberry text-white text-sm rounded font-lato font-bold',
        {
          'w-full': full,
        },
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
};

export default Button;
