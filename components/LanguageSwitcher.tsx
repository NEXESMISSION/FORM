'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'

type Language = 'en' | 'ar' | 'fr'

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<Language>('en')

  const languages = [
    { code: 'en' as Language, label: 'English', flag: '🇬🇧' },
    { code: 'ar' as Language, label: 'العربية', flag: '🇹🇳' },
    { code: 'fr' as Language, label: 'Français', flag: '🇫🇷' },
  ]

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang)
    // TODO: Implement i18n integration
    // For now, this is a placeholder for future multi-language support
    document.documentElement.setAttribute('lang', lang)
    if (lang === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl')
    } else {
      document.documentElement.setAttribute('dir', 'ltr')
    }
  }

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">
          {languages.find(l => l.code === currentLang)?.flag} {languages.find(l => l.code === currentLang)?.label}
        </span>
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <div className="py-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
                currentLang === lang.code ? 'bg-primary-50 text-primary-600' : ''
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
