import { source } from '../../lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '../../lib/layout.shared';
import { AISearch, AISearchPanel, AISearchTrigger } from '../../components/ai/search';
import { MessageCircleIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { buttonVariants } from 'fumadocs-ui/components/ui/button';

type DocsLayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: DocsLayoutProps) {
  return (
    <>
      <div className="gb-docs-atmosphere" aria-hidden="true">
        <div className="gb-docs-sprite gb-docs-sprite--frog" />
        <div className="gb-docs-trail" />
      </div>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        <AISearch>
          <AISearchPanel />
          <AISearchTrigger
            position="float"
            className={cn(
              buttonVariants({
                variant: 'secondary',
                className: 'text-fd-muted-foreground rounded-2xl border-amber-300/40 bg-white/85 shadow-lg shadow-amber-950/10 backdrop-blur dark:bg-neutral-950/80',
              }),
            )}
          >
            <MessageCircleIcon className="size-4.5" />
            Ask AI
          </AISearchTrigger>
        </AISearch>


        {children}
      </DocsLayout>
    </>
  );
}
