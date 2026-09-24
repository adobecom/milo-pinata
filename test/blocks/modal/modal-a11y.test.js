/* eslint-disable no-underscore-dangle */
import { expect } from '@esm-bundle/chai';
import { waitForRemoval } from '../../helpers/waitfor.js';
import { setConfig, createTag } from '../../../libs/utils/utils.js';

setConfig({ codeRoot: '/libs' });

const { getModal } = await import('../../../libs/blocks/modal/modal.js');

const buildContent = () => createTag('div', {}, `
  <p>Sales</p>
  <h1>Close more deals</h1>
  <p>Convert sales documents to high-fidelity PDFs.</p>
  <p>Upload RFPs, call transcripts, and analyst reports.</p>
  <p>Use Adobe Express to turn those insights into presentations.</p>
`);

const cleanup = () => {
  document.querySelectorAll('.dialog-modal, .modal-curtain').forEach((n) => n.remove());
  document.body.classList.remove('disable-scroll');
};

describe('Modal accessibility (quiet-announce)', () => {
  afterEach(async () => {
    document.querySelectorAll('.dialog-modal').forEach((dialog) => {
      if (dialog._documentKeydownListener) {
        document.removeEventListener('keydown', dialog._documentKeydownListener);
      }
    });
    cleanup();
  });

  it('gives the opted-in modal an aria-labelledby name of "Sales Close more deals" and no aria-label', async () => {
    const modal = await getModal(null, {
      id: 'sales-tour',
      content: buildContent(),
      class: 'quiet-announce',
      title: 'ignored',
    });

    const labelledby = modal.getAttribute('aria-labelledby');
    expect(labelledby).to.exist;
    const [eyebrowId, headingId] = labelledby.split(' ');
    expect(document.getElementById(eyebrowId).textContent.trim()).to.equal('Sales');
    expect(document.getElementById(headingId).textContent.trim()).to.equal('Close more deals');
    expect(modal.hasAttribute('aria-label')).to.be.false;
  });

  it('does not expose the body paragraphs for automatic announcement and focuses the close control', async () => {
    const modal = await getModal(null, {
      id: 'sales-tour-focus',
      content: buildContent(),
      class: 'quiet-announce',
      title: 'ignored',
    });

    expect(modal.hasAttribute('aria-describedby')).to.be.false;
    expect(modal.hasAttribute('aria-live')).to.be.false;

    const labelledbyIds = (modal.getAttribute('aria-labelledby') || '').split(' ');
    modal.querySelectorAll('p').forEach((p) => {
      if (p.textContent.trim() !== 'Sales') expect(labelledbyIds).to.not.include(p.id);
    });

    expect(document.activeElement).to.equal(modal.querySelector('button.dialog-close'));
    expect(document.activeElement).to.not.equal(modal);
  });

  it('keeps default aria-label/heading-fallback behavior for a control modal without the opt-in class', async () => {
    const modal = await getModal(null, {
      id: 'sales-tour-control',
      content: buildContent(),
      title: 'ignored',
    });

    expect(modal.getAttribute('aria-label')).to.equal('Close more deals');
    expect(modal.hasAttribute('aria-labelledby')).to.be.false;
  });

  it('closes both the opted-in modal and a control modal on Escape', async () => {
    const quiet = await getModal(null, { id: 'sales-tour-escape', content: buildContent(), class: 'quiet-announce', title: 'ignored' });
    const control = await getModal(null, { id: 'sales-tour-escape-control', content: buildContent(), title: 'ignored' });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await waitForRemoval('#sales-tour-escape');
    await waitForRemoval('#sales-tour-escape-control');

    expect(document.getElementById(quiet.id)).to.be.null;
    expect(document.getElementById(control.id)).to.be.null;
  });
});
