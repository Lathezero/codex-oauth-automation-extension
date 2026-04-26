const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('background/steps/plus-return-confirm.js', 'utf8');
const globalScope = {};
const api = new Function('self', `${source}; return self.MultiPageBackgroundPlusReturnConfirm;`)(globalScope);

test('Plus return confirm waits a fixed 40 seconds after return URL is detected', async () => {
  const events = [];
  const executor = api.createPlusReturnConfirmExecutor({
    addLog: async (message, level = 'info') => {
      events.push({ type: 'log', message, level });
    },
    completeStepFromBackground: async (step, payload) => {
      events.push({ type: 'complete', step, payload });
    },
    getTabId: async (source) => (source === 'paypal-flow' ? 77 : null),
    isTabAlive: async (source) => source === 'paypal-flow',
    setState: async (payload) => {
      events.push({ type: 'set-state', payload });
    },
    sleepWithStop: async (ms) => {
      events.push({ type: 'sleep', ms });
    },
    waitForTabUrlMatchUntilStopped: async (tabId, matcher) => {
      const url = 'https://chatgpt.com/backend-api/payments/success';
      assert.equal(tabId, 77);
      assert.equal(matcher(url), true);
      events.push({ type: 'url-match', tabId, url });
      return { id: tabId, url };
    },
  });

  await executor.executePlusReturnConfirm({});

  assert.deepEqual(
    events.find((event) => event.type === 'sleep'),
    { type: 'sleep', ms: 40000 }
  );
  assert.equal(
    events.some((event) => event.type === 'log' && /固定等待 40 秒/.test(event.message)),
    true
  );
  assert.deepEqual(
    events.find((event) => event.type === 'complete'),
    {
      type: 'complete',
      step: 9,
      payload: { plusReturnUrl: 'https://chatgpt.com/backend-api/payments/success' },
    }
  );
});
