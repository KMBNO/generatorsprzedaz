/* ══════════════════════════════════════════════════════════════════
   Funkcja "monday" — pośrednik między generatorem a Monday API

   Bezpieczeństwo:
     • wpuszcza WYŁĄCZNIE zalogowanych użytkowników Supabase
       (sam klucz publiczny z kodu strony NIE wystarcza),
     • przeglądarka nie wysyła żadnego zapytania GraphQL — wybiera tylko
       jedną z dwóch tablic, a zapytanie jest zapisane tutaj na sztywno,
       więc nie da się nią czytać innych tablic ani niczego zapisać,
     • token Monday jest sekretem MONDAY_TOKEN i nie opuszcza serwera.

   Wdrożenie: Supabase → Edge Functions → monday → Code → wklej ten plik
   → Deploy. Sekret: Edge Functions → Secrets → MONDAY_TOKEN.
   ══════════════════════════════════════════════════════════════════ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// Skąd wolno wołać funkcję z przeglądarki
const ALLOWED_ORIGINS = ['https://kmbno.github.io'];

// Jedyne tablice i kolumny, które generator może odczytać
const BOARDS: Record<string, { id: string; columns: string[] }> = {
  agents:     { id: '5030473445', columns: ['text_mkxssedf', 'text_mm03t580', 'text_mkxsd32t'] },
  properties: { id: '5030499956', columns: ['text_mkx1kadg'] },
};

const QUERY = `query ($board: [ID!], $cols: [String!], $cursor: String) {
  boards(ids: $board) {
    items_page(limit: 500, cursor: $cursor) {
      cursor
      items { id name column_values(ids: $cols) { id text } }
    }
  }
}`;

function cors(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

Deno.serve(async (req: Request) => {
  const CORS = cors(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Tylko POST' }, 405);

  // 1. Tylko zalogowany użytkownik generatora
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!jwt) return json({ error: 'Brak autoryzacji — zaloguj się' }, 401);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
  if (authErr || !user) return json({ error: 'Nieprawidłowa sesja — zaloguj się ponownie' }, 401);

  // 2. Która tablica
  let body: { board?: unknown; cursor?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Nieprawidłowy JSON' }, 400); }
  const board = typeof body.board === 'string' ? BOARDS[body.board] : undefined;
  if (!board) return json({ error: 'nieznana tablica: ' + String(body.board ?? '') }, 400);
  const cursor = typeof body.cursor === 'string' && body.cursor.length < 2000 ? body.cursor : null;

  const token = Deno.env.get('MONDAY_TOKEN');
  if (!token) return json({ error: 'Brak sekretu MONDAY_TOKEN w Supabase' }, 500);

  // 3. Zapytanie do Monday (stałe, tylko odczyt)
  try {
    const res = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
      body: JSON.stringify({ query: QUERY, variables: { board: [board.id], cols: board.columns, cursor } }),
    });
    if (res.status === 401 || res.status === 403) return json({ error: 'token Monday odrzucony (' + res.status + ')' }, 502);
    if (res.status === 429) return json({ error: 'limit zapytań Monday — spróbuj za chwilę' }, 502);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return json({ error: 'Monday zwrócił HTTP ' + res.status }, 502);
    if (data.errors?.length) return json({ error: 'Monday: ' + (data.errors[0].message || 'błąd zapytania') }, 502);
    return json(data);
  } catch (e) {
    return json({ error: 'Monday nie odpowiada: ' + (e as Error).message }, 502);
  }
});
