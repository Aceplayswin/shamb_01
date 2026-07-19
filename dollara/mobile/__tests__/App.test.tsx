/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// Drains the mount effects plus the promise chains they kick off (auth hydrate,
// branding fetch, each screen's initial load) so the tree settles past the
// splash and actually mounts the navigator.
async function settle(tree: ReactTestRenderer.ReactTestRenderer) {
  for (let i = 0; i < 25; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await ReactTestRenderer.act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
    });
  }
  return tree;
}

test('renders correctly', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });
  expect(tree.toJSON()).toBeTruthy();
});

// The splash renders before auth hydration finishes, so mounting alone never
// reaches the tab navigator — which is exactly where a bad tab→screen mapping
// would blow up. Settle past hydration and assert the real chrome is up.
test('mounts the tab navigator once hydration completes', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<App />);
  });
  await settle(tree);

  const labels = tree.root
    .findAllByType('Text' as never)
    .flatMap((node) => (Array.isArray(node.props.children) ? node.props.children : [node.props.children]))
    .filter((child): child is string => typeof child === 'string');

  expect(labels).toEqual(expect.arrayContaining(['Home', 'Casino', 'Sports', 'Promos', 'Account']));

  await ReactTestRenderer.act(async () => tree.unmount());
});
