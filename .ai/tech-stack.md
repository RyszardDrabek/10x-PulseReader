Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:
- Github Actions do tworzenia pipeline’ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker

Testowanie - Kompleksowe rozwiązanie dla zapewnienia jakości kodu:
- Vitest 2.x jako framework do testów jednostkowych i integracyjnych (szybszy od Jest, natywna integracja z Vite)
- happy-dom jako lekkie środowisko testowe dla komponentów React (lżejsze niż jsdom)
- @testing-library/react i @testing-library/user-event do testowania komponentów React w sposób behawioralny
- @vitest/coverage-v8 do mierzenia pokrycia kodu testami (target: >80%)
- Playwright 1.x do testów end-to-end z wsparciem dla wielu przeglądarek (Chromium, Firefox, WebKit)
- Lighthouse CI do monitorowania wydajności (FCP <2s, LCP <2.5s, TTI <3.5s)
- k6 (Grafana Labs) do testów obciążeniowych z metrykami p50/p95/p99
- Snyk, Trivy i npm audit do skanowania bezpieczeństwa i podatności
- MSW v2 (Mock Service Worker) do mockowania API zewnętrznych (RSS, OpenRouter.ai)
- Historia do tworzenia biblioteki komponentów UI z interaktywnymi przykładami
- Codecov do śledzenia trendów pokrycia kodu przez czas