import assert from 'node:assert/strict';
import test from 'node:test';
import { CHALLENGE_BOSSES, getChallengeBoss } from '../src/lib/challenge/bosses';
import { CHALLENGE_CONFIG, CHALLENGE_RUN_STORAGE_KEY } from '../src/lib/challenge/config';
import { CHALLENGE_EVENTS } from '../src/lib/challenge/events';
import {
  advanceChallengeDay,
  applyScheduledEffects,
  applyBossChoice,
  applyChallengeChoice,
  createChallengeRun,
  expireChallengeRun,
  finishBossIntro,
  finishChallengeTransition,
  getCurrentChallengeEvent,
  isChallengeChoiceAvailable,
  queueChallengeChoice,
  resolveQueuedChallengeChoice,
  sanitizeChallengeNickname,
  selectChallengeEvents,
} from '../src/lib/challenge/engine';
import { calculateChallengeRank, calculateChallengeScore, createChallengeResult } from '../src/lib/challenge/scoring';
import { ChallengeStorageLike, isValidChallengeRun, loadChallengeState, persistChallengeState } from '../src/lib/challenge/storage';
import { getChallengeTimerRemainingMs, pauseChallengeTimer, resumeChallengeTimer } from '../src/lib/challenge/timer';
import { ChallengeRun } from '../src/types/challenge';
import { formatCurrency } from '../src/lib/formatters';

const makeRun = (seed = 42) => createChallengeRun({ nickname: ' Ana ', seed, runId: `run-${seed}`, startedAt: '2026-08-25T12:00:00.000Z' });

