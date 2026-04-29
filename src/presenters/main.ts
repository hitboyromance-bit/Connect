import type { SignupFormValues, LoginFormValues, ValidationResult } from '../types';
import { validateLoginValues, validateSignupValues } from '../utils/authValidation';

// Presenter interface for authentication
export interface AuthPresenter {
  validateSignupForm(values: SignupFormValues): ValidationResult;
  validateLoginForm(values: LoginFormValues): ValidationResult;
  presentSignupError(message: string): void;
  presentSignupSuccess(message: string): void;
  presentLoginError(message: string): void;
  presentLoginSuccess(message: string): void;
}

// Main presenter class implementing the presenter pattern
class MainPresenter implements AuthPresenter {
  private errorCallback: ((message: string) => void) | null = null;
  private successCallback: ((message: string) => void) | null = null;

  // Set callbacks for error and success presentation
  setErrorHandler(handler: (message: string) => void): void {
    this.errorCallback = handler;
  }

  setSuccessHandler(handler: (message: string) => void): void {
    this.successCallback = handler;
  }

  // Validate signup form
  validateSignupForm(values: SignupFormValues): ValidationResult {
    return validateSignupValues(values);
  }

  // Validate login form
  validateLoginForm(values: LoginFormValues): ValidationResult {
    return validateLoginValues(values);
  }

  // Present signup error
  presentSignupError(message: string): void {
    if (this.errorCallback) {
      this.errorCallback(message);
    }
    console.error('Signup Error:', message);
  }

  // Present signup success
  presentSignupSuccess(message: string): void {
    if (this.successCallback) {
      this.successCallback(message);
    }
    console.log('Signup Success:', message);
  }

  // Present login error
  presentLoginError(message: string): void {
    if (this.errorCallback) {
      this.errorCallback(message);
    }
    console.error('Login Error:', message);
  }

  // Present login success
  presentLoginSuccess(message: string): void {
    if (this.successCallback) {
      this.successCallback(message);
    }
    console.log('Login Success:', message);
  }
}

// Export singleton instance
export const mainPresenter = new MainPresenter();

// Export the presenter class for testing
export { MainPresenter };
