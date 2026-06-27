# Project Agent Notes

## Product Direction
- Build an original playable gem tower-defense game inspired by public GemCraft mechanics, not a copy of GemCraft assets, names, story, UI, maps.
- The desired look is a polished sun-bleached Mediterranean voxel island defense scene, visually aligned with the MIT reference project below.
- Do not return to the rejected dark arcade/cube-grid look. The field should read as an island diorama with paths, courtyards, water, decor, towers, and enemies, not a visible grid of cubes.
- Desktop only

## Gameplay References
- GemCraft overview: https://en.wikipedia.org/wiki/GemCraft
- Gemcraft Fandom main page: https://gemcraft.fandom.com/wiki/Gemcraft_Wiki
- Gemcraft Fandom gems/mechanics page: https://gemcraft.fandom.com/wiki/Gems
- Useful mechanics to preserve in original form: mana as resource/base life, gem-based towers, balance, combining/upgrading gems, waves, path defense, splash, slow, poison, chain, and critical-hit style effects.

## Tooling
- Use `pnpm` for all package operations. Do not use `npm install` or `yarn`.
- Vite is the local dev server and production bundler.
- Common commands: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview`.
- Cloudflare Pages should publish Vite's `dist/` output, not the project root.
- Keep runtime code as browser ES modules unless the project is explicitly migrated to TypeScript.
- Do not procedurally generate anything, use your tools to generate missing assets (always provide example from existing assets).
