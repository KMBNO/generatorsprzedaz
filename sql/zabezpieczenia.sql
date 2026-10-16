-- ══════════════════════════════════════════════════════════════════
--  KMBNO — Generator Umów Przedwstępnych: uprawnienia do danych
--  Supabase → SQL Editor → New query → wklej całość → Run.
--  Plik można uruchamiać wielokrotnie.
--
--  Zasada: pracownik po zalogowaniu może dane CZYTAĆ, ale nie może ich
--  zmienić ani usunąć z przeglądarki. Dane osobowe (pełnomocnicy,
--  mocodawca, podpis, listy awaryjne) zmienia się wyłącznie w panelu
--  Supabase (Table Editor), który omija te reguły.
--  Osoba niezalogowana nie widzi niczego.
-- ══════════════════════════════════════════════════════════════════

-- ─── Pełnomocnicy: tylko odczyt dla zalogowanych ───────────────────
alter table public.pelnomocnicy enable row level security;

drop policy if exists "peln_select" on public.pelnomocnicy;
drop policy if exists "peln_insert" on public.pelnomocnicy;
drop policy if exists "peln_update" on public.pelnomocnicy;
drop policy if exists "peln_delete" on public.pelnomocnicy;

create policy "peln_select" on public.pelnomocnicy
  for select to authenticated using (true);

revoke all on public.pelnomocnicy from anon;


-- ─── Ustawienia: odczyt dla zalogowanych, zapis tylko wybranych kluczy ─
--  Generator umów z wykonawcami zapisuje z przeglądarki dwa klucze
--  ('konfiguracja_wykonawcy', 'monday_token') — zostawiamy mu to,
--  żeby go nie zepsuć. Wszystkich pozostałych kluczy (w tym danych
--  osobowych 'przedwstepna_*') nie da się nadpisać ani usunąć z przeglądarki.
alter table public.ustawienia enable row level security;

drop policy if exists "ustawienia_select" on public.ustawienia;
drop policy if exists "ustawienia_insert" on public.ustawienia;
drop policy if exists "ustawienia_update" on public.ustawienia;
drop policy if exists "ustawienia_delete" on public.ustawienia;

create policy "ustawienia_select" on public.ustawienia
  for select to authenticated using (true);

create policy "ustawienia_insert" on public.ustawienia
  for insert to authenticated
  with check (klucz in ('konfiguracja_wykonawcy', 'monday_token'));

create policy "ustawienia_update" on public.ustawienia
  for update to authenticated
  using (klucz in ('konfiguracja_wykonawcy', 'monday_token'))
  with check (klucz in ('konfiguracja_wykonawcy', 'monday_token'));

revoke all on public.ustawienia from anon;


-- ─── Sprawdzenie ───────────────────────────────────────────────────
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('pelnomocnicy', 'ustawienia')
order by tablename, cmd;
