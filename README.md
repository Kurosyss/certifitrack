# CertifiTrack

Turn existing Certificate of Insurance (COI) documents into structured data and Excel workbooks.

---

## Why CertifiTrack

In commercial construction, property management, and vendor onboarding, collecting Certificates of Insurance (COIs) is standard procedure. However, managing them is overwhelmingly manual: teams receive diverse ACORD 25 PDF forms and multi-page policies, then spend hours manually transcribing policy numbers, coverage limits, and expiration dates into spreadsheets.

CertifiTrack automates this transcription pipeline locally and statelessly, extracting core insurance fields and generating structured, audit-ready Excel workbooks without requiring SaaS subscriptions or permanent cloud databases.

---

## Features

- **COI & ACORD 25 Extraction**: Parses standard Certificate of Liability Insurance documents and extracts key parties, policies, dates, and limits.
- **Single PDF & ZIP Batch Processing**: Upload individual PDF certificates or a `.zip` archive containing multiple documents.
- **Normalized Dates & Limits**: Standardizes diverse date formats into canonical `YYYY-MM-DD` and sanitizes currency limits into numeric values.
- **Structured Fields**: Captures Named Insured, Certificate Holder, Producer/Broker, Carrier names, Policy Numbers, Effective/Expiration dates, and Occurrence/Aggregate limits.
- **Human Review Flagging**: Automatically flags ambiguous documents or missing critical fields with explicit reason codes (`INSUFFICIENT_EVIDENCE`) instead of guessing.
- **Excel (.xlsx) Workbook Generation**: Generates clean, formatted spreadsheets summarizing all processed certificates with source file lineage.
- **Deterministic Validation**: Rule-based validation verifies extracted fields against document text without hallucination.
- **Stateless & Temporary File Purge**: Temporary files and extracted buffers are completely deleted immediately after request completion.

---

## How It Works

```
Existing COI (PDF / ZIP)
       │
       ▼
   1. Parse & Decode Text Streams
       │
       ▼
   2. Multi-Signal Document Classification
       │
       ▼
   3. Extract Insurance Fields & Coverages
       │
       ▼
   4. Normalize Dates & Numeric Limits
       │
       ▼
   5. Deterministic Validation & Quality Gate
       │
       ▼
   6. Export Structured Excel (.xlsx) Workbook
```

---

## Supported Data

CertifiTrack extracts the following structured fields from supported insurance certificates:

| Category | Extracted Fields |
| :--- | :--- |
| **Certificate & Parties** | Named Insured, Certificate Holder, Producer / Broker, Carrier / Insurer Names |
| **General Liability** | Policy Number, Effective Date, Expiration Date, Each Occurrence Limit, General Aggregate Limit |
| **Automobile Liability** | Policy Number, Effective Date, Expiration Date, Combined Single Limit |
| **Workers Compensation** | Policy Number, Effective Date, Expiration Date, Statutory / E.L. Limits |
| **Excess / Umbrella** | Policy Number, Effective Date, Expiration Date, Occurrence Limit, Aggregate Limit |
| **Endorsements & Metadata** | Additional Insured, Waiver of Subrogation, Project / Operations Description, Source Filename |

---

## Architecture

- **Frontend**: [Astro](https://astro.build/) with [React](https://react.dev/) island components and [Tailwind CSS](https://tailwindcss.com/). Fully static multi-language routing (`en` / `es`).
- **Backend**: [Fastify](https://fastify.dev/) and TypeScript REST API with streaming multipart upload handling (`@fastify/multipart`).
- **Extraction Engine**:
  - **Deterministic Extractor**: Local PDF text stream decoding, FlateDecode decompression, and multi-signal regex classification. Operates 100% offline with zero external API calls.
  - **Optional External AI Provider**: Optional Google Gemini API integration (`@google/genai`) for multi-pass structured document extraction when configured.
- **Workbook Generation**: [ExcelJS](https://github.com/exceljs/exceljs) for generating structured `.xlsx` workbooks with formatted headers and data typing.

---

## Local Development

### Prerequisites
- Node.js >= 22.12.0
- npm >= 10.0.0

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Kurosyss/certifitrack.git
cd certifitrack

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd backend
npm install
cd ..
```

### Running Locally

```bash
# Option A: Start both frontend and backend concurrently
npm run dev:all

# Option B: Run in separate terminal sessions
# Terminal 1 (Backend API on http://127.0.0.1:3000):
npm run dev:backend

# Terminal 2 (Frontend on http://localhost:4321):
npm run dev
```

---

## Environment Variables

Copy the example environment files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration (optional)
cp .env.example .env
```

### Backend (`backend/.env`)

```env
PORT=3000
HOST=127.0.0.1
LOG_LEVEL=info

# Provider Selection: 'deterministic' (offline, default), 'gemini' (AI-assisted), or 'mock' (tests)
CERTIFITRACK_PROVIDER=deterministic

# Optional: Google Gemini API Key (only required if CERTIFITRACK_PROVIDER=gemini)
GEMINI_API_KEY=

# Upload Constraints
MAX_FILE_SIZE_BYTES=10485760
DOCUMENT_TIMEOUT_MS=30000
CONCURRENCY_LIMIT=3
```

---

## Testing

The backend test suite is powered by [Vitest](https://vitest.dev/).

```bash
# Run backend test suite
cd backend
npm test
```

**Test Coverage**: 8 test suites passing (26 total unit and integration tests covering deterministic stream extraction, ZIP safety, schema validation, Excel workbook generation, API endpoints, and cleanup lifecycle).

```bash
# Build static frontend application
npm run build
```

---

## Security

- **No Committed Secrets**: Credentials and API keys are strictly loaded via server-side environment variables and never exposed to the client bundle.
- **Archive Safety (Zip-Slip Prevention)**: ZIP file extraction validates absolute paths against target temp directories to prevent directory traversal attacks.
- **Stateless Processing**: Uploaded documents are saved to randomized UUID temp folders and deleted immediately after extraction in a mandatory `finally` block.
- **Input Validation**: Strict MIME type checking and file size bounds (10MB limit) prevent unhandled payloads.

---

## Privacy

- CertifiTrack operates statelessly without a database.
- Uploaded files exist only in volatile temporary directories during extraction.
- When running in deterministic mode (`CERTIFITRACK_PROVIDER=deterministic`), document data never leaves your machine.
- When configured with an external AI provider, document text/images are transmitted directly to the configured provider API.

---

## Limitations

- **Image-Only Scans**: Text-based deterministic extraction requires readable PDF font/text streams. Low-resolution image-only scans require OCR or an external multimodal AI provider.
- **Handwritten Documents**: Handwritten alterations or illegible photocopies cannot be deterministically extracted and are flagged for human review.
- **Informational Tool**: CertifiTrack is an extraction utility and does not provide legal, compliance, or insurance underwriting advice.

---

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/improvement`).
3. Ensure all tests pass (`npm test` in `backend/` and `npm run build` in root).
4. Commit your changes with clear messages (`git commit -m 'feat: add coverage field'`).
5. Push to your branch and open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Developer

Built and maintained by [Kurosyss](https://github.com/Kurosyss).
