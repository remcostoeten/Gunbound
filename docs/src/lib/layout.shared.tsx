import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { CSSProperties } from 'react';
import { appName, gitConfig } from './shared';

const brandLetters = [
  ['R', '/gunbound/logo-r.png'],
  ['e', '/gunbound/logo-e.png'],
  ['m', '/gunbound/logo-m.png'],
  ['b', '/gunbound/logo-b.png'],
  ['o', '/gunbound/logo-o.png'],
  ['u', '/gunbound/logo-u.png'],
  ['n', '/gunbound/logo-n.png'],
  ['d', '/gunbound/logo-d.png'],
] as const;

function BrandTitle() {
  return (
    <span className="gb-brand" aria-label={`${appName} home`}>
      <span className="gb-brand-mark" aria-hidden="true">
        {brandLetters.map(([letter, src], index) => (
          <img
            key={`${letter}-${index}`}
            className="gb-brand-letter"
            src={src}
            alt=""
            width={28}
            height={28}
            style={{ '--letter-index': index } as CSSProperties}
          />
        ))}
      </span>
      <span className="gb-brand-word">Rembound</span>
      <span className="gb-brand-docs">docs</span>
      <span className="gb-brand-dragon" aria-hidden="true" />
    </span>
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: <BrandTitle />,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
