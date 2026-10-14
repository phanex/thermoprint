# Project Workflow: Thermoprint

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`.
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` *before* implementation.
3. **Hardware & Protocol Safety:** Reverse-engineered protocols and low-level BLE byte sequences must be preserved with extreme care. Never alter working packet logic without hardware verification.
4. **Safety Pipeline (from GEMINI.md):** 
   - **Робимо -> Тестуємо -> Погоджуємо -> Лише тоді комітимо**: Ніколи не робити `git commit` до живої перевірки в браузері/на залізі та явного схвалення користувача.
   - **Жодного автоматичного `git push`**: Ніколи не виконувати `git push` самостійно або автоматично.
5. **Micro-Changelog Logging:** Кожна знахідка протоколу, виправлення або UI-рішення негайно фіксується в `CHANGELOG.md` під секцією `## [Unreleased]`.
6. **Test-Driven Development:** Write unit tests for core protocols, pipeline transformations, and parser logic before implementing.
7. **Code Coverage Target:** Aim for >80% code coverage for `@thermoprint/core` and non-canvas business logic.
8. **User Interaction & Operational Protocol:**
   - **Questions**: When the user asks a question, do NOT modify code; explain and answer clearly.
   - **Problem Reports**: When a problem/bug is pointed out, analyze root causes, design the fix, propose the plan/track, but do NOT execute changes prematurely.
   - **Action**: Implement changes strictly upon explicit user command ("do it", "fix it", "let's go").

---

## Task Workflow

All tasks follow a strict atomic lifecycle:

### Standard Task Workflow

1. **Select Task:** Choose the next available task from `plan.md` in sequential order.
2. **Mark In Progress:** Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`.
3. **Write Failing Tests (Red Phase):**
   - For core functions, create or expand unit tests verifying expected behavior.
   - Run the test suite (`bun test` in `packages/core`) and confirm failure.
4. **Implement to Pass Tests (Green Phase):**
   - Write the minimum amount of code to make tests pass.
   - Run tests again to confirm success.
5. **Refactor & Verify:**
   - Clean up code while keeping tests green.
   - Verify coverage meets the >80% threshold where applicable.
6. **Live Verification & Approval:**
   - Test in browser / on hardware.
   - Present result to user for explicit approval before staging commits.
7. **Record Micro-Changelog:**
   - Append technical details directly to `CHANGELOG.md` under `## [Unreleased]`.
8. **Commit Code Changes (Atomic per task):**
   - Stage all code changes related to the task.
   - Commit with conventional commit format (e.g. `feat(protocol): implement mark-m60 print command`).
9. **Attach Task Summary with Git Notes:**
   - Obtain commit hash (`git log -1 --format="%H"`).
   - Attach summary note: `git notes add -m "<task summary>" <commit_hash>`.
10. **Update and Commit Plan:**
    - Mark task as complete `[x] <hash>` in `plan.md`.
    - Commit plan update: `conductor(plan): Mark task '<Task Name>' as complete`.

---

## Development Commands

### Setup
```bash
yarn install
```

### Core Engine Development & Tests (`packages/core`)
```bash
# Run tests via Bun
bun test packages/core

# Typecheck
yarn --cwd packages/core typecheck
```

### Web Application (`packages/web`)
```bash
# Start Vite development server
yarn --cwd packages/web dev

# Lint
yarn --cwd packages/web lint

# Production build & typecheck
yarn --cwd packages/web build
```

---

## Definition of Done

A task is complete when:
1. Code implemented to specification.
2. Core unit tests passing.
3. Code follows style guidelines in `conductor/code_styleguides/`.
4. Strict UI design tokens observed (`text-ink-*`, `bg-ink-*`, `border-white/5` etc.).
5. Tested and explicitly approved by the user.
6. Entry added to `CHANGELOG.md` under `[Unreleased]`.
7. Atomic git commit created and task marked `[x]` in `plan.md`.
8. Summary attached via Git Notes.
