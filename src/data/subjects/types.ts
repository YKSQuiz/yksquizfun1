export interface AltKonu {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: string;
}

export interface Subject {
  id: string;
  label: string;
  icon: string;
  color: string;
  route: string;
}

export interface SubjectCategory {
  id: string;
  title: string;
  subtitle: string;
  theme: 'tyt' | 'ayt-sayisal' | 'ayt-ea' | 'ayt-sozel';
  subjects: Subject[];
} 