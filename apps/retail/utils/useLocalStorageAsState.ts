import { useState, useEffect, Dispatch, SetStateAction } from "react";

export const useLocalStorageAsState = <Type>(key: string, defaultValue: Type): [Type, Dispatch<SetStateAction<Type>>] => {
  const [value, setValue] = useState<Type>(() => {
    return getLocalStorageValue(key, defaultValue);
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

const getLocalStorageValue = <Type>(key: string, defaultValue: Type) => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    const initial = JSON.parse(saved);
    return initial || defaultValue;
  }
}
