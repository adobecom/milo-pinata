import sinon from 'sinon';
import { expect } from '@esm-bundle/chai';
import init from '../../libs/scripts/accessibility.js';

let rafCallbacks = [];
let originalRAF;

function flushRAFs() {
  const pending = rafCallbacks.splice(0);
  pending.forEach((cb) => cb(0));
}

function simulateTab(target) {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  target.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

describe('scrollTabFocusedElIntoView', () => {
  before(() => {
    init();
  });

  beforeEach(() => {
    rafCallbacks = [];
    originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    };
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRAF;
    sinon.restore();
    rafCallbacks = [];
    document.body.innerHTML = '';
  });

  it('fast path: scrollIntoView called immediately when rect is outside viewport at focusin', () => {
    const el = document.createElement('button');
    document.body.appendChild(el);
    const scrollSpy = sinon.stub(el, 'scrollIntoView');
    el.getBoundingClientRect = () => ({
      top: -50, bottom: -10, left: 0, right: 100, width: 100, height: 40,
    });

    simulateTab(el);

    expect(scrollSpy.calledOnce).to.be.true;
    expect(scrollSpy.firstCall.args[0]).to.deep.equal({ behavior: 'instant', block: 'center' });
  });

  it('deferred path: scrollIntoView called after double-rAF when rect settles outside viewport', () => {
    const el = document.createElement('button');
    document.body.appendChild(el);
    const scrollSpy = sinon.stub(el, 'scrollIntoView');

    let callCount = 0;
    el.getBoundingClientRect = () => {
      callCount += 1;
      if (callCount === 1) {
        return {
          top: 100, bottom: 140, left: 0, right: 100, width: 100, height: 40,
        };
      }
      return {
        top: window.innerHeight + 50,
        bottom: window.innerHeight + 90,
        left: 0,
        right: 100,
        width: 100,
        height: 40,
      };
    };

    sinon.stub(document, 'elementFromPoint').returns(el);

    // Focus el so document.activeElement === el when rAF fires.
    // The resulting focusin fires before isTab=true, so scrollElement is not triggered.
    el.focus();

    simulateTab(el);

    expect(scrollSpy.called).to.be.false;

    flushRAFs(); // outer rAF → schedules inner rAF
    flushRAFs(); // inner rAF → reads settled rect → calls scrollIntoView

    expect(scrollSpy.calledOnce).to.be.true;
    expect(scrollSpy.firstCall.args[0]).to.deep.equal({ behavior: 'instant', block: 'center' });
  });

  it('deferred no-op: scrollIntoView not called when element loses focus before rAF fires', () => {
    const el = document.createElement('button');
    const el2 = document.createElement('button');
    document.body.appendChild(el);
    document.body.appendChild(el2);
    const scrollSpy = sinon.stub(el, 'scrollIntoView');

    el.getBoundingClientRect = () => ({
      top: 100, bottom: 140, left: 0, right: 100, width: 100, height: 40,
    });
    sinon.stub(document, 'elementFromPoint').returns(el);

    el.focus();
    simulateTab(el);

    // Move focus away before rAFs execute
    el2.focus();

    flushRAFs();
    flushRAFs();

    expect(scrollSpy.called).to.be.false;
  });
});
