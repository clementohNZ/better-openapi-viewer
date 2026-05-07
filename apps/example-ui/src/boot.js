import React from 'react';
import { createRoot } from 'react-dom/client';
import { BetterOpenApiViewer } from '@clementoh/better-openapi-viewer-ui';
import openapi from './openapi.json';

const target = document.getElementById('root');

if (target) {
  createRoot(target).render(
    React.createElement(BetterOpenApiViewer, {
      document: openapi,
      config: {
        title: 'Bookstore API',
        defaultExpansion: 'list',
      },
    }),
  );
}
