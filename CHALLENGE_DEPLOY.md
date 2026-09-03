# Publicação do Desafio Nivvo

## Projeto Vercel

- **Root Directory:** `challenge-web`
- **Framework Preset:** Next.js
- **Install Command:** `npm install` (ou automático)
- **Build Command:** `npm run build`
- **Development Command:** `npm run dev`
- **Output Directory:** automático (`.next`)
- **Variáveis necessárias:** nenhuma

## Publicar

1. Entre na Vercel e importe este repositório.
2. Crie um novo projeto.
3. Em **Root Directory**, selecione `challenge-web`.
4. Confirme o framework Next.js e mantenha os comandos acima.
5. Faça o deploy.
6. Copie a URL `https://....vercel.app` entregue pela Vercel.

## Ligar a landing local ao endereço público

Na raiz do Nivvo principal, crie ou atualize `.env.local`:

```env
NEXT_PUBLIC_CHALLENGE_URL=
```

Cole a URL real fornecida pela Vercel depois do sinal `=`. Não adicione barra ou parâmetros desnecessários. Reinicie o Nivvo local com `npm run dev`, abra `http://localhost:3000/desafio` e confirme que o valor de `data-qr-value` do QR é exatamente a URL configurada.

Se a variável estiver ausente ou inválida, a landing mostra um estado de configuração e não renderiza um QR vazio.

## Testar antes de publicar

```bash
cd challenge-web
npm install
npm run lint
npm test
npm run build
npm run start
```

Depois, teste nome, sete dias, efeitos futuros, decisão final, resultado, reload e pausa ao trocar de aba.

## Roteiro da feira

### No PC da faculdade

1. Rode `npm install` na raiz.
2. Configure `NEXT_PUBLIC_CHALLENGE_URL` em `.env.local`.
3. Rode `npm run dev`.
4. Abra `/desafio` e coloque o navegador em tela cheia.

### Na Vercel

1. Importe o repositório.
2. Selecione `challenge-web` como Root Directory.
3. Faça o deploy e copie a URL.

### No celular

1. Abra a câmera e escaneie o QR.
2. Confirme que o Challenge abre diretamente.
3. Faça uma partida completa.
4. Confira Score, Rank e Nivvo ID.
