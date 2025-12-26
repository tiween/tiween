import * as React from 'react';

const Spinner: React.FunctionComponent = () => {
  return (
    <div className="flex justify-center items-center pt-4 ">
      <div
        style={{ borderTopColor: 'transparent' }}
        className="animate-spin  w-8 h-8  border-4  border-wild-strawberry-dark rounded-full"
      ></div>
    </div>
  );
};

export default Spinner;
