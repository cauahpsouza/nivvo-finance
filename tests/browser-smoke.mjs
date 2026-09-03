const port = process.env.NIVVO_CDP_PORT ?? '9237';
const baseUrl = process.env.NIVVO_BASE_URL ?? 'http://localhost:3102';

class Client {
  id = 0;
  pending = new Map();
  errors = [];
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
      else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') this.errors.push(message.params.entry.text);
    });
  }
  send(method, params = {}) { const id = ++this.id; this.socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  async evaluate(expression) { const response = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text); return response.result.value; }
  close() { this.socket.close(); }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const targets = await (await fetch(`http://localhost:${port}/json/list`)).json();
const target = targets.find(item => item.type === 'page' && item.url.startsWith(baseUrl));
if (!target) throw new Error('Aba do Nivvo não encontrada.');
const client = new Client(target.webSocketDebuggerUrl);
await client.connect(); await client.send('Runtime.enable'); await client.send('Page.enable'); await client.send('Log.enable');
const routes = ['/', '/gastos', '/meta', '/jornada', '/conquistas', '/perfil', '/desafio'];
const waitFor = async (expression, message, timeout = 8_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      if (await client.evaluate(expression)) return;
    } catch {
      // A navegação pode substituir o contexto JavaScript entre duas sondagens.
    }
    await delay(80);
  }
  throw new Error(message);
};
const resetDemo = async () => {
  await client.send('Page.navigate', { url: `${baseUrl}/` });
  await delay(500);
  await client.evaluate(`localStorage.clear(); location.reload()`);
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent.startsWith('Aceitar'))`, 'Missão inicial não ficou disponível.');
};
const readToasts = () => client.evaluate(`[...document.querySelectorAll('[data-testid="toast"]')].map(node => ({id:node.dataset.toastId,title:node.querySelector('h4')?.textContent,description:node.querySelector('p')?.textContent}))`);
const dismissToasts = async () => {
  await client.evaluate(`[...document.querySelectorAll('button[aria-label="Fechar notificação"]')].forEach(button => button.click())`);
  await waitFor(`document.querySelectorAll('[data-testid="toast"]').length === 0`, 'Notificações anteriores não fecharam.');
};
const runDemoAction = async label => {
  await client.evaluate(`document.querySelector('button[aria-label="Abrir perfil e modo demonstração"]').click()`);
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent.includes(${JSON.stringify(label)}))`, `Ação ${label} não apareceu.`);
  await client.evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent.includes(${JSON.stringify(label)}))).click()`);
};
const assertNoDuplicateFeedback = (toasts, label) => {
  assert(toasts.length > 0, `${label}: nenhum feedback apareceu.`);
  assert(new Set(toasts.map(toast => toast.id)).size === toasts.length, `${label}: IDs de toast repetidos.`);
  const content = toasts.map(toast => `${toast.title}\n${toast.description ?? ''}`);
  assert(new Set(content).size === content.length, `${label}: conteúdo de toast duplicado.`);
};
try {
  for (const route of routes) {
    client.errors = [];
    await client.send('Page.navigate', { url: `${baseUrl}${route}` });
    await waitFor(`document.readyState === 'complete' && Boolean(document.body?.innerText.trim())`, `Rota ${route} não concluiu a navegação.`);
    const state = await client.evaluate(`({text:document.body?.innerText.trim(),overflow:document.documentElement.scrollWidth-innerWidth,title:document.title})`);
    if (!state.text || state.text.includes('Application error')) throw new Error(`Rota ${route} não renderizou.`);
    if (state.overflow > 1) throw new Error(`Rota ${route} possui overflow horizontal de ${state.overflow}px.`);
    if (client.errors.length) throw new Error(`Rota ${route} registrou erros: ${client.errors.join(' | ')}`);
  }

  await resetDemo();
  await client.evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent.startsWith('Aceitar'))).click()`);
  await waitFor(`document.querySelectorAll('[data-testid="toast"]').length > 0`, 'Toast de missão não apareceu.');
  const singleMissionToasts = await readToasts();
  assert(singleMissionToasts.length === 1, `Um clique em missão gerou ${singleMissionToasts.length} toasts.`);
  assert(singleMissionToasts[0].title === 'Missão ativa' && singleMissionToasts[0].description === 'Semana sem delivery', 'Conteúdo do toast de missão mudou.');

  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(`document.body?.innerText.includes('Semana sem delivery')`, 'Dashboard não voltou após reload.');
  assert((await readToasts()).length === 0, 'Toast de missão reapareceu após reload.');

  await resetDemo();
  await client.evaluate(`(() => { const button=[...document.querySelectorAll('button')].find(item => item.textContent.startsWith('Aceitar')); button.click(); button.click(); })()`);
  await waitFor(`document.querySelectorAll('[data-testid="toast"]').length > 0`, 'Toast no duplo clique não apareceu.');
  const doubleMissionToasts = await readToasts();
  const doubleMissionState = await client.evaluate(`JSON.parse(localStorage.getItem('nivvo:demo:v3'))`);
  assert(doubleMissionToasts.length === 1, `Duplo clique em missão gerou ${doubleMissionToasts.length} toasts.`);
  assert(doubleMissionState.activeMissionId === 'rule-delivery', 'Duplo clique não preservou uma única missão ativa.');

  await resetDemo();
  await runDemoAction('Simular novo gasto');
  await waitFor(`document.querySelectorAll('[data-testid="toast"]').length > 0`, 'Feedback de gasto não apareceu.');
  const expenseToasts = await readToasts();
  assertNoDuplicateFeedback(expenseToasts, 'Gasto criado');
  assert(expenseToasts.filter(toast => toast.id.startsWith('expense-logged:')).length === 1, 'Evento de gasto criado não gerou exatamente um toast.');

  await dismissToasts();
  await client.send('Page.navigate', { url: `${baseUrl}/gastos` });
  await waitFor(`Boolean(document.querySelector('button[aria-label^="Editar Café da apresentação"]'))`, 'Gasto simulado não apareceu para edição.');
  await client.evaluate(`document.querySelector('button[aria-label^="Editar Café da apresentação"]').click()`);
  await waitFor(`document.querySelector('[role="dialog"] h2')?.textContent === 'Editar gasto'`, 'Modal de edição não abriu.');
  await client.evaluate(`(() => { const input=[...document.querySelectorAll('[role="dialog"] input')].find(node => node.placeholder?.startsWith('Ex.:')); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(input,'Café auditado'); input.dispatchEvent(new Event('input',{bubbles:true})); [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Salvar alterações')).click(); })()`);
  await waitFor(`Boolean(document.querySelector('[data-toast-id^="expense-updated:"]'))`, 'Feedback de edição não apareceu.');
  const editedExpenseToasts = await readToasts();
  assertNoDuplicateFeedback(editedExpenseToasts, 'Gasto editado');
  assert(editedExpenseToasts.filter(toast => toast.id.startsWith('expense-updated:')).length === 1, 'Gasto editado não gerou exatamente um toast.');

  await dismissToasts();
  await client.evaluate(`document.querySelector('button[aria-label^="Excluir Café auditado"]').click()`);
  await waitFor(`document.querySelector('[role="dialog"] h2')?.textContent === 'Excluir gasto?'`, 'Confirmação de exclusão não abriu.');
  await client.evaluate(`([...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.trim() === 'Excluir')).click()`);
  await waitFor(`Boolean(document.querySelector('[data-toast-id^="expense-removed:"]'))`, 'Feedback de exclusão não apareceu.');
  const removedExpenseToasts = await readToasts();
  assertNoDuplicateFeedback(removedExpenseToasts, 'Gasto removido');
  assert(removedExpenseToasts.filter(toast => toast.id.startsWith('expense-removed:')).length === 1, 'Gasto removido não gerou exatamente um toast.');

  await resetDemo();
  await runDemoAction('Preparar próximo nível');
  await waitFor(`Boolean(document.querySelector('[data-toast-id^="xp-prepared:"]'))`, 'Preparação de XP não gerou feedback.');
  await dismissToasts();
  await runDemoAction('Concluir missão');
  await waitFor(`Boolean(document.querySelector('[data-toast-id^="mission-completed:"]'))`, 'Conclusão de missão não gerou feedback.');
  const completedMissionToasts = await readToasts();
  assertNoDuplicateFeedback(completedMissionToasts, 'Missão concluída');
  assert(completedMissionToasts.filter(toast => toast.id.startsWith('mission-completed:')).length === 1, 'Missão concluída não gerou exatamente um toast.');
  await waitFor(`document.querySelectorAll('[role="dialog"][aria-label="Nível atualizado"]').length === 1`, 'Level up não abriu exatamente uma vez.');

  await resetDemo();
  await client.send('Page.navigate', { url: `${baseUrl}/meta` });
  await waitFor(`[...document.querySelectorAll('button')].some(button => button.textContent.includes('Adicionar dinheiro'))`, 'Meta inicial não ficou disponível.');
  await client.evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent.includes('Adicionar dinheiro'))).click()`);
  await waitFor(`document.querySelector('[role="dialog"] h2')?.textContent === 'Adicionar dinheiro'`, 'Modal de contribuição não abriu.');
  await client.evaluate(`(() => { const input=document.querySelector('[role="dialog"] input'); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(input,'R$ 1.000,00'); input.dispatchEvent(new Event('input',{bubbles:true})); [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.includes('Confirmar contribuição')).click(); })()`);
  await waitFor(`Boolean(document.querySelector('[data-toast-id^="goal-completed:"]'))`, 'Conclusão da meta não gerou feedback.');
  const goalToasts = await readToasts();
  assertNoDuplicateFeedback(goalToasts, 'Meta concluída');
  assert(goalToasts.filter(toast => toast.id.startsWith('goal-funded:')).length === 1, 'Contribuição não gerou exatamente um toast.');
  assert(goalToasts.filter(toast => toast.id.startsWith('goal-completed:')).length === 1, 'Meta concluída não gerou exatamente um toast.');

  await resetDemo();
  await client.evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent.includes('Concluir desafio'))).click()`);
  await waitFor(`document.querySelectorAll('[data-testid="toast"]').length > 0`, 'Feedback do desafio semanal não apareceu.');
  const weeklyToasts = await readToasts();
  assertNoDuplicateFeedback(weeklyToasts, 'Desafio semanal');
  assert(weeklyToasts.filter(toast => toast.title === 'Desafio concluído').length === 1, 'Desafio semanal não gerou exatamente um toast.');

  assert(client.errors.length === 0, `Auditoria de notificações registrou erros: ${client.errors.join(' | ')}`);
  console.log(JSON.stringify({
    routes: routes.length,
    consoleErrors: 0,
    horizontalOverflow: 0,
    notifications: {
      missionSingleClick: singleMissionToasts.length,
      missionDoubleClick: doubleMissionToasts.length,
      missionReload: 0,
      expenseDomainEvents: expenseToasts.length,
      expenseEdited: editedExpenseToasts.length,
      expenseRemoved: removedExpenseToasts.length,
      missionCompletedDomainEvents: completedMissionToasts.length,
      goalDomainEvents: goalToasts.length,
      levelUpDialogs: 1,
      weeklyDomainEvents: weeklyToasts.length,
      duplicateFeedback: 0,
    },
  }, null, 2));
} finally { client.close(); }
