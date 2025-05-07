import { useState } from 'react';

type SetValueFunction<T> = (value: T | ((prevValue: T) => T)) => void;

/**
 * Helper functions to handle localStorage operations consistently
 */
const localStorageUtils = {
  /**
   * Saves a value to localStorage, removing the item if value is null
   */
  saveToStorage: <T,>(key: string, value: T): void => {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  },

  /**
   * Gets a value from localStorage with proper type casting
   */
  getFromStorage: <T,>(key: string, defaultValue: T): T => {
    const value = window.localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch (err) {
        console.error(`Error parsing localStorage value for key "${key}":`, err);
        return defaultValue;
      }
    }
    return defaultValue;
  },
};

export const useLocalStorage = <T,>(keyName: string, defaultValue: T): [T, SetValueFunction<T>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const value = localStorageUtils.getFromStorage(keyName, defaultValue);
      if (value === defaultValue && defaultValue !== null) {
        // Initialize localStorage if needed (but don't store null values)
        localStorageUtils.saveToStorage(keyName, defaultValue);
      }
      return value;
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return defaultValue;
    }
  });

  const setValue: SetValueFunction<T> = newValue => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = newValue instanceof Function ? newValue(storedValue) : newValue;

      // Save to state
      setStoredValue(valueToStore);

      // Save to localStorage using our utility function
      localStorageUtils.saveToStorage(keyName, valueToStore);
    } catch (err) {
      console.error('Error writing to localStorage:', err);
    }
  };

  return [storedValue, setValue];
};
