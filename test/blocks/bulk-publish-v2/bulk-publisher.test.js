import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import { waitForRemoval } from '../../helpers/waitfor.js';
import { mockFetch, mockShare, unmockFetch, unmockShare } from './mocks/fetch.js';
import { setConfig } from '../../../libs/utils/utils.js';
import './mocks/authentication.js';

setConfig({ miloLibs: 'http://localhost:2000/libs' });

document.body.innerHTML = await readFile({ path: './mocks/body.html' });
const { default: init } = await import('../../../libs/blocks/bulk-publish-v2/bulk-publish-v2.js');

const payload = '<img src=x onerror=alert(1)>';

describe('Bulk Publisher HTML safety', () => {
  let alertStub;
  const originalUrl = window.location.href;

  before(async () => {
    await mockFetch();
    await mockShare();
    alertStub = sinon.stub(window, 'alert');
  });

  after(() => {
    alertStub.restore();
    window.history.replaceState({}, '', originalUrl);
    unmockFetch();
  });

  init(document.querySelector('.bulk-publish-v2'));
  const bulkPub = document.querySelector('bulk-publish');
  const rootEl = bulkPub.shadowRoot;

  it('signs in', async () => {
    const sidekick = document.querySelector('helix-sidekick');
    sidekick.opened();
    sidekick.status();
    sidekick.loggedin();
    await waitForRemoval('.login-prompt');
    await unmockShare();
    bulkPub.clearJobs();
  });

  it('renders URL-derived HTML as inert text', async () => {
    window.history.replaceState({}, '', `#${payload}`);
    bulkPub.requestUpdate();
    await bulkPub.updateComplete;
    expect(rootEl.querySelector('img[src="x"], [onerror]')).to.not.exist;

    const textarea = rootEl.querySelector('#Urls');
    textarea.focus();
    textarea.value = payload;
    textarea.blur();
    await bulkPub.updateComplete;

    const items = [...rootEl.querySelectorAll('.malformed-urls li')];
    expect(items.some((li) => li.textContent.includes('<img'))).to.be.true;
    expect(rootEl.querySelector('.malformed-urls img, .malformed-urls [onerror]')).to.not.exist;
    expect(rootEl.querySelector('img[src="x"], [onerror]')).to.not.exist;
    expect(alertStub.called).to.be.false;
  });

  it('writes the progress count as plain text', () => {
    let progress = rootEl.querySelector('#progress');
    const created = !progress;
    if (created) {
      progress = document.createElement('span');
      progress.id = 'progress';
      rootEl.append(progress);
    }
    bulkPub.jobs = [{ result: { job: { name: 'job1' } } }];
    bulkPub.setJobProgress({ detail: { name: 'job1', progress: { processed: 3 } } });
    expect(progress.children.length).to.equal(0);
    expect(progress.textContent).to.equal('3');
    if (created) progress.remove();
    bulkPub.jobs = [];
  });
});
