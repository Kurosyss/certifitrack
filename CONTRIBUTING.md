# Contributing to CertifiTrack

First off, thanks for taking the time to contribute!

## Local Development

CertifiTrack consists of two parts:
1. **Frontend**: Static Astro marketing and upload site.
2. **Backend**: Fastify API for processing documents and interfacing with the LLM providers.

### Prerequisites
- Node.js >= 20
- npm

### Setup

1. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables:**
   - Copy `.env.example` to `.env` in the root folder.
   - Copy `backend/.env.example` to `backend/.env`.
   - Add your API keys (e.g., `GEMINI_API_KEY`) to `backend/.env`.

4. **Start Development Servers:**
   - Frontend: `npm run dev` (Runs at http://localhost:4321)
   - Backend: `cd backend && npm run dev` (Runs at http://localhost:3000)

## Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.

## Adding Providers

Currently, we support `gemini` and `mock`. If you want to add a new provider (e.g., OpenAI or Anthropic):
1. Implement the `ExtractionProvider` interface.
2. Add it to `backend/src/services/extractionService.ts`.
3. Provide testing fixtures/mocks if necessary.
