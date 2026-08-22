export class APIError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class BadRequestError extends APIError {
  constructor(message: string, details?: any) {
    super(400, message, details);
    this.name = "BadRequestError";
  }
}

export class PayloadTooLargeError extends APIError {
  constructor(message: string = "File too large") {
    super(413, message);
    this.name = "PayloadTooLargeError";
  }
}

export class UnsupportedMediaTypeError extends APIError {
  constructor(message: string = "Unsupported file type") {
    super(415, message);
    this.name = "UnsupportedMediaTypeError";
  }
}

export class UnprocessableEntityError extends APIError {
  constructor(message: string = "Invalid or corrupt document") {
    super(422, message);
    this.name = "UnprocessableEntityError";
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = "Too many requests") {
    super(429, message);
    this.name = "RateLimitError";
  }
}

export class UpstreamProviderError extends APIError {
  constructor(message: string = "Upstream provider unavailable") {
    super(502, message);
    this.name = "UpstreamProviderError";
  }
}
