# 💰 Nivvo

### Plataforma web de educação financeira gamificada

---

## Sobre o projeto

O **Nivvo** é uma aplicação de educação financeira criada para tornar o controle das finanças pessoais mais simples, visual e interativo.

A plataforma reúne acompanhamento de gastos, metas financeiras, jornada de evolução e conquistas, utilizando elementos de gamificação para incentivar melhores decisões financeiras.

O projeto foi desenvolvido e apresentado na **FEC 2026 da UNIARA**.

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Visão geral | Resumo das principais informações financeiras |
| Gastos | Acompanhamento e organização de despesas |
| Metas | Criação e acompanhamento de objetivos financeiros |
| Jornada | Evolução do usuário dentro da plataforma |
| Conquistas | Sistema de progresso e recompensas |
| Desafio | Experiência interativa com decisões financeiras |
| Perfil | Visualização das informações e evolução do usuário |

---

## Desafio Nivvo

O projeto também possui uma experiência independente chamada **Desafio Nivvo**.

Por meio de um QR Code, o usuário acessa uma aplicação online onde precisa tomar decisões financeiras em diferentes situações.

O objetivo é mostrar, de maneira interativa, como pequenas escolhas podem impactar o planejamento financeiro.

---

## Estrutura

O projeto é dividido em duas aplicações:

```text
nivvo-finance/
│
├── Aplicação principal
│   ├── Visão geral
│   ├── Gastos
│   ├── Metas
│   ├── Jornada
│   ├── Conquistas
│   └── Perfil
│
└── challenge-web/
    └── Desafio financeiro online
```

A aplicação principal funciona localmente, enquanto o **Challenge Web** possui build próprio e pode ser publicado separadamente.

A comunicação entre os dois ocorre apenas através do QR Code.

---

## Como executar

Clone o repositório e instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://localhost:3000
```

---

## Challenge Web

O desafio está localizado em:

```text
challenge-web
```

Para executá-lo separadamente:

```bash
cd challenge-web
npm install
npm run dev
```

Após publicar o Challenge, crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_CHALLENGE_URL=
```

Adicione a URL pública do Challenge após o sinal `=`.

---

## Comandos

```bash
npm run dev
npm run lint
npm run build
```

---

## Contexto acadêmico

Projeto desenvolvido para a **FEC 2026 da UNIARA**, unindo desenvolvimento web, educação financeira e gamificação em uma experiência interativa.

---

### Desenvolvido por Cauã Souza
