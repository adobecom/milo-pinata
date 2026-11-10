import { expect } from '@esm-bundle/chai';
import { setConfig, loadBlock } from '../../libs/utils/utils.js';

function setFoundationMeta(content) {
  const metaTag = document.createElement('meta');
  metaTag.setAttribute('name', 'foundation');
  metaTag.setAttribute('content', content);
  document.head.appendChild(metaTag);
  return metaTag;
}

function createBlock(className) {
  const block = document.createElement('div');
  block.className = className;
  block.innerHTML = '<div><p>Offer</p></div>';
  document.body.appendChild(block);
  return block;
}

describe('merch-offers C1/C2 compatibility gate', () => {
  let metaTag;
  let block;

  before(() => {
    setConfig({ codeRoot: '/libs' });
  });

  afterEach(() => {
    if (metaTag?.parentNode) metaTag.parentNode.removeChild(metaTag);
    if (block?.parentNode) block.parentNode.removeChild(block);
    metaTag = null;
    block = null;
  });

  it('is not rejected by the C1/C2 gate on a foundation=c2 page', async () => {
    metaTag = setFoundationMeta('c2');
    block = createBlock('merch-offers');

    await loadBlock(block);

    expect(block.dataset.failed).to.not.equal('true');
  });

  it('is not rejected on a default (C1) page', async () => {
    block = createBlock('merch-offers');

    await loadBlock(block);

    expect(block.dataset.failed).to.not.equal('true');
  });

  it('still rejects a C1-only block on a foundation=c2 page (negative control)', async () => {
    metaTag = setFoundationMeta('c2');
    block = createBlock('accordion');

    await loadBlock(block);

    expect(block.dataset.failed).to.equal('true');
    expect(block.dataset.reason).to.match(/C1 block|C2 pages/);
  });
});
