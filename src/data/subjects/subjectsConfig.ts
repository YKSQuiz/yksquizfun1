import { Subject, SubjectCategory } from './types';

// Ortak ders tanımları
const createSubject = (id: string, label: string, icon: string, color: string, route: string): Subject => ({
  id,
  label,
  icon,
  color,
  route
});

// TYT Dersleri
export const tytSubjects: Subject[] = [
  createSubject('tyt-turkce', 'TYT Türkçe', '📝', 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', '/tyt-turkce-altkonular'),
  createSubject('tyt-tarih', 'TYT Tarih', '🏺', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', '/tyt-tarih-altkonular'),
  createSubject('tyt-cografya', 'TYT Coğrafya', '🗺️', 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', '/tyt-cografya-altkonular'),
  createSubject('tyt-felsefe', 'TYT Felsefe', '💭', 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', '/tyt-felsefe-altkonular'),
  createSubject('tyt-din', 'TYT Din', '🕌', 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)', '/tyt-din-altkonular'),
  createSubject('tyt-matematik', 'TYT Matematik', '➗', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', '/tyt-matematik-altkonular'),
  createSubject('tyt-fizik', 'TYT Fizik', '🔬', 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)', '/tyt-fizik-altkonular'),
  createSubject('tyt-kimya', 'TYT Kimya', '⚗️', 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)', '/tyt-kimya-altkonular'),
  createSubject('tyt-biyoloji', 'TYT Biyoloji', '🧬', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', '/tyt-biyoloji-altkonular'),
];

// AYT Sayısal Dersleri
export const aytSayisalSubjects: Subject[] = [
  createSubject('ayt-matematik', 'AYT Matematik', '➗', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', '/ayt-matematik-altkonular'),
  createSubject('ayt-fizik', 'AYT Fizik', '🔬', 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)', '/ayt-fizik-altkonular'),
  createSubject('ayt-kimya', 'AYT Kimya', '⚗️', 'linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)', '/ayt-kimya-altkonular'),
  createSubject('ayt-biyoloji', 'AYT Biyoloji', '🧬', 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', '/ayt-biyoloji-altkonular'),
];

// AYT Eşit Ağırlık Dersleri
export const aytEaSubjects: Subject[] = [
  createSubject('ayt-edebiyat', 'AYT Edebiyat', '📖', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', '/ayt-edebiyat-altkonular'),
  createSubject('ayt-tarih', 'AYT Tarih', '🏺', 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', '/ayt-tarih-altkonular'),
  createSubject('ayt-cografya', 'AYT Coğrafya', '🗺️', 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', '/ayt-cografya-altkonular'),
  createSubject('ayt-matematik', 'AYT Matematik', '➗', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', '/ayt-matematik-altkonular'),
];

// AYT Sözel Dersleri
export const aytSozelSubjects: Subject[] = [
  createSubject('ayt-edebiyat', 'AYT Edebiyat', '📖', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', '/ayt-edebiyat-altkonular'),
  createSubject('ayt-cografya', 'AYT Coğrafya', '🗺️', 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', '/ayt-cografya-altkonular'),
  createSubject('ayt-tarih', 'AYT Tarih', '🏺', 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', '/ayt-tarih-altkonular'),
  createSubject('ayt-din', 'AYT Din Kültürü', '🕌', 'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)', '/ayt-din-altkonular'),
  createSubject('ayt-felsefe', 'AYT Felsefe', '💭', 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', '/ayt-felsefe-altkonular'),
];

// Ana konfigürasyon
export const subjectsConfig: Record<string, SubjectCategory> = {
  tyt: {
    id: 'tyt',
    title: 'TYT Ders Seçimi',
    subtitle: 'Her dersin kendine özel soruları seni bekliyor!',
    theme: 'tyt',
    subjects: tytSubjects
  },
  aytSayisal: {
    id: 'ayt-sayisal',
    title: 'AYT-Sayısal Ders Seçimi',
    subtitle: 'Sayısal derslerin soruları seni bekliyor!',
    theme: 'ayt-sayisal',
    subjects: aytSayisalSubjects
  },
  aytEa: {
    id: 'ayt-ea',
    title: 'AYT-Eşit Ağırlık Ders Seçimi',
    subtitle: 'Eşit ağırlık derslerinin soruları seni bekliyor!',
    theme: 'ayt-ea',
    subjects: aytEaSubjects
  },
  aytSozel: {
    id: 'ayt-sozel',
    title: 'AYT-Sözel Ders Seçimi',
    subtitle: 'Sözel derslerin soruları seni bekliyor!',
    theme: 'ayt-sozel',
    subjects: aytSozelSubjects
  }
}; 