class MemoryStorage implements ChallengeStorageLike {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test('cria uma experiência de sete dias com os valores originais', () => {
  const run = makeRun();
  assert.equal(run.nickname, 'Ana');
  assert.equal(run.balance, 680);
  assert.equal(run.goalAmount, 0);
  assert.equal(run.eventIds.length, 7);
  assert.equal(new Set(run.eventIds).size, 7);
  assert.deepEqual(run.eventIds, selectChallengeEvents(42));
});

test('normaliza o nome sem exigir unicidade entre aparelhos', () => {
  assert.equal(sanitizeChallengeNickname('  João   2  '), 'João 2');
  assert.equal(sanitizeChallengeNickname('                    '), '');
});

test('limite do nome não divide emoji nem preserva caracteres de controle', () => {
  const nickname = sanitizeChallengeNickname('1234567890123456789😀texto\n');
  assert.equal(nickname, '1234567890123456789😀');
  assert.equal(nickname.includes('\uFFFD'), false);
  assert.equal(nickname.includes('\n'), false);
});

test('efeitos futuros sobrevivem ao reload no armazenamento individual', () => {
  let run = makeRun(7);
  run = { ...run, eventIds: ['birthday-gift', ...run.eventIds.filter(id => id !== 'birthday-gift').slice(0, 6)] };
  const event = getCurrentChallengeEvent(run)!;
  const delayed = event.choices.find(choice => choice.scheduledEffects?.length)!;
  run = applyChallengeChoice(run, delayed.id);
  const storage = new MemoryStorage();
  assert.equal(persistChallengeState({ challengeSchemaVersion: 3, hydrated: true, run }, storage), true);
  const restored = loadChallengeState(storage, 1_000).run!;
  assert.equal(restored.scheduledEffects.length, run.scheduledEffects.length);
  assert.ok(storage.getItem(CHALLENGE_RUN_STORAGE_KEY));
});

test('cronômetro conta apenas quando está ativo e pausa corretamente', () => {
  const running = resumeChallengeTimer(makeRun(), 1_000);
  assert.equal(getChallengeTimerRemainingMs(running, 11_000), 110_000);
  const paused = pauseChallengeTimer(running, 11_000);
  assert.equal(getChallengeTimerRemainingMs(paused, 41_000), 110_000);
  const resumed = resumeChallengeTimer(paused, 41_000);
  assert.equal(getChallengeTimerRemainingMs(resumed, 51_000), 100_000);
});

test('cronômetro cobre limites e resolve a corrida entre toque e 00:00 uma vez', () => {
  const running = resumeChallengeTimer(makeRun(51), 1_000);
  const boundaries = [[2_000, 119_000], [61_000, 60_000], [101_000, 20_000], [111_000, 10_000], [116_000, 5_000], [120_000, 1_000], [121_000, 0], [200_000, 0]];
  for (const [nowMs, expected] of boundaries) assert.equal(getChallengeTimerRemainingMs(running, nowMs), expected);

  const choiceId = getCurrentChallengeEvent(running)!.choices.find(choice => isChallengeChoiceAvailable(running, choice))!.id;
  let accepted = queueChallengeChoice(running, choiceId, 120_999, '2026-08-25T12:01:59.999Z');
  for (let tap = 0; tap < 10; tap += 1) accepted = queueChallengeChoice(accepted, choiceId, 120_999, '2026-08-25T12:01:59.999Z');
  accepted = expireChallengeRun(accepted, '2026-08-25T12:02:00.000Z', 121_000);
  accepted = resolveQueuedChallengeChoice(accepted);
  assert.equal(accepted.decisions.length, 1);
  assert.equal(accepted.timedOut, false);

  const expired = queueChallengeChoice(running, choiceId, 121_000, '2026-08-25T12:02:00.000Z');
  assert.equal(expired.phase, 'time-expired');
  assert.equal(expired.decisions.length, 0);
  assert.equal(expired.decisionTimer.remainingMs, 0);
});

test('sete decisões e a decisão final produzem score, Rank e Nivvo ID', () => {
  let run = makeRun(19);
  for (let day = 1; day <= CHALLENGE_CONFIG.totalDays; day += 1) {
    const event = getCurrentChallengeEvent(run)!;
    const choice = event.choices.find(item => isChallengeChoiceAvailable(run, item))!;
    run = applyChallengeChoice(run, choice.id);
    run = advanceChallengeDay(run);
    if (day < CHALLENGE_CONFIG.totalDays) run = finishChallengeTransition(run);
  }
  assert.equal(run.phase, 'boss-intro');
  run = finishBossIntro(run);
  const finalDecision = getChallengeBoss(run.bossId ?? '')!;
  const choice = finalDecision.choices.find(item => isChallengeChoiceAvailable(run, item))!;
  const completed = applyBossChoice(run, choice.id, '2026-08-25T12:02:00.000Z', 120_000);
  assert.ok(completed.result);
  assert.match(completed.result!.nivvoId, /^NV-[A-Z0-9]{4}$/);
  assert.ok(['C', 'B', 'A', 'S'].includes(completed.result!.rank));
});

test('limites de score e Rank permanecem estáveis', () => {
  const organized: ChallengeRun = { ...makeRun(), goalAmount: 180, balance: 260, metrics: { planning: 95, commitments: 95 }, commitments: 0 };
  const pending: ChallengeRun = { ...makeRun(), goalAmount: 20, balance: 580, metrics: { planning: 20, commitments: 20 }, commitments: 180 };
  assert.ok(calculateChallengeScore(organized).score > calculateChallengeScore(pending).score);
  assert.equal(createChallengeResult(organized).rank, 'S');
  assert.equal(calculateChallengeRank(44).rank, 'C');
  assert.equal(calculateChallengeRank(45).rank, 'B');
  assert.equal(calculateChallengeRank(68).rank, 'A');
  assert.equal(calculateChallengeRank(88).rank, 'S');
});

test('estado inválido é descartado sem quebrar a abertura', () => {
  const storage = new MemoryStorage();
  storage.setItem(CHALLENGE_RUN_STORAGE_KEY, '{corrompido');
  const loaded = loadChallengeState(storage);
  assert.equal(loaded.run, null);
  assert.equal(storage.getItem(CHALLENGE_RUN_STORAGE_KEY), null);
});

test('schema antigo, fase impossível e storage indisponível falham com segurança', () => {
  const storage = new MemoryStorage();
  storage.setItem(CHALLENGE_RUN_STORAGE_KEY, JSON.stringify({ challengeSchemaVersion: 2, run: makeRun() }));
  assert.equal(loadChallengeState(storage).run, null);
  assert.equal(storage.getItem(CHALLENGE_RUN_STORAGE_KEY), null);

  const impossible = { ...makeRun(), phase: 'results' as const };
  assert.equal(isValidChallengeRun(impossible), false);
  storage.setItem(CHALLENGE_RUN_STORAGE_KEY, JSON.stringify({ challengeSchemaVersion: 3, run: impossible }));
  assert.equal(loadChallengeState(storage).run, null);

  const unavailable: ChallengeStorageLike = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(loadChallengeState(unavailable).run, null);
  assert.equal(persistChallengeState({ challengeSchemaVersion: 3, hydrated: true, run: makeRun() }, unavailable), false);
});

test('todos os efeitos futuros são aplicados no prazo e permanecem idempotentes', () => {
  const scheduledChoices = CHALLENGE_EVENTS.flatMap(event => event.choices.filter(choice => choice.scheduledEffects?.length).map(choice => ({ event, choice })));
  assert.ok(scheduledChoices.length > 0);
  for (const { event, choice } of scheduledChoices) {
    const base = makeRun(event.id.length + choice.id.length);
    const run = { ...base, balance: 10_000, eventIds: [event.id, ...base.eventIds.filter(id => id !== event.id)].slice(0, 7) };
    const chosen = applyChallengeChoice(run, choice.id);
    assert.equal(chosen.scheduledEffects.length, choice.scheduledEffects!.length, `${event.id}/${choice.id}`);
    const dueDay = Math.max(...chosen.scheduledEffects.map(effect => effect.dueDay));
    const applied = applyScheduledEffects(chosen, dueDay);
    const repeated = applyScheduledEffects(applied, dueDay);
    assert.equal(applied.appliedEffectIds.length, chosen.scheduledEffects.length, `${event.id}/${choice.id}`);
    assert.deepEqual(repeated, { ...applied, currentConsequences: [] }, `${event.id}/${choice.id}: consequência duplicada`);
  }
});

test('vinte sessões completas com caminhos variados terminam em resultado finito', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    let run = makeRun(1_000 + seed);
    for (let day = 1; day <= CHALLENGE_CONFIG.totalDays; day += 1) {
      const choices = getCurrentChallengeEvent(run)!.choices.filter(choice => isChallengeChoiceAvailable(run, choice));
      run = applyChallengeChoice(run, choices[(seed + day) % choices.length].id);
      run = advanceChallengeDay(run);
      if (day < CHALLENGE_CONFIG.totalDays) run = finishChallengeTransition(run);
    }
    run = finishBossIntro(run);
    const finalChoices = getChallengeBoss(run.bossId ?? '')!.choices.filter(choice => isChallengeChoiceAvailable(run, choice));
    run = applyBossChoice(run, finalChoices[seed % finalChoices.length].id, '2026-08-25T12:02:00.000Z', 121_000);
    assert.ok(run.result);
    assert.ok(Number.isFinite(run.result!.score) && run.result!.score >= 0 && run.result!.score <= 100);
    assert.ok(Object.values(run.result!.breakdown).every(value => Number.isFinite(value) && value >= 0 && value <= 100));
    assert.ok(Number.isFinite(run.balance) && Number.isFinite(run.goalAmount) && Number.isFinite(run.commitments));
    assert.doesNotMatch(formatCurrency(run.balance), /NaN|undefined|-0,00/);
  }
});

