console.log('main.tsx loaded!');

import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('React imported:', React);
console.log('ReactDOM imported:', ReactDOM);

const root = document.getElementById('root');
console.log('Root element:', root);

ReactDOM.createRoot(root!).render(
  React.createElement('div', { style: { color: 'white', fontSize: '48px' } }, 'Hello World!')
);
