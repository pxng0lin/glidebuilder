# GlideBuilder

GlideBuilder turns raw smart-contract vulnerability reports into investigator-ready breakdowns and a starter Glider detection skeleton.

## Feature highlights

- **Echo-first AI generation** – Uses Merit Systems Echo models (`gpt-5-mini` default, `gpt-5-nano` fallback) to assemble focused Markdown summaries and boilerplate Glider code.
- **Dev-only local LLM option** – Forks can opt into an Ollama-compatible model by setting `LOCAL_LLM_ENABLED=true` in non-production environments.
- **Structured output contract** – Markdown is always delivered with three sections (Vulnerability Breakdown, Evidence & Code Snippets, Glider Detection Blueprint) plus a boilerplate Glider skeleton capped at `LIMIT_FUNCS = 1_000`.
- **Playful loading experience** – A looping video loader, animated background frame, and whimsical captions keep the UI lively while the AI responds.
- **Template + reference context** – AI prompts incorporate curated breakdown references and Glider helper templates loaded from disk.

## Architecture overview

- **Frontend**: Next.js 14 (App Router) + TypeScript, global styling in `app/globals.css`.
- **Auth & billing**: [`@merit-systems/echo-react-sdk`](https://echo.merit.systems/docs/getting-started/react) for sign-in and usage tracking.
- **Backend**: Next.js API route (`app/api/generate/route.ts`) backed by utilities in `backend/` for parsing, prompting, template loading, and AI calls.
- **Assets**: Video loader and background artwork live in `public/assets/`.

## Getting started

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and populate with your Echo credentials.

   Required:

   - `NEXT_PUBLIC_ECHO_APP_ID` – Echo application identifier
   - `NEXT_PUBLIC_ECHO_ENV` – Echo environment (defaults to `sandbox`)

3. **Run the development server**

   ```bash
   pnpm dev
   ```

   Visit [http://localhost:3000](http://localhost:3000) to sign in, upload a vulnerability report, and watch GlideBuilder generate the breakdown + skeleton.

## Optional: local dev model

Echo models remain the default in all environments. To experiment with a local Ollama-compatible model while developing or forking the repo:

1. Install and run Ollama (or a compatible API) locally.
2. Uncomment the `LOCAL_LLM_*` variables in `.env` and set the desired model name.
3. Ensure `LOCAL_LLM_ENABLED=true` **and** keep `NODE_ENV` set to anything except `production` (production builds ignore the local model flag).

When enabled, GlideBuilder hits the configured local endpoint instead of Echo for Markdown generation. Fallback logic is disabled in that mode—any failures fall back to a static Markdown summary.

## Project structure

```
app/
  api/generate/route.ts    # API route wiring parser + generator
  layout.tsx               # Root layout & providers
  page.tsx                 # Auth-aware dashboard entry point
backend/
  generator.ts             # Prompt construction and model invocation
  parser.ts                # Report parsing & metadata extraction
  template-loader.ts       # Loads templates from templates/gliders & breakdown references
  types.ts                 # Shared backend types
components/
  dashboard/               # Dashboard widgets (uploader, loader video, etc.)
lib/
  echo.ts                  # Echo SDK initialization helpers
public/assets/             # Background artwork and loader video
templates/
  gliders/                 # Boilerplate Glider helper templates (Python)
  breakdowns/              # Example breakdown references (Markdown)
tools/
  cli.ts                   # Scriptable entry point for batch generation
```

## UI anatomy

- **Report Uploader** – Accepts Markdown, captures optional “Source” tag, and manages generation status messaging.
- **Mixer Animation** – Plays a looping video (`/assets/loader-loop.mp4`) during AI calls with captions that shift between idle and loading states.
- **Background treatment** – `bg_frame.png` renders around the edges with a gentle orbit animation so the center content stays readable.

## Quality & maintenance

- Linting: `pnpm lint`
- Formatting: `pnpm format`
- Styles live in `app/globals.css`; prefer localized adjustments over utility sprawl.

## Deployment notes

- Provide Echo credentials (App ID, secret if needed) through your hosting provider.
- Include `templates/` and `public/assets/` in deployments; both are required for prompts and visuals.
- Disable `LOCAL_LLM_ENABLED` in production to ensure the app stays on Echo infrastructure.

### Preparing the repo for GitHub

1. Initialise Git (done once):

   ```bash
   git init
   git branch -m main
   ```

2. Review the working tree:

   ```bash
   git status -sb
   ```

3. Stage and commit the project:

   ```bash
   git add .
   git commit -m "chore: initial GlideBuilder import"
   ```

4. Create a GitHub repository (via the UI) and add it as a remote:

   ```bash
   git remote add origin git@github.com:<your-name>/glidebuilder.git
   git push -u origin main
   ```

### Deploying on Vercel

1. **Create a new Vercel project**

   - Sign in to [Vercel](https://vercel.com/), choose **Add New… → Project**, and import the GitHub repo you pushed above.

2. **Configure build settings**

   - Framework preset: **Next.js**.
   - Install command: `pnpm install` (Vercel detects `pnpm-lock.yaml` automatically).
   - Build command: `pnpm build`.
   - Output directory: `.next`.

3. **Set required environment variables** under **Project Settings → Environment Variables**:

   | Name | Environment | Value |
   | --- | --- | --- |
   | `NEXT_PUBLIC_ECHO_APP_ID` | All | Echo project app ID |
   | `NEXT_PUBLIC_ECHO_ENV` | All | Echo environment (`sandbox`, `production`, etc.) |

   Leave `LOCAL_LLM_*` unset so production stays on Echo-hosted models.

4. **Trigger the first deployment**

   - Vercel builds automatically when variables are saved and the repo is imported.
   - Subsequent pushes to `main` (or whichever branch you selected) create new deployments.

5. **Post-deployment checklist**

   - Visit the deployed URL and perform a smoke test (sign-in flow, report upload, skeleton rendering).
   - Optionally promote the deployment to production once the checks pass.

## License

This repository is currently unlicensed scaffolding. Add a license before distributing or deploying broadly.
