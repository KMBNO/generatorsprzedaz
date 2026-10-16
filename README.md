# KMBNO — Generator Umów Przedwstępnych

Generator umów przedwstępnych kupna-sprzedaży nieruchomości. Jeden plik `index.html`, bez backendu,
publikowany na GitHub Pages. Logowanie i wspólna historia umów: Supabase. Dane pośredników
i nieruchomości: Monday (przez funkcję `monday` na Supabase).

---

## 🔒 Zasada nr 1: żadnych danych osobowych w tym repozytorium

Repozytorium i strona są **publiczne**. Wszystko, co wpiszesz do `index.html`, może przeczytać
każdy w internecie, także w historii commitów, nawet jeśli potem to usuniesz.

**Nie wpisuj do kodu:** PESEL-i, numerów dowodów, adresów osób, numerów KW, numeru konta,
podpisu, tokenów API.

| Co | Gdzie jest | Jak zmienić |
|---|---|---|
| Pełnomocnicy KMBNO (tryb „Zdalnie”) | Supabase, tabela `pelnomocnicy` | Table Editor → `pelnomocnicy` |
| Mocodawca (pełnomocnictwo) | Supabase, `ustawienia` → `przedwstepna_mocodawca` | Table Editor → `ustawienia` |
| Numer konta do umów | `ustawienia` → `przedwstepna_konto` | jw. |
| Podpis (obrazek, base64) | `ustawienia` → `przedwstepna_podpis_b64` | jw. |
| Pośrednicy dopisani ręcznie | `ustawienia` → `przedwstepna_posrednicy_dodatkowi` | jw. |
| Listy awaryjne (gdy Monday nie działa) | `ustawienia` → `przedwstepna_posrednicy_awaryjni`, `przedwstepna_nieruchomosci_awaryjne` | jw. |
| Token Monday | sekret `MONDAY_TOKEN` funkcji `monday` | Edge Functions → Secrets |
| Pośrednicy, nieruchomości (na bieżąco) | Monday, tablice `5030473445` i `5030499956` | w Monday |

Dane wczytują się **dopiero po zalogowaniu**. Rejestracja w Supabase jest wyłączona, więc konto
może mieć tylko osoba dodana ręcznie (Authentication → Users). Gdy ktoś odchodzi z firmy,
**usuń jego konto** w Supabase.

---

## Zabezpieczenia

- **Funkcja `monday`** (`supabase/functions/monday/index.ts`) wpuszcza tylko zalogowanych
  użytkowników. Przeglądarka nie wysyła zapytań GraphQL, tylko nazwę tablicy (`agents`
  albo `properties`), więc funkcją nie da się czytać innych tablic ani nic zapisać.
- **Reguły w bazie** (`sql/zabezpieczenia.sql`): pracownik może dane czytać, ale nie może
  zmienić ani usunąć pełnomocników czy danych mocodawcy z przeglądarki. Niezalogowany nie widzi nic.
- **CSP**: strona może łączyć się wyłącznie z naszym Supabase, więc nawet wstrzyknięty skrypt
  nie wyśle danych na obcy serwer.
- **Biblioteki z CDN** mają przypięte wersje i sumy kontrolne (SRI), więc podmieniony plik się nie uruchomi.
- **Tekst z Monday, bazy, historii i Excela** jest czyszczony ze znaków `< > " \` \\`,
  zanim trafi na stronę.

---

## Uruchomienie / zmiany w Supabase

1. **Funkcja `monday`:** Supabase → Edge Functions → `monday` → Code → wklej
   `supabase/functions/monday/index.ts` → Deploy. Sekret `MONDAY_TOKEN` musi być ustawiony.
2. **Reguły:** SQL Editor → wklej `sql/zabezpieczenia.sql` → Run.
3. **Dane:** wpisuje się je w Table Editorze (patrz tabela wyżej), nigdy w kodzie.

---

## Struktura

```
index.html                           ← cała aplikacja (bez danych)
supabase/functions/monday/index.ts   ← funkcja pośrednicząca do Monday
sql/setup.sql                        ← tabela pełnomocników
sql/zabezpieczenia.sql               ← reguły dostępu (RLS)
```
