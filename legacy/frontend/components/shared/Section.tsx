import React from 'react';
interface SectionProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}
const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <section className="mb-3">
      <div className="md:pl-0">
        <h2 className="inline-block py-2 md:text-xl text-lg font-bold font-lato text-selago pr-10 mb-7">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
};

export default Section;
