import { TFunction } from 'i18next';

interface ValidationResult {
  isValid: boolean;
  errorMessage: string;
}

export const validateName = (name: string, t: TFunction): ValidationResult => {
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      errorMessage: t('auth.validator.nameRequired'),
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
};

export const validateEmail = (email: string, t: TFunction): ValidationResult => {
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      errorMessage: t('auth.validator.emailRequired'),
    };
  }

  // RFC 5322 compliant email regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: t('auth.validator.emailInvalid'),
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
};

export const validatePassword = (password: string, t: TFunction): ValidationResult => {
  if (!password) {
    return {
      isValid: false,
      errorMessage: t('auth.validator.passwordRequired'),
    };
  }

  // Check for minimum length
  if (password.length < 8) {
    return {
      isValid: false,
      errorMessage: t('auth.validator.passwordTooShort'),
    };
  }

  // Check if password starts or ends with a space
  if (password.startsWith(' ') || password.endsWith(' ')) {
    return {
      isValid: false,
      errorMessage: t('auth.validator.passwordSpaces'),
    };
  }

  // Check for combination of letters, numbers, and/or symbols
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(password);

  if (!(hasLetter && (hasNumber || hasSymbol))) {
    return {
      isValid: false,
      errorMessage: t('auth.validator.passwordComplexity'),
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
};
