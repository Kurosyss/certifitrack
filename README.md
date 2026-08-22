# CertifiTrack

CertifiTrack is a free, open-source, local-first tool for extracting and tracking Certificates of Insurance (COI) using Large Language Models (LLMs). It automates the extraction of structured data from complex COI documents (PDFs) and ZIP archives, producing a clean, standardized Excel (XLSX) tracker.

## Strategy & Model

CertifiTrack operates on a **Bring-Your-Own-API** (BYO-API) model. 

1. **Free Open-Source Core**: The application code is open-source and MIT-licensed.
2. **Local-First**: Data processing, extraction, and generation run entirely on your own hardware. Your documents are never stored in a central proprietary cloud database.
3. **Bring-Your-Own-API**: CertifiTrack uses your provided API keys (e.g., Google Gemini) to perform the intelligent extraction. You pay the LLM provider directly for usage.

## Features

- **Multi-Document Extraction**: Process individual PDFs or ZIP archives containing hundreds of COIs.
- **Intelligent Processing**: Powered by the Gemini API (or the local Mock provider for testing) to understand complex insurance forms with high accuracy.
- **Standardized Output**: Generates an `.xlsx` file summarizing coverages, limits, insured parties, and policy numbers.
- **High Security**: Stringent ZIP path-traversal checks, memory limits, and file constraints ensure stability and safety when processing untrusted documents.
- **No Database Needed**: Runs completely stateless. Extracts data, builds the tracker, and cleans up temporary files immediately.

## Quick Start

### 1. Requirements

- [Node.js](https://nodejs.org/) (version 20 or higher)
- [npm](https://www.npmjs.com/)

### 2. Setup

Clone the repository and install dependencies for both the frontend (Astro) and the backend (Fastify).

```bash
# Clone the repository
git clone https://github.com/yourusername/certifitrack.git
cd certifitrack

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 3. Configuration

You need to provide your Gemini API key. If you don't have one, you can get it from Google AI Studio.

1. **Backend Environment Variables**:
   Copy `.env.example` to `.env` in the `backend/` directory:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your key:
   ```env
   CERTIFITRACK_PROVIDER=gemini
   GEMINI_API_KEY=your_actual_key_here
   ```

2. **Frontend Environment Variables**:
   Copy `.env.example` to `.env` in the root directory:
   ```bash
   cp .env.example .env
   ```
   Ensure it has the correct public backend URL for local development:
   ```env
   PUBLIC_BACKEND_URL=http://127.0.0.1:3000
   ```

### 4. Run Locally

Start the backend:
```bash
cd backend
npm run dev
```

Start the frontend (in a new terminal):
```bash
npm run dev
```

Visit `http://localhost:4321` in your browser.

## Supported Providers

- `gemini`: Uses the Google Gemini API (`GEMINI_API_KEY` required).
- `mock`: Uses a deterministic local mock extraction provider for testing (No API key required).

Other providers (like OpenAI or Mistral) are not currently implemented out-of-the-box but can be easily added by implementing the `ExtractionProvider` interface.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## Security

Please refer to [SECURITY.md](SECURITY.md) for our security policies and how to report vulnerabilities.

## License

CertifiTrack is distributed under the [MIT License](LICENSE).
