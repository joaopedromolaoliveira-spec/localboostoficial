# Deploy `rizrmd/whatsapp-web-api` (Railway)

Passo a passo para colocar o servidor no ar e ligá-lo ao seu app LocalBoost.

## 1. Criar o serviço no Railway

1. **Railway → New Project → Deploy from GitHub Repo**
   - Repo: `rizrmd/whatsapp-web-api`
   - Ou: **Empty Service → Deploy Dockerfile** e cole o `Dockerfile` desta pasta.
2. **New → Database → PostgreSQL** (no mesmo projeto).

## 2. Copiar as Variables (aba **Variables** do serviço)

| Nome              | Valor                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `PORT`            | `8080`                                                                           |
| `DATABASE_URL`    | `${{Postgres.DATABASE_URL}}` (referência ao plugin Postgres)                     |
| `WA_WEBHOOK_URL`  | `https://localboostoficial.lovable.app/api/public/webhooks/waha`                 |

> As referências `${{Postgres.DATABASE_URL}}` só funcionam se o plugin Postgres
> estiver no mesmo projeto Railway. Caso use um Postgres externo, cole a URL
> completa `postgres://user:senha@host:5432/db`.

## 3. Expor uma URL pública

- **Settings → Networking → Generate Domain**. Anote a URL, por exemplo:
  `https://whatsapp-web-api-production-xxxx.up.railway.app`

## 4. (Opcional, mas recomendado) CORS

O binário Go **não** tem CORS aberto por padrão. Se o navegador reclamar de
CORS ao chamar `/pair`, coloque um proxy Caddy na frente. Exemplo `Caddyfile`:

```
:8080 {
  @cors header Origin *
  header {
    Access-Control-Allow-Origin  "*"
    Access-Control-Allow-Methods "GET,POST,OPTIONS"
    Access-Control-Allow-Headers "Content-Type"
  }
  @options method OPTIONS
  respond @options 204
  reverse_proxy http://localhost:9090
}
```

E rode o binário do WhatsApp em `PORT=9090`.

## 5. Testar rapidamente

```bash
curl https://SEU-DOMINIO.up.railway.app/health
curl https://SEU-DOMINIO.up.railway.app/pair
```

`/pair` deve retornar `qr_code` e `qr_image_url`.

## 6. Conectar no LocalBoost

No `.env` do projeto Lovable, defina:

```
VITE_WAHA_URL=https://SEU-DOMINIO.up.railway.app
```

Recarregue a página `/whatsapp` e clique em **Conectar WhatsApp** — o QR deve
aparecer.
