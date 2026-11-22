// The CI build check: imports every export of both packages, so the production build compiles all of them, and
// renders a few through the provider to prove the setup a consumer follows (README, "Using it") works end to end.
import './styles.css';
import * as tokens from '@levain/tokens';
import * as ui from '@levain/ui-react';
import { Button, Card, Heading, LevainProvider, Tag } from '@levain/ui-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/** Every export, kept, so nothing is shaken out of the build. */
export const everything = { ...tokens, ...ui };

tokens.initTheme();
void tokens.themeManager.applyTheme(0);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LevainProvider>
      <Card>
        <Heading level="h2">levain DS</Heading>
        <Tag>{Object.keys(everything).length} exports</Tag>
        <Button>Built</Button>
      </Card>
    </LevainProvider>
  </StrictMode>,
);
