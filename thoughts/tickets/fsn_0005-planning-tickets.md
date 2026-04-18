# Planning tickets

- Read:
  - `docs/01_overview.md`
  - `docs/02_tauron_research.md`
  - `docs/03_scope_and_user_stories.md`
  - all files in `thoughts/notes/tracks`
- We're crafting hackathon project primary focused on Tauron
- It's nice to qualify for other bounties (tracks)
- We want to be alligned to company communication
- Look for any company resources in `https://www.tauron.pl/`
  - explore this website deeply visiting other links and look for information about company and products there and also serach other web pages if relevant
- Allign to Tauron strategy: `https://raport.tauron.pl/strategia-i-perspektywy/strategia-grupy-tauron-do-2030-r-cele-i-priorytety/`
- Any feature we implement should be aligned to company offer if you find any information about it
- You can find my prev hackathon plans in `tmp/thoughts` - that works well for me

## Task

- You are tasked to create:
  - pitch
  - prd
  - high overview plan
  - user stories
  - progress-tracker
  - tickets in `thoughts/tickets`
- save output in `thoughts`
- Take into account current progress
- create tickets for what's to do in `docs/03_scope_and_user_stories.md`
- Create separate stories and tickets for:
  - agent UI for user - kuba
  - backoffice for Tauron employees/consultants - czarek
- separate folders for tickets for kuba and czarek
- agent UI is driven bu chat api - I will run playwright cli to progressively add features
  - I'll prompt Claude Code to visit `/agent` page to talk to chat
  - based on the responses from chat api it builds new features
