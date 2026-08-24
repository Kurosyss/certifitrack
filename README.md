# CertifiTrack

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)
![Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D%2020-blue?style=flat-square)

**Turn messy COI folders into structured, validated tracking spreadsheets.**

<p align="center">
  <img src="docs/images/hero-social.svg" alt="CertifiTrack Hero" width="100%">
</p>

[What is CertifiTrack?](#what-is-certifitrack) • [How it Works](#how-it-works) • [Quick Start](#quick-start) • [Providers](#providers) • [Privacy](#privacy--data-flow)

---

## What is CertifiTrack?

CertifiTrack is a free, open-source, local-first tool for compliance teams, risk managers, and operations staff who manually process dozens or hundreds of Certificates of Insurance (COIs). 

Instead of typing data by hand, CertifiTrack extracts structured data from complex PDFs and ZIP archives using Large Language Models (LLMs) and produces a clean, standardized Excel (XLSX) tracker.

<p align="center">
  <img src="docs/images/transformation.svg" alt="Before and After Transformation" width="100%">
</p>

### Why Local-First?
You control your infrastructure and your API keys. Instead of sending sensitive documents to a proprietary SaaS database, you process them locally on your own machine. CertifiTrack runs completely stateless and cleans up memory immediately.

---

## How it Works

CertifiTrack uses a **Bring-Your-Own-API** model. You run the app locally and supply your own API key for extraction.

<p align="center">
  <img src="docs/images/architecture.svg" alt="Architecture Diagram" width="800">
</p>

1. **Upload**: Drop a messy ZIP of COIs into the local web interface.
2. **Extraction**: The backend streams files to your configured AI Provider (e.g., Google Gemini).
3. **Validation**: CertifiTrack evaluates the structured JSON against standard insurance logic.
4. **Export**: It generates a flagged, readable `.xlsx` tracker.

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/certifitrack/certifitrack.git
cd certifitrack

# Frontend dependencies
npm install

# Backend dependencies
cd backend
npm install
```

### 2. Configure Environment
Copy the configuration files:
```bash
cp backend/.env.example backend/.env
cp .env.example .env
```
*(Ensure frontend `.env` points `PUBLIC_BACKEND_URL` to `http://127.0.0.1:3000`)*

### 3. Choose Provider (`backend/.env`)
Set your extraction provider in `backend/.env`:

**Gemini Mode (Real AI Extraction)**
```env
CERTIFITRACK_PROVIDER=gemini
GEMINI_API_KEY=your_actual_api_key_here
```

**Mock Mode (Local Testing)**
```env
CERTIFITRACK_PROVIDER=mock
```

### 4. Start Servers
```bash
# Terminal 1 (Backend)
cd backend && npm run dev

# Terminal 2 (Frontend)
npm run dev
```
Open `http://localhost:4321` and upload a ZIP to generate your tracker.

---

## Output Tracker

CertifiTrack generates a highly readable Excel workbook summarizing coverages, limits, insured parties, and policy numbers, complete with deterministic status flags.

<p align="center">
  <img src="docs/images/tracker-preview.svg" alt="Tracker Preview" width="100%">
</p>

---

## Configuration & Providers

CertifiTrack requires a provider to extract text from unstructured PDFs.

- **`gemini`**: Uses the Google Gemini API (Requires `GEMINI_API_KEY`).
- **`mock`**: Uses a deterministic local mock provider. Does not require an API key and is excellent for validating the local workflow.

*Note: OpenAI and Mistral providers are planned for future MVP iterations.*

---

## Privacy & Data Flow

- **Stateless & Local**: CertifiTrack itself stores no data. It does not use a database. Uploaded files are immediately deleted from temporary storage after extraction.
- **Data Transmission**: If you configure a cloud provider (like `gemini`), your document data **is transmitted** to that external API. You are responsible for reviewing your chosen provider's data retention policies.
- **Disclaimer**: AI extraction is for informational purposes only. It does not constitute legal or insurance compliance advice.

---

## Project Status

> **Note**: This is an early-stage Open-Source MVP.
> 
> The local application logic, validation engine, and mock pipelines are stable and tested. Real-world Gemini extraction benchmarking is currently pending unblocking of API quotas. 

## Roadmap

- [x] Local-first architecture
- [x] Bring-Your-Own-API model
- [x] Mock Provider
- [x] Gemini Provider
- [ ] OpenAI / Anthropic Providers
- [ ] Local Ollama Integration
- [ ] Custom Schema Definitions

---

## Support the Project

CertifiTrack is completely free and open source. If it saves your team hours of manual data entry or you want to support continued development:

☕ [Buy Me a Coffee](https://buymeacoffee.com/kurosys)

---

## Contributing & Security

- **Contributing**: Read [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to run the test suites (`vitest`) and submit Pull Requests.
- **Security**: For vulnerabilities (e.g., zip-slip or path traversal bypasses), please review our policy in [SECURITY.md](SECURITY.md).
- **License**: Released under the [MIT License](LICENSE).
