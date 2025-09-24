export interface EmailValidationResult {
  isValid: boolean;
  message?: string;
  errors: string[];
}

export interface EmailValidationOptions {
  checkDisposable: boolean;
  checkDomain: boolean;
  allowSubdomains: boolean;
}

export interface EmailValidationCache {
  [email: string]: {
    result: EmailValidationResult;
    timestamp: number;
  };
}
