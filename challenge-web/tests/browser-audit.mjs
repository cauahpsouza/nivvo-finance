import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { CHALLENGE_EVENTS } = require('../.test-dist/src/lib/challenge/events.js');
const { CHALLENGE_BOSSES } = require('../.test-dist/src/lib/challenge/bosses.js');
const { sanitizeChallengeNickname } = require('../.test-dist/src/lib/challenge/engine.js');

const cdpPort = process.env.NIVVO_CDP_PORT ?? '9236';
const challengeUrl = process.env.NIVVO_CHALLENGE_URL ?? 'http://localhost:3101';
const outputDir = new URL('../.screenshots/', import.meta.url);

class CdpClient {
  id = 0;
  pending = new Map();
  errors = [];
  requests = [];
  failedResponses = [];
  constructor(url) { this.socket = new WebSocket(url); }
  async connect() {
    await new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.text);
      else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(message.params.type)) this.errors.push(message.params.args.map(item => item.value ?? item.description ?? '').join(' '));
      else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') this.errors.push(`${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ''}`);
      else if (message.method === 'Network.requestWillBeSent' && /^https?:/.test(message.params.request.url)) this.requests.push(message.params.request.url);
      else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) this.failedResponses.push(`${message.params.response.status} ${message.params.response.url}`);
    });
  }
  send(method, params = {}) { const id = ++this.id; this.socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  async evaluate(expression) { const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
  close() { this.socket.close(); }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const targets = await (await fetch(`http://localhost:${cdpPort}/json/list`)).json();
const target = targets.find(item => item.type === 'page' && item.url.startsWith(challengeUrl));
if (!target) throw new Error('Aba do Challenge não encontrada.');
const client = new CdpClient(target.webSocketDebuggerUrl);
await client.connect();
await client.send('Runtime.enable');
await client.send('Page.enable');
await client.send('Log.enable');
await client.send('Network.enable');
await client.send('Target.activateTarget', { targetId: target.id });

const waitFor = async (expression, message, timeout = 12_000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await client.evaluate(expression)) return;
    await delay(100);
  }
  const state = await client.evaluate(`({url:location.href,text:document.body?.innerText.slice(0,700)})`);
  throw new Error(`${message} ${JSON.stringify(state)}`);
};
const setViewport = (width, height, mobile = width < 768) => client.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
const screenshot = async name => { const shot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await mkdir(outputDir, { recursive: true }); await writeFile(new URL(name, outputDir), Buffer.from(shot.data, 'base64')); };
const mobileViewports = [[360,800],[375,667],[375,812],[390,844],[393,852],[393,873],[412,915],[414,896],[430,932]];
const navigateWithStorageScript = async source => {
  await client.send('Page.navigate', { url: 'about:blank' });
  await delay(50);
  const injected = await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { ${source} } finally { globalThis.__nivvoStoragePrepared = true }` });
  await client.send('Page.navigate', { url: challengeUrl });
  await waitFor(`globalThis.__nivvoStoragePrepared === true`, 'Preparação isolada do storage não executou.');
  await client.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injected.identifier });
};
const loadStoredRun = async storedState => {
  await navigateWithStorageScript(`localStorage.setItem('nivvo-challenge-v3', ${JSON.stringify(JSON.stringify(storedState))})`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, 'Retomada de auditoria não abriu.');
  await client.evaluate(`document.querySelector('.primary-action').click()`);
};
const resetToFirstOpen = async () => {
  await navigateWithStorageScript(`localStorage.clear()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-nickname"]'))`, 'Primeira abertura não exibiu o nome.');
};
const setInput = value => client.evaluate(`(() => { const input=document.querySelector('[data-testid="challenge-nickname"]'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
const submitWithEnter = async () => {
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await client.send('Input.dispatchKeyEvent', { type: 'char', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
};
const assertNoHorizontalOverflow = async label => {
  const overflow = await client.evaluate(`document.documentElement.scrollWidth-document.documentElement.clientWidth`);
  assert(overflow <= 1, `${label}: overflow horizontal de ${overflow}px.`);
};
const reloadAndContinue = async (selector, message) => {
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, `${message}: retomada não abriu.`);
  await client.evaluate(`document.querySelector('.primary-action').click()`);
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, `${message}: fase não voltou.`);
};

try {
  await resetToFirstOpen();

  const viewports = [...mobileViewports,[768,1024],[1366,768]];
  for (const [width, height] of viewports) {
    await setViewport(width, height);
    await delay(100);
    const layout = await client.evaluate(`({overflow:document.documentElement.scrollWidth-innerWidth,input:document.querySelector('[data-testid="challenge-nickname"]')?.getBoundingClientRect().height})`);
    assert(layout.overflow <= 1, `Overflow horizontal no cadastro em ${width}x${height}: ${layout.overflow}px.`);
    assert(layout.input >= 48, `Input menor que 48px em ${width}x${height}: ${layout.input}px.`);
  }

  await navigateWithStorageScript(`localStorage.clear(); Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true}); Object.defineProperty(MediaQueryList.prototype,'addEventListener',{value:undefined,configurable:true}); Object.defineProperty(MediaQueryList.prototype,'removeEventListener',{value:undefined,configurable:true})`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-nickname"]'))`, 'Fallback Safari não abriu o cadastro.');
  await setInput('Safari');
  await client.evaluate(`document.querySelector('[data-testid="challenge-start"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, 'Fallback Safari não iniciou a partida.');
  assert(await client.evaluate(`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.id)`), 'Fallback de runId não gerou UUID válido.');

  for (const value of ['', '      ']) {
    await resetToFirstOpen();
    await setInput(value);
    await client.evaluate(`document.querySelector('[data-testid="challenge-start"]').click()`);
    await waitFor(`Boolean(document.querySelector('[role="alert"]'))`, `Nome inválido ${JSON.stringify(value)} não foi rejeitado.`);
    assert(await client.evaluate(`localStorage.getItem('nivvo-challenge-v3') === null`), 'Nome inválido iniciou uma partida.');
  }

  const validNames = ['Cauã', 'João', 'José', 'Ana Maria', 'Gabriel', 'Luís', 'Ana-Maria', '12345678901234567890', '1234567890123456789😀', '😀✨💚', '<img src=x onerror=alert(1)>', 'Nome\ncom\tquebra', 'ÁÉÍÓÚ ç & " teste'];
  for (const value of validNames) {
    await resetToFirstOpen();
    await setInput(value);
    await client.evaluate(`document.querySelector('[data-testid="challenge-start"]').click()`);
    await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, `Nome ${JSON.stringify(value)} não iniciou.`);
    const savedName = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.nickname`);
    assert(savedName === sanitizeChallengeNickname(value), `Nome salvo incorretamente: ${JSON.stringify(savedName)}.`);
    assert(!savedName.includes('\uFFFD') && Array.from(savedName).length <= 20, 'Nome foi quebrado no limite Unicode.');
    if (value.startsWith('<')) {
      await client.send('Page.reload', { ignoreCache: true });
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, 'Nome HTML não retomou com segurança.');
      assert(await client.evaluate(`!document.querySelector('img[src="x"]') && !window.__xssTriggered`), 'Nome foi interpretado como HTML.');
    }
  }

  await resetToFirstOpen();
  await setViewport(390, 430);
  await setInput('Ana Maria');
  await client.evaluate(`document.querySelector('[data-testid="challenge-nickname"]').focus(); document.querySelector('[data-testid="challenge-start"]').scrollIntoView({block:'end'})`);
  const keyboardLayout = await client.evaluate(`(() => { const input=document.querySelector('[data-testid="challenge-nickname"]'); const button=document.querySelector('[data-testid="challenge-start"]'); return {fontSize:parseFloat(getComputedStyle(input).fontSize),overflow:document.documentElement.scrollWidth-innerWidth,buttonBottom:button.getBoundingClientRect().bottom,height:innerHeight}; })()`);
  assert(keyboardLayout.fontSize >= 16, `Input provoca zoom no iOS: ${keyboardLayout.fontSize}px.`);
  assert(keyboardLayout.overflow <= 1 && keyboardLayout.buttonBottom <= keyboardLayout.height + 1, 'Teclado simulado tornou o botão inacessível.');
  await submitWithEnter();
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, 'Enter/Go não submeteu o formulário.');

  await resetToFirstOpen();
  await setViewport(390, 844);
  await screenshot('challenge-intro-390x844.png');
  await setInput('Cauã');
  await client.evaluate(`document.querySelector('[data-testid="challenge-start"]').click()`);
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Primeiras escolhas não ficaram disponíveis.');

  await waitFor(`Boolean(JSON.parse(localStorage.getItem('nivvo-challenge-v3'))?.run)`, 'Partida inicial não foi persistida.');
  const baselineStored = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3'))`);
  baselineStored.run = {
    ...baselineStored.run,
    phase: 'playing',
    day: 1,
    balance: 680,
    goalAmount: 0,
    xp: 0,
    commitments: 0,
    decisions: [],
    scheduledEffects: [],
    appliedEffectIds: [],
    tags: [],
    metrics: { planning: 50, commitments: 50 },
    currentFeedback: null,
    currentConsequences: [],
    pendingChoiceId: null,
    bossId: null,
    result: null,
    completedAt: null,
    timedOut: false,
    decisionTimer: { remainingMs: 120_000, activeSinceMs: null },
  };

  let auditedQuestionScreens = 0;
  let mobileScreensWithVerticalScroll = 0;
  let maxVerticalScroll = 0;
  const verticallyScrollableScreens = [];
  let auditedRegularChoices = 0;
  let branchNetworkRequests = 0;
  for (const event of CHALLENGE_EVENTS) {
    const stored = structuredClone(baselineStored);
    stored.run.eventIds = [event.id, ...stored.run.eventIds.filter(id => id !== event.id)].slice(0, 7);
    await loadStoredRun(stored);
    await waitFor(`document.querySelectorAll('button[data-testid^="challenge-choice-"]:not(:disabled)').length === ${event.choices.length}`, `Opções de ${event.id} não abriram.`);
    for (const [width, height] of mobileViewports) {
      await setViewport(width, height);
      await delay(45);
      const layout = await client.evaluate(`(() => { const choices=[...document.querySelectorAll('button[data-testid^="challenge-choice-"]')]; return {overflow:document.documentElement.scrollWidth-innerWidth,scroll:Math.max(0,document.documentElement.scrollHeight-innerHeight),minTouch:Math.min(...choices.map(item=>item.getBoundingClientRect().height)),choiceCount:choices.length,emptyText:choices.some(item=>!item.innerText.trim())}; })()`);
      assert(layout.overflow <= 1, `${event.id}: overflow horizontal em ${width}x${height}.`);
      assert(layout.choiceCount === event.choices.length && !layout.emptyText, `${event.id}: opções incompletas em ${width}x${height}.`);
      assert(layout.minTouch >= 48, `${event.id}: opção menor que 48px em ${width}x${height}.`);
      if (layout.scroll > 1) {
        mobileScreensWithVerticalScroll += 1;
        verticallyScrollableScreens.push({ eventId: event.id, viewport: `${width}x${height}`, scroll: layout.scroll });
      }
      maxVerticalScroll = Math.max(maxVerticalScroll, layout.scroll);
      auditedQuestionScreens += 1;
    }
    for (const choice of event.choices) {
      const branch = structuredClone(stored);
      branch.run.balance = 10_000;
      branch.run.goalAmount = 180;
      await loadStoredRun(branch);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-choice-${choice.id}"]:not(:disabled)'))`, `${event.id}/${choice.id} não ficou disponível.`);
      client.requests = [];
      await client.evaluate(`(() => { const button=document.querySelector('[data-testid="challenge-choice-${choice.id}"]'); for(let tap=0;tap<10;tap+=1) button.click(); })()`);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`, `${event.id}/${choice.id} não produziu feedback.`);
      const branchResult = await client.evaluate(`(() => { const run=JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run; const next=document.querySelector('[data-testid="challenge-next"]'); return {phase:run.phase,decisions:run.decisions.length,choiceId:run.decisions[0]?.choiceId,overflow:document.documentElement.scrollWidth-innerWidth,nextHeight:next?.getBoundingClientRect().height}; })()`);
      assert(branchResult.phase === 'feedback' && branchResult.decisions === 1 && branchResult.choiceId === choice.id, `${event.id}/${choice.id}: multitap processou estado incorreto.`);
      assert(branchResult.overflow <= 1 && branchResult.nextHeight >= 48, `${event.id}/${choice.id}: feedback não ficou utilizável.`);
      branchNetworkRequests += client.requests.length;
      assert(client.requests.length === 0, `${event.id}/${choice.id}: gameplay fez request.`);
      auditedRegularChoices += 1;
    }
  }

  let auditedFinalScreens = 0;
  let auditedFinalChoices = 0;
  for (const finalDecision of CHALLENGE_BOSSES) {
    const stored = structuredClone(baselineStored);
    stored.run = { ...stored.run, phase: 'boss', day: 7, bossId: finalDecision.id };
    await loadStoredRun(stored);
    await waitFor(`document.querySelectorAll('button[data-testid^="challenge-boss-choice-"]').length === ${finalDecision.choices.length}`, `Opções finais de ${finalDecision.id} não abriram.`);
    for (const [width, height] of mobileViewports) {
      await setViewport(width, height);
      await delay(45);
      const layout = await client.evaluate(`(() => { const choices=[...document.querySelectorAll('button[data-testid^="challenge-boss-choice-"]')]; return {overflow:document.documentElement.scrollWidth-innerWidth,minTouch:Math.min(...choices.map(item=>item.getBoundingClientRect().height)),choiceCount:choices.length,emptyText:choices.some(item=>!item.innerText.trim())}; })()`);
      assert(layout.overflow <= 1, `${finalDecision.id}: overflow horizontal final em ${width}x${height}.`);
      assert(layout.choiceCount === finalDecision.choices.length && !layout.emptyText, `${finalDecision.id}: opções finais incompletas em ${width}x${height}.`);
      assert(layout.minTouch >= 48, `${finalDecision.id}: opção final menor que 48px em ${width}x${height}.`);
      auditedFinalScreens += 1;
    }
    for (const choice of finalDecision.choices) {
      const branch = structuredClone(stored);
      branch.run.balance = 10_000;
      branch.run.goalAmount = 180;
      branch.run.commitments = 500;
      await loadStoredRun(branch);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-boss-choice-${choice.id}"]:not(:disabled)'))`, `${finalDecision.id}/${choice.id} não ficou disponível.`);
      client.requests = [];
      await client.evaluate(`(() => { const button=document.querySelector('[data-testid="challenge-boss-choice-${choice.id}"]'); for(let tap=0;tap<10;tap+=1) button.click(); })()`);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`, `${finalDecision.id}/${choice.id} não produziu feedback final.`);
      const branchResult = await client.evaluate(`(() => { const run=JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run; return {phase:run.phase,result:Boolean(run.result),score:run.result?.score,overflow:document.documentElement.scrollWidth-innerWidth}; })()`);
      assert(branchResult.phase === 'boss-feedback' && branchResult.result && branchResult.score >= 0 && branchResult.score <= 100, `${finalDecision.id}/${choice.id}: final inválido.`);
      assert(branchResult.overflow <= 1, `${finalDecision.id}/${choice.id}: feedback final com overflow.`);
      branchNetworkRequests += client.requests.length;
      assert(client.requests.length === 0, `${finalDecision.id}/${choice.id}: final fez request.`);
      auditedFinalChoices += 1;
    }
  }

  for (const invalidValue of ['{broken-json', JSON.stringify({ challengeSchemaVersion: 2, run: baselineStored.run }), JSON.stringify({ challengeSchemaVersion: 3, run: { ...baselineStored.run, phase: 'results' } })]) {
    await navigateWithStorageScript(`localStorage.setItem('nivvo-challenge-v3', ${JSON.stringify(invalidValue)})`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-nickname"]'))`, 'Storage inválido causou falha na primeira abertura.');
    assert(await client.evaluate(`localStorage.getItem('nivvo-challenge-v3') === null`), 'Storage inválido não foi descartado.');
  }

  await resetToFirstOpen();
  await client.evaluate(`Storage.prototype.setItem=function(){throw new DOMException('Storage bloqueado','SecurityError')}`);
  await setInput('Sem Storage');
  await client.evaluate(`document.querySelector('[data-testid="challenge-start"]').click()`);
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Partida em memória não iniciou sem storage.');
  await waitFor(`Boolean(document.querySelector('.persistence-warning'))`, 'Falha de storage não foi informada.');
  await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`, 'Gameplay em memória quebrou sem storage.');

  await loadStoredRun(baselineStored);
  await reloadAndContinue('[data-testid="challenge-scene"]', 'Reload no Dia 1');
  assert(await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.day === 1`), 'Reload alterou o Dia 1.');

  const daySeven = structuredClone(baselineStored);
  daySeven.run.day = 7;
  await loadStoredRun(daySeven);
  await reloadAndContinue('[data-testid="challenge-scene"]', 'Reload no Dia 7');
  assert(await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.day === 7`), 'Reload alterou o Dia 7.');

  const finalReload = structuredClone(baselineStored);
  finalReload.run = { ...finalReload.run, phase: 'boss', day: 7, bossId: CHALLENGE_BOSSES[0].id };
  await loadStoredRun(finalReload);
  await reloadAndContinue('[data-testid="challenge-boss"]', 'Reload na decisão final');
  assert(await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.phase === 'boss'`), 'Reload da decisão final voltou ao Dia 7.');

  await loadStoredRun(baselineStored);
  const orientationRunId = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.id`);
  await setViewport(844, 390, true);
  await delay(100);
  await assertNoHorizontalOverflow('Landscape');
  await setViewport(390, 844, true);
  await delay(100);
  await assertNoHorizontalOverflow('Retorno ao portrait');
  assert(await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.id === ${JSON.stringify(orientationRunId)}`), 'Mudança de orientação perdeu a partida.');

  await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await loadStoredRun(baselineStored);
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Reduced motion não liberou interação.');
  await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`, 'Reduced motion bloqueou a transição.');
  await client.send('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  await loadStoredRun(baselineStored);
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Partida não voltou após auditoria integral.');
  client.errors = [];

  let decisionNetworkRequests = 0;
  client.requests = [];
  await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-next"]'))`, 'A decisão não funcionou offline.');
  const feedbackRemainingMs = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.decisionTimer.remainingMs`);
  await delay(700);
  assert(await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.decisionTimer.remainingMs === ${feedbackRemainingMs}`), 'Timer continuou durante o feedback.');
  decisionNetworkRequests += client.requests.length;
  assert(client.requests.length === 0, `A primeira decisão tentou ${client.requests.length} request(s).`);
  await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await client.evaluate(`document.querySelector('[data-testid="challenge-next"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, 'Dia 2 não abriu.');
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Dia 2 não ficou interativo.');

  const beforeHideSeconds = await client.evaluate(`Number(document.querySelector('[data-testid="challenge-timer"]').textContent.split(':')[0])*60+Number(document.querySelector('[data-testid="challenge-timer"]').textContent.split(':')[1])`);
  const cover = await client.send('Target.createTarget', { url: 'about:blank', background: false });
  await client.send('Target.activateTarget', { targetId: cover.targetId });
  await delay(1600);
  const pausedRemainingMs = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.decisionTimer.remainingMs`);
  assert(Math.abs(pausedRemainingMs - beforeHideSeconds * 1000) < 1800, 'Cronômetro continuou correndo com a aba invisível.');
  await client.send('Target.closeTarget', { targetId: cover.targetId });
  await client.send('Target.activateTarget', { targetId: target.id });

  for (const [width, height] of viewports) {
    await setViewport(width, height);
    await delay(80);
    const layout = await client.evaluate(`(() => { const choices=[...document.querySelectorAll('button[data-testid^="challenge-choice-"]')]; return {overflow:document.documentElement.scrollWidth-innerWidth,minTouch:Math.min(...choices.map(item=>item.getBoundingClientRect().height)),scroll:document.documentElement.scrollHeight-innerHeight}; })()`);
    assert(layout.overflow <= 1, `Overflow horizontal na decisão em ${width}x${height}: ${layout.overflow}px.`);
    assert(layout.minTouch >= 48, `Escolha menor que 48px em ${width}x${height}.`);
  }
  await setViewport(375, 667);
  await screenshot('challenge-decision-375x667.png');

  for (let day = 2; day <= 7; day += 1) {
    await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, `Escolhas do dia ${day} não abriram.`);
    client.requests = [];
    await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-next"]'))`, `Feedback do dia ${day} não abriu.`);
    decisionNetworkRequests += client.requests.length;
    assert(client.requests.length === 0, `A decisão do dia ${day} tentou ${client.requests.length} request(s).`);
    await client.evaluate(`document.querySelector('[data-testid="challenge-next"]').click()`);
    if (day < 7) {
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-transition"]'))`, `Transição para o dia ${day + 1} não abriu.`);
      await assertNoHorizontalOverflow(`Transição para o dia ${day + 1}`);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, `Dia ${day + 1} não abriu.`);
    } else {
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-boss-intro"]'))`, 'Introdução da decisão final não abriu.');
      await assertNoHorizontalOverflow('Introdução da decisão final');
    }
    if (day === 3) {
      await client.send('Page.reload', { ignoreCache: true });
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, 'Retomada após reload não abriu.');
      const saved = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run`);
      assert(saved.day === 4 && saved.nickname === 'Cauã', 'Reload não preservou dia e nome.');
      await client.evaluate(`document.querySelector('.primary-action').click()`);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, 'Partida não retomou.');
    }
  }

  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-boss"]'))`, 'Decisão final não abriu.', 15_000);
  await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-boss-choice-"]:not(:disabled)'))`, 'Opções finais não abriram.');
  client.requests = [];
  await client.evaluate(`document.querySelector('button[data-testid^="challenge-boss-choice-"]:not(:disabled)').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-next"]'))`, 'Feedback final não abriu.');
  decisionNetworkRequests += client.requests.length;
  assert(client.requests.length === 0, `A decisão final tentou ${client.requests.length} request(s).`);
  await client.evaluate(`document.querySelector('[data-testid="challenge-next"]').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-results"]'))`, 'Resultado não abriu.');
  await delay(900);
  for (const [width, height] of [[360,800],[375,667],[390,844],[430,932]]) {
    await setViewport(width, height);
    await client.evaluate(`scrollTo(0,0)`);
    await delay(120);
    const resultLayout = await client.evaluate(`(() => { const card=document.querySelector('[data-testid="challenge-nivvo-id"]'); return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,cardWidth:card.getBoundingClientRect().width,cardText:card.innerText}; })()`);
    assert(resultLayout.overflow <= 1 && resultLayout.cardWidth <= width, `Resultado com overflow em ${width}x${height}.`);
    assert(/NV-[A-Z0-9]{4}/.test(resultLayout.cardText) && /RANK [CBAS]/.test(resultLayout.cardText), `Nivvo ID incompleto em ${width}x${height}.`);
    if (width === 360 || (width === 375 && height === 667)) await screenshot(`challenge-result-${width}x${height}.png`);
    await client.evaluate(`document.querySelector('[data-testid="challenge-nivvo-id"]').scrollIntoView({block:'end'})`);
    await delay(80);
    const cardPosition = await client.evaluate(`(() => { const rect=document.querySelector('[data-testid="challenge-nivvo-id"]').getBoundingClientRect(); return {top:rect.top,bottom:rect.bottom,height:rect.height,viewport:innerHeight}; })()`);
    assert(cardPosition.bottom <= cardPosition.viewport + 1 && cardPosition.top >= -1, `Nivvo ID não ficou acessível em ${width}x${height}.`);
    if (width === 375 && height === 667) await screenshot('challenge-nivvo-id-375x667.png');
  }
  await setViewport(390, 844);
  await client.evaluate(`scrollTo(0,0)`);
  await delay(120);
  const result = await client.evaluate(`({overflow:document.documentElement.scrollWidth-innerWidth,text:document.body.innerText,stored:JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.result})`);
  assert(result.overflow <= 1, 'Resultado possui overflow horizontal.');
  assert(result.stored?.nivvoId && result.stored?.rank, 'Resultado não foi persistido.');
  const forbiddenResultTexts = [['Rank', 'ing'], ['Leader', 'board'], ['Top ', '10'], ['Jogar nova', 'mente'], ['Voltar ao ', 'Nivvo']].map(parts => parts.join(''));
  for (const forbidden of forbiddenResultTexts) assert(!result.text.includes(forbidden), `Resultado contém texto proibido: ${forbidden}.`);
  await screenshot('challenge-result-390x844.png');

  const completedIdentity = { nivvoId: result.stored.nivvoId, rank: result.stored.rank, score: result.stored.score };
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, 'Retomada do resultado não abriu após reload.');
  await client.evaluate(`document.querySelector('.primary-action').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-results"]'))`, 'Resultado não reapareceu após reload.');
  const reloadedIdentity = await client.evaluate(`(() => { const result=JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.result; return {nivvoId:result.nivvoId,rank:result.rank,score:result.score}; })()`);
  assert(JSON.stringify(reloadedIdentity) === JSON.stringify(completedIdentity), 'Reload alterou o resultado individual.');

  for (let refresh = 0; refresh < 3; refresh += 1) {
    await client.send('Page.reload', { ignoreCache: true });
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, `Refresh rápido ${refresh + 1} não retomou.`);
    await client.evaluate(`document.querySelector('.primary-action').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-results"]'))`, `Refresh rápido ${refresh + 1} perdeu o resultado.`);
    const identity = await client.evaluate(`(() => { const result=JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run.result; return [result.nivvoId,result.rank,result.score]; })()`);
    assert(JSON.stringify(identity) === JSON.stringify([completedIdentity.nivvoId, completedIdentity.rank, completedIdentity.score]), 'Refresh rápido alterou o resultado.');
  }

  await loadStoredRun(baselineStored);
  client.requests = [];
  await client.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  try {
    for (let day = 1; day <= 7; day += 1) {
      await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, `Offline: dia ${day} não ficou interativo.`);
      await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
      await waitFor(`Boolean(document.querySelector('[data-testid="challenge-next"]'))`, `Offline: feedback do dia ${day} não abriu.`);
      await client.evaluate(`document.querySelector('[data-testid="challenge-next"]').click()`);
    }
    await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-boss-choice-"]:not(:disabled)'))`, 'Offline: decisão final não abriu.', 15_000);
    await client.evaluate(`document.querySelector('button[data-testid^="challenge-boss-choice-"]:not(:disabled)').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-next"]'))`, 'Offline: feedback final não abriu.');
    await client.evaluate(`document.querySelector('[data-testid="challenge-next"]').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-results"]'))`, 'Offline: resultado não abriu.');
    assert(client.requests.length === 0, `Partida offline tentou ${client.requests.length} request(s).`);
  } finally {
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  }

  await loadStoredRun(baselineStored);
  await client.send('Page.navigate', { url: `${challengeUrl}/?origem=qr` });
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`, 'Navegação direta com query não retomou.');
  await client.evaluate(`document.querySelector('.primary-action').click()`);
  await waitFor(`Boolean(document.querySelector('[data-testid="challenge-scene"]'))`, 'Navegação direta não voltou à partida.');
  await client.evaluate(`history.back()`);
  await delay(700);
  const backState = await client.evaluate(`(() => { const raw=localStorage.getItem('nivvo-challenge-v3'); return {body:Boolean(document.body?.innerText.trim()),valid:Boolean(JSON.parse(raw)?.run?.id),recovery:document.body?.innerText.includes('Não foi possível continuar')}; })()`);
  assert(backState.body && backState.valid && !backState.recovery, 'Botão voltar deixou estado impossível.');

  await loadStoredRun(baselineStored);
  const secondTarget = await client.send('Target.createTarget', { url: challengeUrl, background: true });
  await delay(900);
  const targetList = await (await fetch(`http://localhost:${cdpPort}/json/list`)).json();
  const secondPage = targetList.find(item => item.id === secondTarget.targetId);
  const secondClient = new CdpClient(secondPage.webSocketDebuggerUrl);
  await secondClient.connect(); await secondClient.send('Runtime.enable'); await secondClient.send('Page.enable'); await secondClient.send('Log.enable');
  try {
    assert(await secondClient.evaluate(`Boolean(document.querySelector('[data-testid="challenge-intro"]'))`), 'Segunda aba não encontrou o progresso compartilhado.');
    await client.send('Target.activateTarget', { targetId: secondTarget.targetId });
    await secondClient.evaluate(`document.querySelector('.primary-action').click()`);
    for (let attempt = 0; attempt < 30 && !await secondClient.evaluate(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`); attempt += 1) await delay(100);
    assert(await secondClient.evaluate(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`), 'Segunda aba não retomou a partida ao ficar visível.');
    await secondClient.evaluate(`document.querySelectorAll('button[data-testid^="challenge-choice-"]:not(:disabled)')[1].click()`);
    for (let attempt = 0; attempt < 30 && !await secondClient.evaluate(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`); attempt += 1) await delay(100);
    await client.send('Target.activateTarget', { targetId: target.id });
    await waitFor(`Boolean(document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)'))`, 'Primeira aba não retomou ao voltar.');
    await client.evaluate(`document.querySelector('button[data-testid^="challenge-choice-"]:not(:disabled)').click()`);
    await waitFor(`Boolean(document.querySelector('[data-testid="challenge-feedback"]'))`, 'Primeira aba não concluiu após alternância.');
    const sharedState = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo-challenge-v3')).run`);
    assert(sharedState.phase === 'feedback' && sharedState.decisions.length === 1, 'Duas abas corromperam ou duplicaram a decisão.');
    assert(secondClient.errors.length === 0, `Erros na segunda aba: ${secondClient.errors.join(' | ')}`);
  } finally {
    secondClient.close();
    await client.send('Target.closeTarget', { targetId: secondTarget.targetId });
  }

  assert(client.failedResponses.length === 0, `Assets com erro: ${client.failedResponses.join(' | ')}`);
  assert(client.errors.length === 0, `Erros de console: ${client.errors.join(' | ')}`);
  console.log(JSON.stringify({ viewports: viewports.length, configuredQuestions: CHALLENGE_EVENTS.length, configuredFinalDecisions: CHALLENGE_BOSSES.length, auditedQuestionScreens, auditedFinalScreens, auditedRegularChoices, auditedFinalChoices, mobileScreensWithVerticalScroll, maxVerticalScroll, verticallyScrollableScreens, branchNetworkRequests, decisionNetworkRequests, invalidNamesRejected: 2, validNamesTested: validNames.length, keyboardViewport: '390x430', safariFallbacks: true, storageRecoveryCases: 4, offlineFullRun: true, visibilityPause: true, reloadDays: [1,4,7], reloadFinalDecision: true, resultPersisted: true, resultReload: true, rapidRefreshes: 3, orientationRoundTrip: true, backNavigation: true, reducedMotion: true, sharedProfileTabs: 2, forbiddenResultActions: 0, failedResponses: 0, consoleErrors: 0 }, null, 2));
} finally {
  client.close();
}
