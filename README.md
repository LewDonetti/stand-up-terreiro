# 🏹🔥 Ingressos — Paulo Mansur na Flecha de Fogo

Site simples para vender ingressos do show **por Pix direto (sem taxa de plataforma)**.
O comprador se cadastra, paga no Pix da organizadora, e recebe o ingresso com QR Code
por e-mail. A entrada é validada por uma tela de check-in.

## Como funciona

1. **`/`** — página do evento.
2. **`/comprar`** — o comprador informa nome, e-mail, WhatsApp e quantidade.
3. **`/pedido/[ref]`** — mostra o **QR Code / copia-e-cola do Pix** com o valor já
   preenchido e permite anexar o comprovante.
4. **`/admin`** — a organizadora confere o Pix no extrato e clica **Confirmar**.
   Isso gera os ingressos e **envia o e-mail automaticamente**.
5. **`/checkin`** — na porta, escaneia o QR do ingresso para validar a entrada.

## Configuração (uma vez)

### 1. Banco de dados — Supabase (grátis)
1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo.
2. Menu **SQL Editor → New query** → cole o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Em **Project Settings → API**, copie a `Project URL` e a chave
   **`service_role`** (secreta).

### 2. E-mail — Gmail (grátis)
1. Na conta do Gmail que vai enviar os ingressos, ligue a **Verificação em 2 etapas**.
2. Crie uma **Senha de app** em <https://myaccount.google.com/apppasswords> (16 caracteres).
3. Preencha `GMAIL_USER`, `GMAIL_APP_PASSWORD` e `EMAIL_FROM` no `.env.local`.

### 3. Variáveis de ambiente
Copie `.env.local.example` para `.env.local` e preencha (chave Pix, preço,
Supabase, Gmail, senha do admin). **Nunca suba o `.env.local` para o GitHub.**

## Rodar localmente

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

## Publicar (deploy)

Suba o código para o GitHub e importe o repositório na **Vercel** ou no **Render**.
No painel do serviço, cadastre as mesmas variáveis do `.env.local`
(incluindo `NEXT_PUBLIC_SITE_URL` com a URL final). Pronto.

## Ajustes rápidos

- **Preço**: variável `TICKET_PRICE_CENTS` (em centavos, ex.: `5000` = R$ 50,00).
- **Dados do evento** (nome, data, local): [`lib/config.ts`](lib/config.ts).
- **Senha do painel**: variável `ADMIN_PASSWORD`.
- **Avisos por e-mail**: variável `ADMIN_NOTIFY_EMAIL` — recebe um e-mail a cada
  novo pedido e a cada comprovante enviado (deixe em branco para desativar).
