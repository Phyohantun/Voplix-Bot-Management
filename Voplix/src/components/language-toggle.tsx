'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
      className="w-10 px-0"
      title={language === 'en' ? 'Switch to Burmese' : 'Switch to English'}
    >
      <span className="text-sm font-medium">{language === 'en' ? 'EN' : 'MY'}</span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
