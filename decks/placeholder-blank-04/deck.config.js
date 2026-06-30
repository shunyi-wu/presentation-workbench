import '../../src/styles/tokens.css';
import '../../src/styles/base.css';
import './styles.css';

import { blankLayout, slides } from './slides.js';

export const deckConfig = {
  id: 'placeholder-blank-04',
  title: '占位空白 PPT 04',
  defaultLayout: 'placeholder',
  slides,
  renderers: {
    placeholder: blankLayout,
  },
};
