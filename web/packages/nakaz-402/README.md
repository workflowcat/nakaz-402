# nakaz-402

Tiny typed client for the [Nakaz МОУ № 402 public API](https://nakaz-402.vercel.app/api/docs/).

- Zero dependencies, ~3 KB
- Works in browsers, Node 18+, Deno, Bun, Cloudflare Workers
- All response types hand-mirrored from `/api/openapi.json`
- CC0 1.0 Universal

```bash
npm install nakaz-402
```

```ts
import { createClient } from 'nakaz-402';

const api = createClient();             // defaults to nakaz-402.vercel.app
const order = await api.getOrder();     // { order: '402', ministry: '…', signed_at: '2008-08-14', … }
const list  = await api.listAmendments();
console.log(list.count, list.items[0].summary);

const glava = await api.getPolozhennia('01-osnovy-organizatsii/01-zagalni-polozhennia');
console.log(glava.body_markdown.slice(0, 200));
```

### Self-hosting

If you mirror the data, override the base URL:

```ts
const api = createClient({ baseUrl: 'https://my-mirror.example.com' });
```

### Browser global

```html
<script type="module">
  import { createClient } from 'https://esm.sh/nakaz-402';
  const api = createClient();
  api.getOrder().then(o => document.title = o.title);
</script>
```

### Authoritative source

This client wraps an engineering replication. The authoritative source remains
[zakon.rada.gov.ua/laws/show/z1109-08](https://zakon.rada.gov.ua/laws/show/z1109-08).
