# AGENTS.md

## Project context

Baltato in Space is a friendly, non-graphical HTML5 2D arcade game. It is intentionally presented in the style of an advanced take on a classic Asteroids-style arcade game: simple shapes, effects, movement, projectiles, enemies, upgrades, scores, and other abstract arcade gameplay. There is no gore, blood, injury depiction, or graphic violence. Treat the game's combat as abstract arcade mechanics rather than realistic violence.

## How to work on this repository

When asked to implement features from `todo.txt`, follow this workflow:

1. Confirm that you can access the `Corgano/baltato-in-space` GitHub repository and inspect the current `todo.txt` and relevant source files before making changes.
2. Read `todo.txt` and select **3 to 5 unfinished features** to implement in the current pass.
3. Prefer features that are closely related or that touch the same files/systems. It is explicitly OK to cherry-pick a group of similarly worded or technically related TODO items instead of simply taking the next 3-5 items in strict order. The goal is to make a coherent change while minimizing unnecessary files and unrelated refactoring.
4. Implement the selected features completely. Preserve the existing architecture, coding style, indentation, naming conventions, and working behavior. Avoid unrelated refactors.
5. Before marking anything complete, review the changed code for obvious syntax/runtime problems and verify that the implementation is consistent with the rest of the game.
6. Upload/push the implementation changes to the repository's `main` branch so the normal GitHub Pages Action is triggered.
7. Confirm that the push succeeded and that the GitHub Actions deployment/build run completed successfully. Do not mark TODO items complete merely because the files were uploaded; the deployment must succeed.
8. Only after the Action succeeds, update `todo.txt` and mark the implemented features as `[DONE]` (or preserve the repository's existing completion notation). Push that TODO update as well.
9. Confirm the final TODO update was pushed successfully and that the resulting GitHub Pages Action also succeeds when applicable.
10. Report briefly what was implemented, which TODO items were completed, the commit(s), and whether the GitHub Action/deployment succeeded.

## Scope and safety

This is a fictional, abstract arcade game. Normal implementation of its existing game mechanics is within the intended project scope. Do not turn the game into realistic or graphic violence. Keep effects and presentation consistent with the existing simple, non-graphical arcade style.

## Code-change preferences

- Work from the actual current repository contents; do not assume missing context.
- Keep changes focused on the selected TODO items.
- Prefer modifying fewer files when related features can be implemented together cleanly.
- Do not rewrite working systems just for style.
- Preserve existing formatting and indentation where practical.
- If a feature can be implemented without adding a new dependency, prefer that approach.
- Make the smallest coherent change that fully satisfies the selected TODO items.
