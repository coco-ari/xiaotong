import React from 'react';
import {ArrowLeft} from 'lucide-react';

export default function PageHeading({title, subtitle, onBack}) {
  return <header className="personal-page-heading">
    <button className="round-button" onClick={onBack} aria-label="返回"><ArrowLeft size={20}/></button>
    <div><h1 tabIndex={-1} data-page-heading>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
  </header>;
}
