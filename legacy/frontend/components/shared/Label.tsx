import * as React from 'react';
import Term from '../../shared/models/term';
interface ILabelProps {
  term: Term;
}

const Label: React.FunctionComponent<ILabelProps> = ({ term }) => {
  return (
    <div key={term.id} className="bg-mulled-wine text-2xs py-1 px-2 capitalize rounded-sm">
      {term.name}
    </div>
  );
};

export default Label;
