# Playwright automated end to end tests for Backoffice

- read `thoughts/tickets/fsn_0020-playwright-automated-e2e-tests.md` and all related files including plan and test script - that's sibling task
- test should be deterministic and should be for demo purposes - no need to depp dive
- I want it mostly for documentation purposes
- I will create a demo script from that to read for lector for video demo

## Features to test

Najważniejsze to dynamiczny FAQ i generowanie widgetów do czatu z poziomu backoffice.

Idea jest taka, że back office ma możliwość korygowania agenta AI przez pracownika Tauron bezpośrednio.

Jeżeli na jakieś pytania agent nie umie odpowiedzieć, albo odpowiedź się zmienia, to można dodać to do FAQ, i automatycznie jest to brane pod uwagę.

Dodatkowo, jeżeli jakiś problem jest trudny do rozwiązania, to mamy widżety, gdzie pracownik może w sposób wizualny przygotować komponent, który będzie prezentowany klientom, którzy skontaktują się z biurem obsługi klienta.