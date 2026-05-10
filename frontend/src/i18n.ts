import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import az from './locales/az/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: az },
    },
    lng: 'az',
    fallbackLng: 'az',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
