# ♻️ Como reutilizar este projeto para uma nova venda

Este site é uma **base reutilizável** de venda de ingressos/produtos por **Pix direto (sem taxa)**.
Para usar em um novo evento/venda, basta trocar alguns pontos e publicar.

## O que mudar

1. **`lib/config.ts`** — dados do evento: nome, artista, data/hora, local, endereço, WhatsApp, Instagram.
2. **`TICKET_PRICE_CENTS`** (variável de ambiente) — o preço, em **centavos** (ex.: `5000` = R$ 50,00).
3. **Chave Pix** (variáveis de ambiente) — se for outro recebedor: `PIX_KEY`, `PIX_NAME`, `PIX_CITY`.
4. **Artes** — troque os arquivos `public/poster.jpg` e `public/logo.jpg` pela arte nova (mesmos nomes).

> As artes de divulgação (story/feed) ficam em `marketing/`. Se quiser gerar novas no mesmo estilo, é só pedir.

## Onde ficam os segredos

Nunca vão para o GitHub. Ficam em dois lugares:

- **Local:** arquivo `.env.local` (já está no `.gitignore`). Veja o modelo em `.env.local.example`.
- **Produção (Vercel):** em *Project → Settings → Environment Variables*.

Variáveis usadas: `PIX_KEY`, `PIX_NAME`, `PIX_CITY`, `TICKET_PRICE_CENTS`, `MAX_PER_ORDER`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAIL_FROM`,
`ADMIN_PASSWORD`, `ADMIN_NOTIFY_EMAIL`, `NEXT_PUBLIC_SITE_URL`.

## Como publicar

- Fez as mudanças? Rode `git push` — a **Vercel republica sozinha** a cada push na branch `main`.
- Se mudar variável de ambiente na Vercel, faça um **Redeploy** para valer.

## Quer separar as vendas (um projeto por evento)?

1. Crie um repositório novo no GitHub.
2. Clone/duplique este projeto e aponte para o novo repositório.
3. Importe o novo repo na Vercel como um projeto novo e cadastre as variáveis de ambiente.

Assim cada evento tem seu próprio site, banco e link — sem misturar.

## Lembretes de operação

- Painel do organizador: **`/admin`** (senha em `ADMIN_PASSWORD`) — confirma pagamentos e tem o botão **"Adicionar venda externa"** para quem pagou por fora.
- Check-in na porta: **`/checkin`** (mesma senha) — leitor de QR pela câmera.
- Banco de dados novo? Rode o `supabase/schema.sql` no Supabase antes de usar.

Detalhes completos de configuração estão no [`README.md`](README.md).
