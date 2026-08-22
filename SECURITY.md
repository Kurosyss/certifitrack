# Security Policy

## Supported Versions

Only the latest `main` branch of CertifiTrack is actively supported for security updates.

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests. 

Instead, please send an email or contact the maintainers directly. You should receive a response within 48 hours.

## Secure by Default

CertifiTrack is designed to be local-first. We strongly advise you to run the backend on `localhost` (127.0.0.1) and NOT expose it to the public internet unless you have configured proper authentication, TLS, and rate limiting layers via a reverse proxy (e.g., NGINX or Caddy).

Your API keys (e.g., `GEMINI_API_KEY`) should only be kept on your server or local environment and NEVER exposed to the frontend or committed to source control.
