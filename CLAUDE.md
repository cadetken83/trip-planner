## Protected Files

### lib/content.ts — USER-EDITABLE TEXT
`lib/content.ts` is the single source of truth for all user-facing text in this app.
- NEVER modify `lib/content.ts` unless the user explicitly asks to change copy or wording.
- When adding features that need new UI text: add a key to the correct section in `lib/content.ts` and note the key name, but leave the actual wording blank or marked `"TODO"` — ask the user to fill it in.
- When editing components: import from `@/lib/content`, never hardcode new text strings inline.
- When refactoring components that already import from `lib/content.ts`: preserve all import paths and key names exactly.

@AGENTS.md
