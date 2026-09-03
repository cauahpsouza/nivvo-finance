'use client';

import { FormEvent, useState } from 'react';
import { ArrowRight, Clock3, Coins, Target } from 'lucide-react';
import { ChallengeRun } from '../../types/challenge';
import { CHALLENGE_CONFIG } from '../../lib/challenge/config';
import { isValidChallengeNickname, sanitizeChallengeNickname, truncateChallengeNickname } from '../../lib/challenge/engine';
import { formatCurrency } from '../../lib/formatters';
import { ChallengeHeader } from './ChallengeHeader';

export function ChallengeIntro({ existingRun, onStart, onContinue }: { existingRun: ChallengeRun | null; onStart: (name: string) => void; onContinue: () => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const sanitized = sanitizeChallengeNickname(name);
    if (!isValidChallengeNickname(sanitized)) { setError('Digite seu nome.'); return; }
    onStart(sanitized);
  };
  return (
    <div className="challenge-screen challenge-grid bg-brand-900 text-white">
      <ChallengeHeader />
      <main className="intro-shell">
        <section className="intro-copy">
          <p className="nivvo-kicker text-accent-500">Últimos 7 dias</p>
          <h1>Desafio<br /><span>Nivvo</span></h1>
          <p className="intro-lead">Faltam 7 dias para seu próximo pagamento. Depois das contas, sobraram:</p>
          <strong className="intro-money">{formatCurrency(CHALLENGE_CONFIG.startingBalance)}</strong>
          <div className="intro-facts" aria-label="Informações do desafio">
            <Fact icon={Coins} value="R$ 680" label="saldo" />
            <Fact icon={Target} value="R$ 180" label="meta" />
            <Fact icon={Clock3} value="02:00" label="tempo" />
          </div>
        </section>
        <section className="nivvo-panel intro-form" data-testid="challenge-intro">
          {existingRun ? (
            <>
              <p className="nivvo-kicker text-brand-600">{existingRun.phase === 'results' ? 'Semana concluída' : `Dia ${existingRun.day} de 7`}</p>
              <h2>Olá, {existingRun.nickname}.</h2>
              <p>{existingRun.phase === 'results' ? 'Seu resultado está pronto.' : 'Seu progresso ficou guardado neste celular.'}</p>
              <button type="button" className="primary-action" onClick={onContinue}>{existingRun.phase === 'results' ? 'Ver meu resultado' : 'Continuar desafio'} <ArrowRight size={18} /></button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="nivvo-kicker text-brand-600">Sua experiência</p>
              <h2>Como você se chama?</h2>
              <label htmlFor="challenge-name">Seu nome</label>
              <input id="challenge-name" data-testid="challenge-nickname" value={name} onChange={event => { setName(truncateChallengeNickname(event.target.value)); setError(''); }} autoComplete="name" enterKeyHint="go" autoFocus placeholder="Seu nome" aria-invalid={Boolean(error)} aria-describedby={error ? 'challenge-name-error' : undefined} />
              {error ? <p id="challenge-name-error" className="form-error" role="alert">{error}</p> : null}
              <button type="submit" className="primary-action" data-testid="challenge-start">Começar <ArrowRight size={18} /></button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function Fact({ icon: Icon, value, label }: { icon: React.ComponentType<{ size?: number }>; value: string; label: string }) {
  return <div><Icon size={15} /><strong>{value}</strong><span>{label}</span></div>;
}
