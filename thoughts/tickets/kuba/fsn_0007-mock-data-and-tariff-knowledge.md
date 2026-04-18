# Mock personas + tariff domain knowledge

**Priority:** P0 (foundation — blocks FSN-0009/0010/0011)
**Demo:** required for turn 1 (pre-auth Q&A) and every later turn
**Track:** kuba

## Why

- `default_agent` must answer "What's the difference between G11 and G12?" WITHOUT calling any tool (demo turn 1).
- `verified_agent` must have real customer data after SMS OTP (turns 2–4).
- Without the mock data there is nothing for the FSN-0009/0010/0011 tools to query.

## Scope

### Mock data files

- `apps/main/src/lib/mock-data/tariffs.shared.ts`
  - 5 tariffs: G11, G12, G12w, G13, G14-dynamic.
  - Per tariff: `id`, `name`, `description`, `pricePerKwh: { peak: number, offPeak?: number, weekend?: number }` (PLN, 2026 URE), `fixedMonthlyFee: number`, `timeWindows?: { peak, offPeak, weekend }`.
  - Helper `estimateYearlyCost(tariffId, consumption: ConsumptionProfile): number`.

- `apps/main/src/lib/mock-data/personas.shared.ts`
  - 3 personas:
    - `anna-kowalska` — phone `+48600123456`, G11, single-family house, heat pump since 09/2025, appliances: `{washing machine, dryer, fridge, 65" TV}`.
    - `piotr-nowak` — phone `+48600222333`, G13, house + heat pump for years, appliances already optimised for night tariff.
    - `maria-prosument` — phone `+48600444555`, G12w + 6 kWp PV, prosumer under the post-2026-01-01 monthly rules.
  - Each persona: `id`, `phone` (no spaces), `name`, `address`, `currentTariffId`, `startedHeatPumpMonth?`, `hasPhotovoltaic: boolean`, `appliances: string[]`.
  - Helper `findPersonaByPhone(normalized: string): Persona | undefined`.

- `apps/main/src/lib/mock-data/consumption.shared.ts`
  - 36-month history (2023-04 to 2026-03) per persona.
  - Shape: `Record<PersonaId, MonthConsumption[]>` where `MonthConsumption = { month: "2025-10", kWh: number, kWhPeak: number, kWhOffPeak: number, kWhWeekend: number, invoiceAmountPln: number }`.
  - Anna: baseline ~350 kWh/mo, jumps to ~620 kWh from 10/2025 with a clear 17:00–22:00 peak.
  - Piotr: already on G13, mix 30/50/20 (peak/offPeak/weekend).
  - Maria: prosumer — kWh + a `generatedKwh` column.
  - Helper `detectAnomalies(monthConsumption: MonthConsumption[]): Anomaly[]` — flag months where `kWh > mean + 2*std`.

### Prompt updates

- `apps/main/src/graphs/chat/subgraphs/root/prompts/default-agent.prompt.md`:
  - Add a "### 2026 TAURON tariffs" section with a short description of G11/G12/G12w/G13/G14-dynamic + URE prices + intended audience.
  - Add one pre-auth FAQ-style paragraph on the end of the price freeze (01/2026).
  - Keep the existing routing action enum intact.

### Verify-phone node

- `apps/main/src/graphs/chat/subgraphs/root/nodes/verify-phone.node.ts`:
  - Before sending the SMS via BulkGate: check whether `findPersonaByPhone(phone)` hits. If yes — send the real SMS anyway, OR in dev (env `MOCK_PERSONAS=true`) skip the SMS and use fixed code `000000`.
  - In `verify-code.node.ts`: when `MOCK_PERSONAS=true` and `code === "000000"` → always pass. Keep the rest of the flow unchanged.

## Acceptance

- [ ] `pnpm -F main typecheck` passes.
- [ ] "What's the difference between G11 and G12?" on `/agent` returns a response containing concrete numbers (0.6485 PLN/kWh), with no tool call.
- [ ] After SMS OTP with phone `+48600123456` and code `000000` the session is verified and has access to Anna's data.
- [ ] `findPersonaByPhone("+48600123456")` returns Anna.
- [ ] `detectAnomalies(anna.consumption)` returns an anomaly in `2025-10`.
- [ ] `estimateYearlyCost("G13", anna.consumption)` is ~30% lower than `estimateYearlyCost("G11", anna.consumption)`.

## Implementation notes

- Data must be realistic (2026 URE prices — see `docs/02_tauron_research.md` section 3) but it is **test data** and the UI says so explicitly.
- Numbers can be hand-authored (not randomly generated) — the jury is judging presentation quality, not stochastic plausibility.
- `*.shared.ts` files follow the CLAUDE.md convention — importable from graph nodes and (if needed) from the client.
- `MOCK_PERSONAS=true` is the default in dev (`.env.local` shows it), disabled in prod. Do not hide this behind a runtime flag — an env var is enough.

## Out of scope

- Generating data via a script (not worth it — a single hand-crafted JSON file is cleaner).
- DB-backed storage (keeping data in `shared.ts` is simpler).
- Extra personas beyond the 3.
- Any fetch to external APIs (all data lives in the repo).
