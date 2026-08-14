# `.pinata/` — Milo's harness contract

This folder is how Milo drives the **fiesta** automation harness as a tenant. The
harness reads these files at the pinned commit and holds no Milo-specific
knowledge of its own — everything Milo-specific lives here, in Milo's repo.

| File | What it declares |
|------|------------------|
| `manifest.yaml` | Milo's identity (`org`/`product`/`repo`), where ownership comes from, and which shared mental models the planner should use. |
| `gates.yaml` | Milo's verification gates. When present, these **replace** the harness's built-in default gate set. |
| `preview.yaml` | How to turn a branch + page into a live preview URL, for the visual gate. |
| `workflows/*.yaml` | Optional additional request classes; ordinary code tickets use Fiesta's default pipeline. |
| `scripts/` | Helper scripts a gate invokes (e.g. the block-structure check). |

## Gates

`gates.yaml` declares seven reusable gates, each bound to a platform template:

The same file declares `regeneration.max_candidates: 5`, the total candidate
budget shared by gates that route failures to `regenerate`. The acom floor caps
that value at 5; Milo may lower it without an engine deployment.

- **lint** — ESLint over `{js_files}`.
- **compat-lint** — Milo's browser-compatibility ESLint configuration.
- **stylelint** — Stylelint over `{css_files}`.
- **unit-tests** — Milo's canonical Web Test Runner command, with
  `test_globs: ["test/**/*.test.js"]` declaring its runnable domain. Fiesta
  derives affected entries inside that domain; neighboring Nala/Playwright
  suites are not compatible inputs to this gate.
- **block-structure** — `node .pinata/scripts/check-block-structure.mjs {changed_files}`:
  every changed `libs/blocks/<name>/` must contain both `<name>.js` and `<name>.css`.
  This check used to be hardcoded in the harness; declaring it here lets the
  harness stay generic.
- **adversary** — independent review that can send a rejected change through a
  bounded producer rebuild.
- **visual** — captures screenshot/video evidence and uses the vision verdict;
  failures enter the bounded producer rebuild declared by the gate.

The harness substitutes typed selectors with safe file sets and runs each
command in the worktree. It derives affected `{test_files}` from changed files,
repository layout, and the gate's durable runner domain, falling back to that
gate's complete runnable suite when needed.
Tickets do not add YAML or test mappings. A present `gates.yaml` replaces the
default gates, so this set is the complete list Milo runs.

Patch-coverage (Milo's 100% rule) stays enforced by Milo's existing CI (codecov);
it isn't duplicated here because the harness's `coverage` template measures total,
not patch, coverage.

## Preview

`preview.yaml`'s `pin_pattern` substitutes `{branch}` and `{page}`. On Edge
Delivery Services a branch is served at `<branch>--milo--<owner>.aem.page`, so the
visual gate can screenshot a branch's real rendering. Live capture requires the
fork to be connected to AEM Code Sync.

## Mental models

`manifest.yaml`'s `mental_models.use` lists the models Milo selects by id. The
**selection** is Milo's; the model **content** is shared and resolved from the
registry at run time (so the same models are reused across products rather than
copied into each repo).

## Ticket intake

Milo is onboarded once through this reusable contract. A normal Jira ticket—UI,
JavaScript, CSS, tests, tooling, or another code defect—goes through Fiesta's
default planner → codegen → verification → close pipeline without changing
`.pinata/`. A workflow file is only appropriate when Milo introduces a distinct
request class such as a release chore or migration process.
