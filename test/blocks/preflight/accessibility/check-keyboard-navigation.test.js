import sinon from 'sinon';
import { expect } from '@esm-bundle/chai';
import checkKeyboardNavigation from '../../../../libs/blocks/preflight/accessibility/check-keyboard-navigation.js';

const config = { checks: ['keyboard'] };

function makeEl(rectOverride = {}) {
  const el = document.createElement('a');
  el.href = '#';
  document.body.appendChild(el);
  const rect = {
    top: 100,
    bottom: 140,
    left: 0,
    right: 100,
    width: 100,
    height: 40,
    ...rectOverride,
  };
  sinon.stub(el, 'getBoundingClientRect').returns(rect);
  return el;
}

describe('checkKeyboardNavigation – isSelfHidden off-screen detection', () => {
  afterEach(() => {
    sinon.restore();
    document.body.innerHTML = '';
  });

  it('reports a violation when element is entirely above the viewport (rect.bottom <= 0)', () => {
    const el = makeEl({
      top: -80, bottom: -40, left: 0, right: 100, width: 100, height: 40,
    });
    const violations = checkKeyboardNavigation([el], config);
    expect(violations).to.have.length(1);
    expect(violations[0].id).to.equal('focus-visible');
  });

  it('reports a violation when element is entirely below the viewport (rect.top >= innerHeight)', () => {
    const el = makeEl({
      top: window.innerHeight + 50,
      bottom: window.innerHeight + 90,
      left: 0,
      right: 100,
      width: 100,
      height: 40,
    });
    const violations = checkKeyboardNavigation([el], config);
    expect(violations).to.have.length(1);
    expect(violations[0].id).to.equal('focus-visible');
  });

  it('does not report a violation when element is partially in viewport', () => {
    const el = makeEl({
      top: 100, bottom: 140, left: 0, right: 100, width: 100, height: 40,
    });
    const violations = checkKeyboardNavigation([el], config);
    expect(violations).to.have.length(0);
  });

  it('still reports a violation for zero-dimension elements', () => {
    const el = makeEl({
      top: 100, bottom: 100, left: 0, right: 0, width: 0, height: 0,
    });
    const violations = checkKeyboardNavigation([el], config);
    expect(violations).to.have.length(1);
    expect(violations[0].id).to.equal('focus-visible');
  });

  it('still reports a violation for display:none elements', () => {
    const el = makeEl({
      top: 100, bottom: 140, left: 0, right: 100, width: 100, height: 40,
    });
    el.style.display = 'none';
    const violations = checkKeyboardNavigation([el], config);
    expect(violations).to.have.length(1);
    expect(violations[0].id).to.equal('focus-visible');
  });
});
