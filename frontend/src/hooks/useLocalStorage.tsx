import { useState } from 'react';

// ===============================
// Types and Interfaces
// ===============================

type SetValueFunction<T> = (value: T | ((prevValue: T) => T)) => void;

// ===============================
// Helper Utilities
// ===============================

/**
 * Helper functions to handle localStorage operations with smarter type handling
 */
const localStorageUtils = {
  /**
   * Determines if a value needs JSON serialization based on its type
   */
  needsSerialization: (value: unknown): boolean => {
    const type = typeof value;
    // Primitive values (except null/undefined) can be stored directly
    // Non-primitive values (objects, arrays) need serialization
    return value !== null && (type === 'object' || type === 'function');
  },

  /**
   * Saves a value to localStorage with appropriate serialization
   */
  saveToStorage: <T,>(key: string, value: T): void => {
    if (value === null || value === undefined) {
      window.localStorage.removeItem(key);
      return;
    }

    try {
      // Only serialize if needed (objects, arrays)
      const valueToStore = localStorageUtils.needsSerialization(value)
        ? JSON.stringify(value)
        : String(value); // Convert to string for storage

      window.localStorage.setItem(key, valueToStore);
    } catch (err) {
      console.error(`Error saving to localStorage key "${key}":`, err);
    }
  },

  /**
   * Gets a value from localStorage with appropriate deserialization based on defaultValue type
   */
  getFromStorage: <T,>(key: string, defaultValue: T): T => {
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // Try to parse as JSON if the defaultValue suggests it should be an object/array
      if (localStorageUtils.needsSerialization(defaultValue)) {
        try {
          return JSON.parse(item) as T;
        } catch (e) {
          console.error(e);
          console.warn(`Value for key "${key}" couldn't be parsed as JSON, returning as string`);
          return item as unknown as T;
        }
      }

      // Handle primitive values based on the type of defaultValue
      if (typeof defaultValue === 'number') return Number(item) as unknown as T;
      if (typeof defaultValue === 'boolean') return (item === 'true') as unknown as T;

      // Default: return as string (which is already the localStorage format)
      return item as unknown as T;
    } catch (err) {
      console.error(`Error reading localStorage key "${key}":`, err);
      return defaultValue;
    }
  },
};

// ===============================
// LocalStorage Hook Implementation
// ===============================

/**
 * A custom hook that provides localStorage functionality with proper typing
 * and smart serialization based on value types
 *
 * @param keyName - The key to use for storing the value in localStorage
 * @param defaultValue - The default value to use if no value is found in localStorage
 * @returns A tuple containing the stored value and a setter function
 */
export const useLocalStorage = <T,>(keyName: string, defaultValue: T): [T, SetValueFunction<T>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const value = localStorageUtils.getFromStorage(keyName, defaultValue);

      // Initialize localStorage if needed and defaultValue isn't null/undefined
      if (value === defaultValue && defaultValue !== null && defaultValue !== undefined) {
        localStorageUtils.saveToStorage(keyName, defaultValue);
      }

      return value;
    } catch (err) {
      console.error('Error initializing from localStorage:', err);
      return defaultValue;
    }
  });

  const setValue: SetValueFunction<T> = newValue => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = newValue instanceof Function ? newValue(storedValue) : newValue;

      // Save to state
      setStoredValue(valueToStore);

      // Save to localStorage with appropriate handling for the value type
      localStorageUtils.saveToStorage(keyName, valueToStore);
    } catch (err) {
      console.error('Error writing to localStorage:', err);
    }
  };

  return [storedValue, setValue];
};
