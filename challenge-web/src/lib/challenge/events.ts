import { ChallengeEvent } from '../../types/challenge';
import { CHALLENGE_XP } from './config';

const decisionXP = CHALLENGE_XP.decision;
const plannedXP = decisionXP + CHALLENGE_XP.plannedChoice;
const goalXP = decisionXP + CHALLENGE_XP.goalContribution;
const resolvedXP = decisionXP + CHALLENGE_XP.commitmentResolved;

/**
 * Situações curtas e determinísticas para os sete dias do desafio.
 * Os valores foram balanceados para R$ 680 disponíveis e uma meta de R$ 180.
 * Cada alternativa troca dinheiro disponível, meta, contas futuras ou planejamento.
 */
export const CHALLENGE_EVENTS: ChallengeEvent[] = [
  {
    id: 'delivery-friends',
    title: 'Chegou em casa cansado',
    description: 'Seus amigos vão pedir jantar. Você ainda precisa fazer o dinheiro durar.',
    category: 'Alimentação',
    kind: 'flexible',
    choices: [
      {
        id: 'delivery', label: 'Pedir comida com o grupo',
        description: 'R$ 62,00 · resolve rápido e mantém o combinado.',
        feedback: 'O jantar foi resolvido. Saíram R$ 62,00 do saldo.',
        effects: { balanceDelta: -62, xp: decisionXP, metrics: { planning: 1, commitments: 8 }, tags: ['food', 'delivery', 'relationship'] },
      },
      {
        id: 'split', label: 'Comprar algo pronto',
        description: 'R$ 41,00 · custa menos e você ainda participa.',
        feedback: 'Você gastou menos sem cancelar o encontro.',
        effects: { balanceDelta: -41, xp: plannedXP, metrics: { planning: 8, commitments: 4 }, tags: ['food', 'delivery', 'balanced'] },
      },
      {
        id: 'cook', label: 'Fazer o que tem em casa',
        description: 'R$ 24,00 · mexe pouco no saldo, mas muda o plano.',
        feedback: 'O jantar custou menos. O encontro ficou para outro dia.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -24, xp: plannedXP, metrics: { planning: 4, commitments: -4 }, tags: ['food', 'home'] },
      },
    ],
  },
  {
    id: 'freelance-payment',
    title: 'Caiu um Pix de R$ 120,00',
    description: 'Alguém pagou um valor que estava devendo para você.',
    category: 'Renda',
    kind: 'positive',
    choices: [
      {
        id: 'goal', label: 'Levar tudo para a meta',
        description: 'R$ 120,00 para a meta · o saldo disponível não aumenta.',
        feedback: 'A renda extra virou progresso direto no objetivo.',
        effects: { goalDelta: 120, xp: goalXP, metrics: { planning: 7 }, tags: ['income', 'goal'] },
      },
      {
        id: 'split-goal', label: 'Dividir o valor',
        description: 'R$ 60,00 na meta · R$ 60,00 ficam disponíveis.',
        feedback: 'O pagamento reforçou a meta e deu mais folga para a semana.',
        effects: { balanceDelta: 60, goalDelta: 60, xp: goalXP, metrics: { planning: 10 }, tags: ['income', 'goal', 'balanced'] },
      },
      {
        id: 'available', label: 'Deixar tudo disponível',
        description: 'R$ 120,00 no saldo · a meta não muda agora.',
        feedback: 'O dinheiro ficou disponível para os próximos dias.',
        effects: { balanceDelta: 120, xp: plannedXP, metrics: { planning: 5 }, tags: ['income', 'liquidity'] },
      },
    ],
  },
  {
    id: 'birthday-gift',
    title: 'Aniversário no fim de semana',
    description: 'Você combinou de ir ao aniversário de um amigo.',
    category: 'Compromisso',
    kind: 'consequence',
    choices: [
      {
        id: 'local', label: 'Comprar em uma loja próxima',
        description: 'R$ 66,00 · resolve hoje, com menos tempo para pesquisar.',
        feedback: 'O presente foi resolvido dentro do prazo.',
        effects: { balanceDelta: -66, xp: resolvedXP, metrics: { planning: 5, commitments: 11 }, tags: ['relationship', 'commitment-resolved'] },
      },
      {
        id: 'group', label: 'Entrar em um presente coletivo',
        description: 'R$ 42,00 · depende da organização do grupo.',
        feedback: 'O custo foi dividido e o grupo assumiu a entrega.',
        effects: { balanceDelta: -42, xp: plannedXP, metrics: { planning: 9, commitments: 7 }, tags: ['relationship', 'balanced'] },
      },
      {
        id: 'custom', label: 'Encomendar e pagar na entrega',
        description: 'R$ 24,00 agora · R$ 56,00 em dois dias.',
        feedback: 'A encomenda foi confirmada e criou um pagamento próximo.',
        effects: { balanceDelta: -24, commitmentDelta: 56, xp: decisionXP, metrics: { planning: 7, commitments: -5 }, tags: ['relationship', 'commitment-open', 'future-effect'] },
        allowShortfallAsCommitment: true,
        scheduledEffects: [{
          id: 'gift-delivery', delayDays: 2,
          title: 'Entrega do presente',
          description: 'A encomenda ficou pronta. Restam R$ 56,00 para pagar.',
          effects: { balanceDelta: -56, commitmentDelta: -56, metrics: { commitments: 5 }, tags: ['relationship', 'commitment-resolved'] },
        }],
      },
    ],
  },
  {
    id: 'home-maintenance',
    title: 'A pia começou a vazar',
    description: 'Dá para consertar hoje ou ganhar tempo. Se piorar, fica mais caro.',
    category: 'Casa',
    kind: 'consequence',
    choices: [
      {
        id: 'repair', label: 'Fazer o reparo completo',
        description: 'R$ 142,00 · encerra o problema hoje.',
        feedback: 'O vazamento foi resolvido antes de afetar outras despesas.',
        effects: { balanceDelta: -142, xp: resolvedXP, metrics: { planning: 5, commitments: 15 }, tags: ['home', 'necessary', 'commitment-resolved'] },
      },
      {
        id: 'temporary', label: 'Conter e agendar o reparo',
        description: 'R$ 48,00 agora · R$ 72,00 em três dias.',
        feedback: 'O risco imediato diminuiu e o reparo entrou na agenda.',
        effects: { balanceDelta: -48, commitmentDelta: 72, xp: plannedXP, metrics: { planning: 8, commitments: -5 }, tags: ['home', 'necessary', 'commitment-open', 'future-effect'] },
        scheduledEffects: [{
          id: 'scheduled-repair', delayDays: 3,
          title: 'Reparo agendado',
          description: 'O profissional voltou para concluir o serviço: R$ 72,00.',
          effects: { balanceDelta: -72, commitmentDelta: -72, metrics: { commitments: 7 }, tags: ['home', 'commitment-resolved'] },
        }],
      },
      {
        id: 'postpone', label: 'Adiar sem intervenção',
        description: 'Nada hoje · o reparo pode chegar a R$ 205,00 em dois dias.',
        feedback: 'Nada saiu do saldo hoje. O conserto pode ficar mais caro.',
        effects: { commitmentDelta: 185, xp: decisionXP, metrics: { planning: 2, commitments: -16 }, tags: ['home', 'commitment-open', 'future-effect'] },
        scheduledEffects: [{
          id: 'leak-damage', delayDays: 2,
          title: 'Vazamento agravado',
          description: 'A umidade alcançou o armário. O reparo agora custa R$ 205,00.',
          effects: { balanceDelta: -205, commitmentDelta: -185, metrics: { commitments: -2 }, tags: ['home', 'necessary'] },
        }],
      },
    ],
  },
  {
    id: 'small-expenses',
    title: 'Ainda faltam alguns dias',
    description: 'Café, água e lanches vão aparecer até o pagamento cair.',
    category: 'Planejamento',
    kind: 'flexible',
    choices: [
      {
        id: 'envelope', label: 'Separar um valor para os dias',
        description: 'R$ 54,00 · cria um limite até o fim da semana.',
        feedback: 'Os pequenos gastos ganharam um teto definido.',
        effects: { balanceDelta: -54, xp: plannedXP, metrics: { planning: 12, commitments: 3 }, tags: ['small-expenses', 'organized'] },
      },
      {
        id: 'digital-limit', label: 'Usar um limite diário',
        description: 'R$ 34,00 previstos · exige acompanhar cada gasto.',
        feedback: 'O valor ficou menor e passou a depender de acompanhamento diário.',
        effects: { balanceDelta: -34, commitmentDelta: 20, xp: plannedXP, metrics: { planning: 8 }, tags: ['small-expenses', 'balanced', 'commitment-open'] },
      },
      {
        id: 'day-by-day', label: 'Resolver conforme aparecer',
        description: 'R$ 18,00 hoje · até R$ 40,00 ficam sem cobertura.',
        feedback: 'A saída imediata foi menor; parte dos próximos gastos ficou em aberto.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -18, commitmentDelta: 40, xp: decisionXP, metrics: { planning: 5, commitments: -4 }, tags: ['small-expenses', 'commitment-open'] },
      },
    ],
  },
  {
    id: 'goal-opportunity',
    title: 'Sobrou um pouco mais hoje',
    description: 'Você pode guardar uma parte ou deixar o dinheiro disponível.',
    category: 'Meta',
    kind: 'saving',
    choices: [
      {
        id: 'save-90', label: 'Separar R$ 90,00',
        description: 'Metade da meta · sobram menos recursos para a semana.',
        feedback: 'Você colocou R$ 90,00 na meta.',
        effects: { balanceDelta: -90, goalDelta: 90, xp: goalXP, metrics: { planning: 7 }, tags: ['goal'] },
      },
      {
        id: 'save-50', label: 'Separar R$ 50,00',
        description: 'A meta avança e ainda sobra dinheiro para a semana.',
        feedback: 'Você guardou R$ 50,00 e manteve parte do dinheiro disponível.',
        effects: { balanceDelta: -50, goalDelta: 50, xp: goalXP, metrics: { planning: 11 }, tags: ['goal', 'balanced'] },
      },
      {
        id: 'liquid', label: 'Deixar o dinheiro disponível',
        description: 'Nada para a meta · o saldo fica livre para os próximos dias.',
        feedback: 'A meta não mudou. O dinheiro ficou no saldo.',
        effects: { xp: plannedXP, metrics: { planning: 6 }, tags: ['liquidity'] },
      },
    ],
  },
  {
    id: 'health-appointment',
    title: 'Precisa passar na farmácia',
    description: 'Um item que você usa acabou. As duas opções resolvem a necessidade.',
    category: 'Saúde',
    kind: 'necessary',
    choices: [
      {
        id: 'full-supply', label: 'Comprar para o mês',
        description: 'R$ 74,00 · atende a necessidade além desta semana.',
        feedback: 'O abastecimento ficou completo e consumiu mais saldo hoje.',
        effects: { balanceDelta: -74, xp: resolvedXP, metrics: { planning: 7, commitments: 14 }, tags: ['health', 'necessary', 'commitment-resolved'] },
      },
      {
        id: 'week-supply', label: 'Comprar para sete dias',
        description: 'R$ 28,00 · cobre a semana e deixa R$ 46,00 para depois.',
        feedback: 'A necessidade imediata foi atendida; a próxima compra ficou registrada.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -28, commitmentDelta: 46, xp: plannedXP, metrics: { planning: 9, commitments: 8 }, tags: ['health', 'necessary', 'commitment-open'] },
      },
    ],
  },
  {
    id: 'course-opening',
    title: 'Abriu uma vaga no curso',
    description: 'É um curso útil, mas a inscrição precisa ser paga esta semana.',
    category: 'Educação',
    kind: 'consequence',
    choices: [
      {
        id: 'cash', label: 'Pagar a inscrição',
        description: 'R$ 118,00 · você garante a vaga agora.',
        feedback: 'A inscrição foi paga e a vaga ficou garantida.',
        effects: { balanceDelta: -118, xp: plannedXP, metrics: { planning: 9, commitments: 7 }, tags: ['education', 'development'] },
      },
      {
        id: 'installment', label: 'Pagar em duas partes',
        description: 'R$ 52,00 agora e R$ 66,00 em três dias.',
        feedback: 'A vaga foi garantida. A segunda parte vence em três dias.',
        effects: { balanceDelta: -52, commitmentDelta: 66, xp: plannedXP, metrics: { planning: 8, commitments: -3 }, tags: ['education', 'commitment-open', 'future-effect'] },
        allowShortfallAsCommitment: true,
        scheduledEffects: [{
          id: 'course-second-payment', delayDays: 3,
          title: 'Segunda parte da inscrição',
          description: 'A segunda parte da inscrição venceu: R$ 66,00.',
          effects: { balanceDelta: -66, commitmentDelta: -66, metrics: { commitments: 6 }, tags: ['education', 'commitment-resolved'] },
        }],
      },
      {
        id: 'later', label: 'Esperar a próxima turma',
        description: 'Você mantém o dinheiro, mas perde esta vaga.',
        feedback: 'O dinheiro ficou disponível. O curso ficou para outra turma.',
        effects: { xp: decisionXP, metrics: { planning: 5, commitments: -7 }, tags: ['education', 'liquidity'] },
      },
    ],
  },
  {
    id: 'energy-bill',
    title: 'A conta vence amanhã',
    description: 'A conta de energia é de R$ 98,00. Adiar pode gerar multa.',
    category: 'Contas',
    kind: 'consequence',
    choices: [
      {
        id: 'pay-now', label: 'Quitar hoje',
        description: 'R$ 98,00 · encerra o compromisso agora.',
        feedback: 'A conta foi encerrada sem ocupar os próximos dias.',
        effects: { balanceDelta: -98, xp: resolvedXP, metrics: { planning: 4, commitments: 14 }, tags: ['necessary', 'commitment-resolved', 'bill'] },
      },
      {
        id: 'pay-part', label: 'Pagar parte e combinar o restante',
        description: 'R$ 58,00 agora · R$ 40,00 ficam pendentes.',
        feedback: 'Parte da conta saiu do caminho; o restante continua no orçamento.',
        effects: { balanceDelta: -58, commitmentDelta: 40, xp: plannedXP, metrics: { planning: 8, commitments: 2 }, tags: ['commitment-open', 'bill', 'balanced'] },
      },
      {
        id: 'negotiate', label: 'Mudar o vencimento',
        description: 'Nada hoje · a cobrança volta em três dias por R$ 112,00.',
        feedback: 'Nada saiu hoje. A conta volta em três dias por R$ 112,00.',
        effects: { commitmentDelta: 112, xp: decisionXP, metrics: { planning: 6, commitments: -12 }, tags: ['commitment-open', 'future-effect', 'bill'] },
        scheduledEffects: [{
          id: 'energy-rescheduled', delayDays: 3,
          title: 'Novo vencimento da energia',
          description: 'A conta renegociada voltou por R$ 112,00.',
          effects: { balanceDelta: -112, commitmentDelta: -112, metrics: { commitments: 4 }, tags: ['commitment-resolved', 'bill'] },
        }],
      },
    ],
  },
  {
    id: 'phone-promotion',
    title: 'Seu carregador parou',
    description: 'Você precisa resolver para continuar usando o celular.',
    category: 'Tecnologia',
    kind: 'saving',
    choices: [
      {
        id: 'buy', label: 'Comprar o original',
        description: 'R$ 238,00 · resolve agora e tem garantia maior.',
        feedback: 'O problema foi resolvido. R$ 238,00 saíram do saldo.',
        effects: { balanceDelta: -238, xp: resolvedXP, metrics: { planning: 4, commitments: 14 }, tags: ['technology', 'necessary', 'commitment-resolved'] },
      },
      {
        id: 'finance', label: 'Comprar um alternativo confiável',
        description: 'R$ 88,00 agora · R$ 170,00 ficam para depois.',
        feedback: 'O celular voltou a carregar. Ficou um pagamento para depois.',
        effects: { balanceDelta: -88, commitmentDelta: 170, xp: plannedXP, metrics: { planning: 8, commitments: -7 }, tags: ['technology', 'commitment-open', 'financed'] },
        allowShortfallAsCommitment: true,
      },
      {
        id: 'keep-and-save', label: 'Usar um emprestado por enquanto',
        description: 'R$ 60,00 para a meta · a compra fica para depois.',
        feedback: 'Você ganhou tempo e guardou R$ 60,00. O carregador continua pendente.',
        effects: { balanceDelta: -60, goalDelta: 60, commitmentDelta: 200, xp: goalXP, metrics: { planning: 10, commitments: -18 }, tags: ['technology', 'goal', 'commitment-open'] },
      },
    ],
  },
  {
    id: 'cross-town',
    title: 'Você está atrasado',
    description: 'Você precisa chegar em um compromisso. As rotas mais rápidas custam mais.',
    category: 'Transporte',
    kind: 'necessary',
    choices: [
      {
        id: 'app', label: 'Chamar um carro por aplicativo',
        description: 'R$ 56,00 · chega no horário.',
        feedback: 'Você chegou no horário e gastou R$ 56,00.',
        effects: { balanceDelta: -56, xp: decisionXP, metrics: { planning: 1, commitments: 12 }, tags: ['transport', 'necessary', 'time'] },
      },
      {
        id: 'public', label: 'Usar transporte público',
        description: 'R$ 14,00 · custa menos, mas você pode se atrasar.',
        feedback: 'A rota custou menos, mas o atraso afetou o compromisso do dia.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -14, xp: plannedXP, metrics: { planning: 5, commitments: -8 }, tags: ['transport', 'necessary', 'liquidity'] },
      },
      {
        id: 'mixed', label: 'Combinar as rotas',
        description: 'R$ 34,00 · reduz o custo e o risco de atraso.',
        feedback: 'A rota intermediária equilibrou tempo e saldo.',
        effects: { balanceDelta: -34, xp: plannedXP, metrics: { planning: 8, commitments: 7 }, tags: ['transport', 'necessary', 'balanced'] },
      },
    ],
  },
  {
    id: 'friends-night',
    title: 'Sábado à noite',
    description: 'Seus amigos chamaram você para sair.',
    category: 'Lazer',
    kind: 'flexible',
    choices: [
      {
        id: 'full', label: 'Participar da noite completa',
        description: 'R$ 96,00 · mantém todo o programa planejado.',
        feedback: 'Você foi ao encontro. Sobrou menos dinheiro para os próximos dias.',
        effects: { balanceDelta: -96, xp: decisionXP, metrics: { planning: 3, commitments: 10 }, tags: ['leisure', 'relationship'] },
      },
      {
        id: 'short', label: 'Chegar depois do jantar',
        description: 'R$ 44,00 · participa do encontro dentro de um limite.',
        feedback: 'Você participou e definiu até onde o orçamento podia ir.',
        effects: { balanceDelta: -44, xp: plannedXP, metrics: { planning: 8, commitments: 6 }, tags: ['leisure', 'relationship', 'balanced'] },
      },
      {
        id: 'home', label: 'Receber parte do grupo em casa',
        description: 'R$ 34,00 · custa menos, mas muda o combinado.',
        feedback: 'O encontro aconteceu em outro formato e com custo menor.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -34, xp: plannedXP, metrics: { planning: 6, commitments: 2 }, tags: ['leisure', 'relationship', 'home'] },
      },
    ],
  },
  {
    id: 'forgotten-subscription',
    title: 'Uma assinatura foi renovada',
    description: 'A cobrança foi de R$ 40,00. Você ainda usa o serviço de vez em quando.',
    category: 'Organização',
    kind: 'flexible',
    choices: [
      {
        id: 'keep', label: 'Manter o plano atual',
        description: 'R$ 40,00 · mantém todos os recursos usados no trabalho.',
        feedback: 'O plano continua igual e a cobrança ficou no mês.',
        effects: { balanceDelta: -40, xp: decisionXP, metrics: { planning: 3, commitments: 9 }, tags: ['subscription', 'work'] },
      },
      {
        id: 'cancel', label: 'Cancelar o próximo ciclo',
        description: 'R$ 40,00 · a cobrança atual fica, mas não se repete.',
        feedback: 'O ciclo atual foi mantido e a próxima renovação foi interrompida.',
        effects: { balanceDelta: -40, xp: plannedXP, metrics: { planning: 10, commitments: 2 }, tags: ['subscription', 'organized'] },
      },
      {
        id: 'downgrade', label: 'Mudar para o plano básico',
        description: 'R$ 28,00 após o crédito · mantém só o essencial.',
        feedback: 'O serviço foi reduzido e parte do valor voltou ao saldo.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -28, xp: plannedXP, metrics: { planning: 7, commitments: 5 }, tags: ['subscription', 'balanced'] },
      },
    ],
  },
  {
    id: 'market-restock',
    title: 'Faltou coisa em casa',
    description: 'Alguns itens acabaram antes do fim da semana.',
    category: 'Mercado',
    kind: 'necessary',
    choices: [
      {
        id: 'complete', label: 'Fazer a compra completa',
        description: 'R$ 154,00 · cobre a semana e evita outra ida.',
        feedback: 'A compra maior consumiu saldo agora e encerrou essa necessidade.',
        effects: { balanceDelta: -154, xp: resolvedXP, metrics: { planning: 9, commitments: 12 }, tags: ['food', 'market', 'necessary', 'commitment-resolved'] },
      },
      {
        id: 'essential', label: 'Levar apenas o essencial',
        description: 'R$ 96,00 · pode faltar um item em três dias.',
        feedback: 'A compra imediata ficou menor; uma reposição pode voltar nesta semana.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -96, commitmentDelta: 52, xp: plannedXP, metrics: { planning: 10, commitments: 3 }, tags: ['food', 'market', 'necessary', 'commitment-open'] },
        scheduledEffects: [{
          id: 'market-return', delayDays: 3,
          title: 'Reposição do mercado',
          description: 'Os itens essenciais acabaram antes do previsto: R$ 52,00.',
          effects: { balanceDelta: -52, commitmentDelta: -52, metrics: { commitments: 4 }, tags: ['food', 'market', 'commitment-resolved'] },
        }],
      },
      {
        id: 'bulk', label: 'Aproveitar a compra em volume',
        description: 'R$ 184,00 · maior gasto, com estoque além desta semana.',
        feedback: 'Você comprou mais agora e ficou com menos dinheiro disponível.',
        effects: { balanceDelta: -184, xp: decisionXP, metrics: { planning: 5, commitments: 15 }, tags: ['food', 'market', 'necessary', 'future-saving'] },
      },
    ],
  },
  {
    id: 'refund',
    title: 'Caiu um reembolso de R$ 80,00',
    description: 'Uma compra cancelada devolveu o dinheiro para você.',
    category: 'Renda',
    kind: 'positive',
    choices: [
      {
        id: 'goal', label: 'Direcionar para a meta',
        description: 'R$ 80,00 para a meta · nada entra no saldo disponível.',
        feedback: 'O valor recuperado virou progresso na meta.',
        effects: { goalDelta: 80, xp: goalXP, metrics: { planning: 8 }, tags: ['income', 'goal'] },
      },
      {
        id: 'split', label: 'Dividir o reembolso',
        description: 'R$ 40,00 para a meta · R$ 40,00 para a semana.',
        feedback: 'R$ 40,00 foram para a meta e R$ 40,00 ficaram disponíveis.',
        effects: { balanceDelta: 40, goalDelta: 40, xp: goalXP, metrics: { planning: 11 }, tags: ['income', 'goal', 'balanced'] },
      },
      {
        id: 'liquidity', label: 'Deixar tudo no saldo',
        description: 'R$ 80,00 no saldo · a meta não avança agora.',
        feedback: 'Os R$ 80,00 ficaram disponíveis para os dias restantes.',
        effects: { balanceDelta: 80, xp: plannedXP, metrics: { planning: 6 }, tags: ['income', 'liquidity'] },
      },
    ],
  },
  {
    id: 'work-lunch',
    title: 'Almoço com pouco tempo',
    description: 'Seu próximo compromisso começa logo. O lugar mais perto custa mais.',
    category: 'Alimentação',
    kind: 'flexible',
    choices: [
      {
        id: 'nearby', label: 'Comer no local mais próximo',
        description: 'R$ 49,00 · preserva o horário do próximo compromisso.',
        feedback: 'O tempo foi protegido com um custo maior na refeição.',
        effects: { balanceDelta: -49, xp: decisionXP, metrics: { planning: 1, commitments: 10 }, tags: ['food', 'time'] },
      },
      {
        id: 'menu', label: 'Buscar o prato do dia',
        description: 'R$ 31,00 · custa menos, mas deixa menos tempo livre.',
        feedback: 'Você almoçou por R$ 31,00 e chegou perto do horário.',
        effects: { balanceDelta: -31, xp: plannedXP, metrics: { planning: 7, commitments: 5 }, tags: ['food', 'balanced'] },
      },
      {
        id: 'snack-now', label: 'Lanche agora, refeição depois',
        description: 'R$ 18,00 hoje · cerca de R$ 24,00 ficam pendentes.',
        feedback: 'A saída imediata foi menor, mas parte da alimentação continuou em aberto.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -18, commitmentDelta: 24, xp: decisionXP, metrics: { planning: 5, commitments: -2 }, tags: ['food', 'commitment-open'] },
      },
    ],
  },
  {
    id: 'worn-shoes',
    title: 'Seu tênis rasgou',
    description: 'É o par que você usa todo dia. Consertar custa menos; trocar dura mais.',
    category: 'Compra necessária',
    kind: 'necessary',
    choices: [
      {
        id: 'repair', label: 'Consertar o par atual',
        description: 'R$ 68,00 · resolve agora, com possível troca de R$ 45,00 depois.',
        feedback: 'O tênis voltou ao uso e uma substituição futura ficou no radar.',
        effects: { balanceDelta: -68, commitmentDelta: 45, xp: plannedXP, metrics: { planning: 8, commitments: 6 }, tags: ['necessary', 'maintenance', 'commitment-open'] },
      },
      {
        id: 'replace', label: 'Comprar outro par',
        description: 'R$ 172,00 · maior impacto agora, sem manutenção pendente.',
        feedback: 'A necessidade foi encerrada com um desembolso maior.',
        effects: { balanceDelta: -172, xp: resolvedXP, metrics: { planning: 4, commitments: 14 }, tags: ['necessary', 'commitment-resolved'] },
      },
      {
        id: 'postpone', label: 'Usar uma solução provisória',
        description: 'R$ 10,00 · resolve por alguns dias e deixa a troca para depois.',
        feedback: 'A semana continuou, mas a troca permaneceu como compromisso.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -10, commitmentDelta: 125, xp: decisionXP, metrics: { planning: 3, commitments: -14 }, tags: ['necessary', 'commitment-open'] },
      },
    ],
  },
  {
    id: 'friend-repayment',
    title: 'Chegou sua parte',
    description: 'Você deve R$ 85,00 a um amigo. Uma conta de R$ 110,00 vence amanhã.',
    category: 'Compromisso',
    kind: 'consequence',
    choices: [
      {
        id: 'pay-friend', label: 'Pagar o amigo',
        description: 'R$ 85,00 hoje · a conta de R$ 110,00 vence amanhã.',
        feedback: 'O acordo pessoal foi cumprido e a conta ficou para o dia seguinte.',
        effects: { balanceDelta: -85, commitmentDelta: 110, xp: resolvedXP, metrics: { planning: 5, commitments: 5 }, tags: ['commitment-resolved', 'commitment-open', 'relationship', 'future-effect'] },
        scheduledEffects: [{
          id: 'next-day-bill', delayDays: 1,
          title: 'Conta do dia seguinte',
          description: 'A conta prevista venceu: R$ 110,00.',
          effects: { balanceDelta: -110, commitmentDelta: -110, metrics: { commitments: 5 }, tags: ['bill', 'commitment-resolved'] },
        }],
      },
      {
        id: 'reserve-bill', label: 'Quitar a conta primeiro',
        description: 'R$ 110,00 · os R$ 85,00 do amigo continuam pendentes.',
        feedback: 'A conta foi encerrada, e o acordo pessoal precisará ser reorganizado.',
        effects: { balanceDelta: -110, commitmentDelta: 85, xp: resolvedXP, metrics: { planning: 7, commitments: 8 }, tags: ['bill', 'commitment-resolved', 'commitment-open', 'relationship'] },
      },
      {
        id: 'split-and-negotiate', label: 'Pagar parte dos dois',
        description: 'R$ 75,00 agora · R$ 120,00 seguem negociados.',
        feedback: 'As duas prioridades receberam parte do valor e continuaram abertas.',
        effects: { balanceDelta: -75, commitmentDelta: 120, xp: plannedXP, metrics: { planning: 10, commitments: 2 }, tags: ['bill', 'relationship', 'balanced', 'commitment-open'] },
        allowShortfallAsCommitment: true,
      },
    ],
  },
  {
    id: 'early-essential-purchase',
    title: 'Algo que você precisa entrou em oferta',
    description: 'Custa R$ 158,00 hoje. Depois, deve voltar para R$ 220,00.',
    category: 'Oportunidade',
    kind: 'consequence',
    choices: [
      {
        id: 'buy-now', label: 'Comprar durante a oferta',
        description: 'R$ 158,00 · custa menos agora, mas pesa nesta semana.',
        feedback: 'Você aproveitou a oferta e ficou com menos dinheiro esta semana.',
        effects: { balanceDelta: -158, xp: plannedXP, metrics: { planning: 5, commitments: 10 }, tags: ['necessary', 'future-saving', 'commitment-resolved'] },
      },
      {
        id: 'reserve-part', label: 'Reservar uma parte',
        description: 'R$ 82,00 agora · R$ 78,00 ficam pendentes.',
        feedback: 'Parte da compra ficou coberta e o restante permaneceu planejado.',
        effects: { balanceDelta: -82, commitmentDelta: 78, xp: plannedXP, metrics: { planning: 11, commitments: 2 }, tags: ['necessary', 'balanced', 'commitment-open'] },
      },
      {
        id: 'wait', label: 'Comprar depois da oferta',
        description: 'Nada hoje · o preço sobe para R$ 220,00 em quatro dias.',
        feedback: 'Nada saiu hoje. O item deve custar R$ 220,00 depois.',
        effects: { commitmentDelta: 220, xp: decisionXP, metrics: { planning: 4, commitments: -12 }, tags: ['necessary', 'commitment-open', 'future-effect'] },
        scheduledEffects: [{
          id: 'regular-price', delayDays: 4,
          title: 'Fim da oferta',
          description: 'O item necessário voltou ao preço de R$ 220,00.',
          effects: { balanceDelta: -220, commitmentDelta: -220, metrics: { commitments: -2 }, tags: ['necessary'] },
        }],
      },
    ],
  },
  {
    id: 'home-internet',
    title: 'A internet caiu',
    description: 'Você precisa trabalhar de casa hoje.',
    category: 'Casa',
    kind: 'necessary',
    choices: [
      {
        id: 'express-repair', label: 'Chamar atendimento expresso',
        description: 'R$ 92,00 · restaura a conexão antes do compromisso.',
        feedback: 'A conexão voltou a tempo, com custo maior de urgência.',
        effects: { balanceDelta: -92, xp: resolvedXP, metrics: { planning: 3, commitments: 14 }, tags: ['home', 'work', 'necessary', 'commitment-resolved'] },
      },
      {
        id: 'mobile-data', label: 'Usar dados móveis hoje',
        description: 'R$ 36,00 · resolve o dia e deixa R$ 45,00 de reparo para depois.',
        feedback: 'O trabalho continuou, enquanto o reparo permaneceu pendente.',
        allowShortfallAsCommitment: true,
        effects: { balanceDelta: -36, commitmentDelta: 45, xp: plannedXP, metrics: { planning: 9, commitments: 4 }, tags: ['home', 'work', 'necessary', 'commitment-open'] },
      },
      {
        id: 'coworking', label: 'Trabalhar em outro local',
        description: 'R$ 58,00 · preserva o horário sem resolver o reparo.',
        feedback: 'O compromisso foi cumprido fora de casa; a conexão ainda precisará de atenção.',
        effects: { balanceDelta: -58, commitmentDelta: 25, xp: plannedXP, metrics: { planning: 7, commitments: 10 }, tags: ['work', 'necessary', 'balanced'] },
      },
    ],
  },
];

export function getChallengeEvent(eventId: string): ChallengeEvent | null {
  return CHALLENGE_EVENTS.find(event => event.id === eventId) ?? null;
}
