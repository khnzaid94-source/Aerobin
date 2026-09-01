import { createContext, useContext, useState } from 'react'

const dict = {
  en: {
    appMenu: 'App Menu',
    citizen: 'Citizen Alert',
    dispatch: 'PMC Dispatch',
    analyst: 'Impact Analyst',
    citizenShort: 'Citizen',
    dispatchShort: 'Dispatch',
    analystShort: 'Analyst',
    today: 'Today',
    allClear: 'All wards below alert level',
    highRisk: 'High-risk wards',
    liveConnected: 'Live PM2.5 connected',
    offline: 'Offline mode · showing pilot baseline',
    refreshing: 'Refreshing…',
    skip: 'Skip to content',
    compare: 'Compare wards',
    hideCompare: 'Hide compare',
    wardDetails: 'Ward details',
    wasUseful: 'Was this alert useful?',
  },
  mr: {
    appMenu: 'अॅप मेनू',
    citizen: 'नागरिक इशारा',
    dispatch: 'पीएमसी डिस्पॅच',
    analyst: 'प्रभाव विश्लेषक',
    citizenShort: 'नागरिक',
    dispatchShort: 'डिस्पॅच',
    analystShort: 'विश्लेषक',
    today: 'आज',
    allClear: 'सर्व वॉर्ड इशारा पातळीखाली',
    highRisk: 'उच्च-जोखीम वॉर्ड',
    liveConnected: 'थेट PM2.5 जोडलेले',
    offline: 'ऑफलाइन · पायलट बेसलाइन',
    refreshing: 'रिफ्रेश करत आहे…',
    skip: 'मुख्य मजकुरावर जा',
    compare: 'वॉर्ड तुलना',
    hideCompare: 'तुलना लपवा',
    wardDetails: 'वॉर्ड तपशील',
    wasUseful: 'हा इशारा उपयुक्त होता का?',
  },
  hi: {
    appMenu: 'ऐप मेनू',
    citizen: 'नागरिक अलर्ट',
    dispatch: 'पीएमसी डिस्पैच',
    analyst: 'प्रभाव विश्लेषक',
    citizenShort: 'नागरिक',
    dispatchShort: 'डिस्पैच',
    analystShort: 'विश्लेषक',
    today: 'आज',
    allClear: 'सभी वार्ड अलर्ट स्तर से नीचे',
    highRisk: 'उच्च-जोखिम वार्ड',
    liveConnected: 'लाइव PM2.5 जुड़ा',
    offline: 'ऑफ़लाइन · पायलट बेसलाइन',
    refreshing: 'रिफ्रेश हो रहा है…',
    skip: 'मुख्य सामग्री पर जाएं',
    compare: 'वार्ड तुलना',
    hideCompare: 'तुलना छिपाएं',
    wardDetails: 'वार्ड विवरण',
    wasUseful: 'क्या यह अलर्ट उपयोगी था?',
  },
}

const I18nContext = createContext({ lang: 'en', t: (k)=>k, setLang: ()=>{} })

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('aerobin.lang') || 'en' } catch { return 'en' }
  })
  const t = (key) => dict[lang]?.[key] ?? dict.en[key] ?? key
  const change = (l) => {
    setLang(l)
    try { localStorage.setItem('aerobin.lang', l) } catch {}
  }
  return <I18nContext.Provider value={{ lang, t, setLang: change, dict }}>{children}</I18nContext.Provider>
}

export function useI18n() { return useContext(I18nContext) }
