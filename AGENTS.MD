---
name: "Datadog APM Azure Vending Machine"
description: "React + TypeScript application for provisioning Azure App Services with Datadog APM instrumentation."
---

# Datadog APM Azure Vending Machine

## 📘 Project Overview

This is a frontend web app built with **React 19**, **TypeScript**, and **Create React App**, designed to help users enable **Datadog APM** on **Azure App Services** through a GitHub-hosted UI. It integrates Microsoft Authentication (MSAL) for login, provides an interactive form-based UX, and automates deployment flows.

## ⚙️ Tech Stack

- **Framework**: React 19 (via Create React App)
- **Language**: TypeScript
- **Auth**: Azure AD via `@azure/msal-browser` and `@azure/msal-react`
- **Form Handling**: React Hook Form + Zod
- **Data Fetching**: TanStack React Query
- **Validation**: Zod schema validation
- **Linting & Formatting**: ESLint + Prettier
- **Testing**: Jest + React Testing Library + MSW
- **Deployment**: `gh-pages` (static hosting)

## 🗂️ Project Structure

```
.
├── public/                     # Static assets
├── src/
│   ├── components/             # UI components
│   ├── pages/                  # Main route containers
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API and Azure service logic
│   ├── forms/                  # React Hook Form schemas + UI
│   ├── auth/                   # MSAL configuration & logic
│   ├── types/                  # Global TS types
│   ├── utils/                  # Helper functions
│   └── index.tsx              # Entry point
├── tests/                      # Unit and integration tests
├── .eslintrc.js                # ESLint rules
├── .prettierrc                 # Prettier config
├── tsconfig.json               # TypeScript config
├── package.json
└── README.md
```

## 🚀 Development Workflow

### 🧱 Prerequisites

- **Node.js ≥ 18**
- **Yarn or npm**
- Azure credentials (via MSAL)
- Datadog API key (passed via form or env var)

### 🛠️ Local Setup

```bash
git clone https://github.com/petems/azure-app-services-for-datadog-vending-machine
cd azure-app-services-for-datadog-vending-machine
yarn install
yarn start
```

This will launch the app on [http://localhost:3000](http://localhost:3000) using Vite dev server.

## 🧪 Testing Strategy

### Run all tests:

```bash
yarn test
```

### Run with coverage:

```bash
yarn test:coverage
```

- Uses `jest-environment-jsdom`
- Mocks Azure + Datadog APIs via [MSW](https://mswjs.io/)
- Asserts on APM payloads, validation, UI flows

## 🧹 Linting & Formatting

```bash
yarn lint       # Fixable lint issues via ESLint
yarn format     # Format all code via Prettier
yarn type-check # Run tsc in --noEmit mode
```

## 🏗 Build & Deploy

```bash
yarn build      # Runs TypeScript build + CRA production build
yarn deploy     # Publishes to GitHub Pages
```

Pages are auto-hosted at: `https://<username>.github.io/azure-app-services-for-datadog-vending-machine`

## 🔐 Authentication

- Uses `@azure/msal-browser` and `@azure/msal-react`
- Users must sign in via Azure AD to proceed
- Tokens are cached and passed to internal API services

## ✍️ Form + Validation Strategy

- UI forms built using **React Hook Form**
- Validation powered by **Zod schemas**
- API payloads structured to match ARM/Datadog requirements

```ts
import { z } from "zod";

export const APMConfigSchema = z.object({
  siteName: z.string().min(1),
  ddApiKey: z.string().length(32),
  ddSite: z.enum(["datadoghq.com", "datadoghq.eu", "us3.datadoghq.com"]),
  env: z.string(),
  service: z.string(),
});
```

## 🧠 React App Behavior

- **Initial state**: User must log in with Azure
- **Main flow**:
  1. Auth → config form → submit
  2. UI calls Azure APIs and Datadog APIs to configure site
  3. Success and errors shown via UI

- **Error handling**:
  - Uses `React Query` error boundaries
  - Form validation + API fallback errors
  - Logs sent to console and optionally to Datadog (via future tracing support)

## 🛡️ Security Considerations

- Sensitive values like API keys are:
  - Never logged
  - Stored only in session/localStorage (if needed)
- Authentication handled by official Azure MSAL SDKs
- Uses HTTPS-only deployment

## 🔁 CI Recommendations (if added)

- Run `yarn type-check`, `lint`, `test:coverage` on PRs
- Deploy preview using GitHub Pages Action
- Validate `.env` variables and Azure credentials via secrets

## 📚 Reference Docs

- [React Docs](https://react.dev/)
- [MSAL React](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react)
- [Datadog APM](https://docs.datadoghq.com/tracing/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [TanStack Query](https://tanstack.com/query/v5)
