/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React, { useState, createContext, useContext } from 'react';
import CreativeWork from '../models/creative-work';

const CreativeWorkContext = createContext(null);
interface CreativeWorkProviderProps {
  creativeWork: CreativeWork;
  children: React.ReactNode;
}

export const CreativeWorkProvider: React.FC<CreativeWorkProviderProps> = ({
  creativeWork,
  children,
}) => {
  const [currentCreativeWork] = useState(creativeWork);
  return (
    <CreativeWorkContext.Provider value={currentCreativeWork}>
      {children}
    </CreativeWorkContext.Provider>
  );
};

export const useCreativeWork = (): CreativeWork => useContext(CreativeWorkContext);