test('todas as 20 perguntas e as quatro decisões finais têm conteúdo e efeitos válidos', () => {
  assert.equal(CHALLENGE_EVENTS.length, 20);
  assert.equal(CHALLENGE_EVENTS.flatMap(event => event.choices).length, 59);
  assert.equal(CHALLENGE_BOSSES.length, 4);
  assert.equal(CHALLENGE_BOSSES.flatMap(decision => decision.choices).length, 12);

  const forbiddenVisibleText = /\b(?:boss|oficina|liquidez|ranking local|jogar novamente|voltar ao nivvo)\b/i;
  for (const event of CHALLENGE_EVENTS) {
    assert.ok(event.choices.length >= 2 && event.choices.length <= 3, `${event.id}: quantidade inesperada de opções`);
    const visibleText = [event.title, event.description, event.category];
    for (const choice of event.choices) {
      visibleText.push(choice.label, choice.description, choice.feedback);
      assert.ok(Object.values(choice.effects).every(value => typeof value !== 'number' || Number.isFinite(value)), `${event.id}/${choice.id}: efeito numérico inválido`);
      for (const scheduled of choice.scheduledEffects ?? []) {
        visibleText.push(scheduled.title, scheduled.description);
        assert.ok(scheduled.delayDays > 0, `${event.id}/${choice.id}: consequência sem prazo válido`);
      }

      const base = makeRun(event.id.length);
      const eventIds = [event.id, ...base.eventIds.filter(id => id !== event.id)].slice(0, CHALLENGE_CONFIG.totalDays);
      const run = { ...base, balance: 10_000, goalAmount: CHALLENGE_CONFIG.goalTarget, eventIds };
      const applied = applyChallengeChoice(run, choice.id);
      assert.equal(applied.decisions.length, 1, `${event.id}/${choice.id}: decisão não foi registrada`);
      assert.equal(applied.decisions[0].choiceId, choice.id);
    }
    assert.ok(visibleText.every(text => text.trim().length > 0), `${event.id}: texto visível vazio`);
    assert.equal(forbiddenVisibleText.test(visibleText.join(' ')), false, `${event.id}: texto antigo visível`);
  }

  for (const decision of CHALLENGE_BOSSES) {
    const visibleText = [decision.title, decision.description, decision.context];
    for (const choice of decision.choices) {
      visibleText.push(choice.label, choice.description, choice.feedback);
      const base = makeRun(decision.id.length);
      const run: ChallengeRun = {
        ...base,
        phase: 'boss',
        day: CHALLENGE_CONFIG.totalDays,
        bossId: decision.id,
        balance: 10_000,
        goalAmount: CHALLENGE_CONFIG.goalTarget,
        commitments: 500,
      };
      const applied = applyBossChoice(run, choice.id, '2026-08-25T12:02:00.000Z', 120_000);
      assert.ok(applied.result, `${decision.id}/${choice.id}: resultado final não foi criado`);
    }
    assert.ok(visibleText.every(text => text.trim().length > 0), `${decision.id}: texto final vazio`);
    assert.equal(forbiddenVisibleText.test(visibleText.join(' ')), false, `${decision.id}: texto antigo visível`);
  }
});
