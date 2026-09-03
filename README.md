# Nivvo

Aplicação local de educação financeira com visão geral, gastos, metas, jornada e conquistas.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Arquitetura da feira

- **Nivvo principal:** roda localmente neste diretório. A rota `/desafio` é uma landing com QR Code.
- **Desafio online:** vive em `challenge-web`, possui build próprio e é publicado separadamente na Vercel.
- **Única ponte:** o QR contém a URL pública definida em `NEXT_PUBLIC_CHALLENGE_URL`. Não existe sincronização, API ou banco entre os aplicativos.

Depois de publicar o Challenge, crie `.env.local` na raiz:

```env
NEXT_PUBLIC_CHALLENGE_URL=
```

Cole a URL real fornecida pela Vercel depois do sinal `=`.

Reinicie `npm run dev` e abra `/desafio`. Veja [CHALLENGE_DEPLOY.md](./CHALLENGE_DEPLOY.md) para o roteiro completo.

## Comandos

```bash
npm run lint
npm run build
npm run challenge:dev
npm run challenge:test
npm run challenge:build
```
