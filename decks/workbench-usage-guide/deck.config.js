import '../../src/styles/tokens.css';
import '../../src/styles/base.css';
import './styles.css';

import { slides, usagePlaceholderLayout } from './slides.js';

export const deckConfig = {
  id: 'workbench-usage-guide',
  title: '工作台使用说明',
  defaultLayout: 'usage-placeholder',
  slides,
  renderers: {
    'usage-placeholder': usagePlaceholderLayout,
  },
};
