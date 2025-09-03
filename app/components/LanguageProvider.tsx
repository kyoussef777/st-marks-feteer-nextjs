'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, ar: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load language from cookies on mount
  useEffect(() => {
    const savedLanguage = document.cookie
      .split('; ')
      .find(row => row.startsWith('language='))
      ?.split('=')[1] as Language;
    
    if (savedLanguage === 'en' || savedLanguage === 'ar') {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Save to cookies
    document.cookie = `language=${lang}; path=/; max-age=31536000`; // 1 year
  };

  const t = (en: string, ar: string) => {
    return language === 'ar' ? ar : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}