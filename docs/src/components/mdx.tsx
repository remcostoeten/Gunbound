import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

const customMdxComponents = {
  h2: (props: ComponentProps<'h2'>) => <h2 className="gb-mdx-heading gb-mdx-heading--h2" {...props} />,
  h3: (props: ComponentProps<'h3'>) => <h3 className="gb-mdx-heading gb-mdx-heading--h3" {...props} />,
  p: (props: ComponentProps<'p'>) => <p className="gb-mdx-copy" {...props} />,
  ul: (props: ComponentProps<'ul'>) => <ul className="gb-mdx-list" {...props} />,
  ol: (props: ComponentProps<'ol'>) => <ol className="gb-mdx-list gb-mdx-list--ordered" {...props} />,
  li: (props: ComponentProps<'li'>) => <li className="gb-mdx-list-item" {...props} />,
  blockquote: (props: ComponentProps<'blockquote'>) => <blockquote className="gb-mdx-callout" {...props} />,
} satisfies MDXComponents;

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...customMdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
