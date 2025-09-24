# Firestore Database Yapısı - YKS Quiz

## 📋 İçindekiler
1. [Genel Bakış](#genel-bakış)
2. [Database Konfigürasyonu](#database-konfigürasyonu)
3. [Collections (Koleksiyonlar)](#collections-koleksiyonlar)
4. [Data Models (Veri Modelleri)](#data-models-veri-modelleri)
5. [Security Rules (Güvenlik Kuralları)](#security-rules-güvenlik-kuralları)
6. [Indexes (İndeksler)](#indexes-indeksler)
7. [CRUD Operations (CRUD İşlemleri)](#crud-operations-crud-işlemleri)
8. [Real-time Updates (Gerçek Zamanlı Güncellemeler)](#real-time-updates-gerçek-zamanlı-güncellemeler)
9. [Performance Optimizations (Performans Optimizasyonları)](#performance-optimizations-performans-optimizasyonları)
10. [Backup ve Restore](#backup-ve-restore)

---

## 🎯 Genel Bakış

**Firestore Database**, YKS Quiz uygulamasının backend veritabanı olarak kullanılmaktadır. NoSQL document-based yapısı ile gerçek zamanlı veri senkronizasyonu sağlar.

### 🔥 Firebase Projesi
- **Project ID:** yksquizv2
- **Region:** europe-west1 (varsayılan)
- **Database Type:** Firestore (Native mode)

### 🛠️ Teknoloji Stack'i
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **Hosting:** Firebase Hosting
- **SDK:** Firebase Admin SDK (Node.js)
- **Client SDK:** Firebase Web SDK (JavaScript/TypeScript)

---

## 🔧 Database Konfigürasyonu

### 📝 Firebase Config
```typescript

### 🔌 Bağlantı Kurulumu
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## 📚 Collections (Koleksiyonlar)

### 👥 Users Collection
**Path:** `/users/{userId}`

Kullanıcı profilleri ve istatistiklerini saklar.

#### 📊 Document Structure
```typescript
interface UserDocument {
  // Temel Bilgiler
  id: string;                    // Firebase Auth UID
  displayName: string;           // Kullanıcı adı
  email: string;                 // Email adresi
  avatar: string;                // Avatar (ilk harf)
  
  // İstatistikler
  stats: {
    totalQuizzes: number;        // Toplam quiz sayısı
    correctAnswers: number;      // Doğru cevap sayısı
    totalQuestions: number;      // Toplam soru sayısı
    dailyActivity: {             // Günlük aktivite
      [date: string]: {
        questionsSolved: number;
        correctAnswers: number;
        timeSpent: number;
      }
    };
    level: number;               // Kullanıcı seviyesi (1-100)
    experience: number;          // Toplam XP
    experienceToNext: number;    // Sonraki seviye için gereken XP
    rank?: string;               // Kullanıcı rütbesi
    totalQuizTime?: number;      // Toplam quiz süresi (saniye)
    totalSessionTime?: number;   // Toplam oturum süresi (dakika)
  };
  
  // Joker Sistemi
  jokers: {
    eliminate: JokerState;       // Eleme jokeri
    extraTime: JokerState;       // Ek süre jokeri
    doubleAnswer: JokerState;    // Çift cevap jokeri
    autoCorrect: JokerState;     // Otomatik doğru jokeri
  };
  
  jokersUsed: {
    eliminate: number;           // Kullanılan eleme jokeri
    extraTime: number;           // Kullanılan ek süre jokeri
    doubleAnswer: number;        // Kullanılan çift cevap jokeri
    autoCorrect: number;         // Kullanılan otomatik doğru jokeri
  };
  
  // Enerji Sistemi
  energy: number;                // Mevcut enerji (0-100)
  lastEnergyUpdate: string;      // Son enerji güncelleme zamanı (ISO)
  
  // Ekonomi Sistemi
  coins: number;                 // Kullanıcının coin miktarı
}
```

#### 🔄 JokerState Interface
```typescript
interface JokerState {
  count: number;                 // Mevcut joker sayısı
  lastReset: string;             // Son yenileme tarihi (YYYY-MM-DD)
}
```

### ❓ Questions Collection
**Path:** `/questions/{questionId}`

Quiz sorularını saklar.

#### 📊 Document Structure
```typescript
interface QuestionDocument {
  id: string;                    // Otomatik oluşturulan ID
  topicId: string;               // Konu ID'si (örn: "tyt-turkce")
  question: string;              // Soru metni
  options: string[];             // Seçenekler (4 adet)
  correctAnswer: number;         // Doğru cevap indeksi (0-3)
  explanation?: string;          // Açıklama (opsiyonel)
  testNumber: number;            // Test numarası (1-10)
  difficulty?: number;           // Zorluk seviyesi (1-5)
  category?: string;             // Soru kategorisi
  createdAt?: string;            // Oluşturulma tarihi (ISO)
  updatedAt?: string;            // Güncellenme tarihi (ISO)
}
```

#### 📚 Topic ID Yapısı
```
TYT Konuları:
- tyt-turkce
- tyt-matematik
- tyt-fizik
- tyt-kimya
- tyt-biyoloji
- tyt-tarih
- tyt-cografya
- tyt-felsefe
- tyt-din

AYT Konuları:
- ayt-matematik
- ayt-fizik
- ayt-kimya
- ayt-biyoloji
- ayt-edebiyat
- ayt-tarih
- ayt-cografya
- ayt-felsefe
- ayt-din
```

### 📊 Stats Collection (Gelecek)
**Path:** `/stats/{statId}`

Genel istatistikler ve analitik veriler için.

#### 📊 Document Structure
```typescript
interface StatsDocument {
  id: string;                    // İstatistik ID'si
  type: 'daily' | 'weekly' | 'monthly';
  date: string;                  // Tarih (YYYY-MM-DD)
  totalUsers: number;            // Toplam kullanıcı sayısı
  activeUsers: number;           // Aktif kullanıcı sayısı
  totalQuizzes: number;          // Toplam quiz sayısı
  totalQuestions: number;        // Toplam soru sayısı
  averageScore: number;          // Ortalama puan
  popularTopics: string[];       // Popüler konular
  createdAt: string;             // Oluşturulma tarihi
}
```

---

## 🏗️ Data Models (Veri Modelleri)

### 👤 User Model
```typescript
// Kullanıcı oluşturma
const newUser: User = {
  id: firebaseUser.uid,
  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Kullanıcı',
  email: firebaseUser.email || '',
  avatar: firebaseUser.displayName ? firebaseUser.displayName[0].toUpperCase() : 'K',
  stats: {
    totalQuizzes: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    dailyActivity: {},
    level: 1,
    experience: 0,
    experienceToNext: 100,
    totalSessionTime: 0
  },
  jokers: {
    eliminate: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
    extraTime: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
    doubleAnswer: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
    autoCorrect: { count: 3, lastReset: new Date().toISOString().slice(0, 10) },
  },
  jokersUsed: {
    eliminate: 0,
    extraTime: 0,
    doubleAnswer: 0,
    autoCorrect: 0,
  },
  energy: 100,
  lastEnergyUpdate: new Date().toISOString(),
  coins: 0,
};
```

### ❓ Question Model
```typescript
// Soru oluşturma
const newQuestion: Question = {
  topicId: "tyt-turkce",
  question: "Aşağıdaki cümlelerin hangisinde yazım yanlışı vardır?",
  options: [
    "Bu konuyu daha önce hiç duymamıştım.",
    "Yarın sabah erkenden yola çıkacağız.",
    "O gün hava çok güzeldi.",
    "Bu kitabı okumayı çok istiyorum."
  ],
  correctAnswer: 0,
  explanation: "Açıklama metni buraya gelecek...",
  testNumber: 1,
  difficulty: 2,
  category: "yazım"
};
```

---

## 🔒 Security Rules (Güvenlik Kuralları)

### 📝 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - sadece kendi verilerine erişim
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && request.auth.uid == userId;
    }
    
    // Questions collection - herkes okuyabilir, sadece admin yazabilir
    match /questions/{questionId} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Stats collection - sadece admin erişimi
    match /stats/{statId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### 🔐 Authentication Rules
- **Email/Password:** Geleneksel giriş
- **Google OAuth:** Google hesabı ile giriş
- **User Management:** Kullanıcı profil yönetimi
- **Role-based Access:** Admin ve normal kullanıcı rolleri

---

## 📈 Indexes (İndeksler)

### 🔍 Composite Indexes
```javascript
// Questions collection için
{
  "collectionGroup": "questions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "topicId", "order": "ASCENDING" },
    { "fieldPath": "testNumber", "order": "ASCENDING" }
  ]
}

// Users collection için
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "stats.level", "order": "DESCENDING" },
    { "fieldPath": "stats.experience", "order": "DESCENDING" }
  ]
}
```

### 📊 Single Field Indexes
- `topicId` (Questions)
- `testNumber` (Questions)
- `stats.level` (Users)
- `stats.experience` (Users)
- `energy` (Users)
- `coins` (Users)

---

## 🔄 CRUD Operations (CRUD İşlemleri)

### 📊 CSV'den Soru Ekleme

#### 📁 CSV Formatı
CSV dosyaları `$` (dolar) işareti ile ayrılmış alanlar kullanır:

```csv
topicId$question$optionA$optionB$optionC$optionD$correctAnswer$testNumber$explanation
sozcukte-anlam$Aşağıdaki cümlelerin hangisinde altı çizili sözcük mecaz anlamda kullanılmıştır?$Bu tablo, duvarda harika durdu.$Çocuk, sınavda zorlandı.$Yeni haberler moralimi uçurdu.$Sokakta oynayan çocukları izliyordu.$2$1$"Uçurdu" sözcüğü burada duygusal bir yükselişi ifade ederek gerçek anlamından uzaklaşmıştır.
```

#### 📋 CSV Alan Yapısı
| Alan | Açıklama | Örnek |
|------|----------|-------|
| `topicId` | Konu ID'si | `sozcukte-anlam` |
| `question` | Soru metni | `Aşağıdaki cümlelerin hangisinde...` |
| `optionA` | A seçeneği | `Bu tablo, duvarda harika durdu.` |
| `optionB` | B seçeneği | `Çocuk, sınavda zorlandı.` |
| `optionC` | C seçeneği | `Yeni haberler moralimi uçurdu.` |
| `optionD` | D seçeneği | `Sokakta oynayan çocukları izliyordu.` |
| `correctAnswer` | Doğru cevap indeksi (0-3) | `2` |
| `testNumber` | Test numarası (1-10) | `1` |
| `explanation` | Açıklama metni | `"Uçurdu" sözcüğü burada...` |

#### 🔧 CSV Upload Script
```javascript
// csv-to-firebase.js
const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split('$');
  const questions = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    // CSV satırını parse et (tırnak içindeki $ işaretlerini dikkate alarak)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === '$' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Son değeri ekle
    
    if (values.length >= 9) {
      const question = {
        topicId: values[0],
        question: values[1],
        options: [values[2], values[3], values[4], values[5]],
        correctAnswer: parseInt(values[6]),
        testNumber: parseInt(values[7]),
        explanation: values[8]
      };
      questions.push(question);
    }
  }
  
  return questions;
}

async function uploadCSV(csvFilePath) {
  try {
    console.log(`CSV dosyası okunuyor: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const questions = parseCSV(csvContent);
    
    console.log(`${questions.length} soru bulundu. Firebase'e yükleniyor...`);
    
    for (const question of questions) {
      await db.collection('questions').add(question);
      console.log('Eklendi:', question.question.substring(0, 50) + '...');
    }
    
    console.log('✅ Tüm sorular başarıyla Firebase\'e yüklendi!');
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    process.exit(0);
  }
}

// Kullanım: node csv-to-firebase.js dosyaadi.csv
const csvFilePath = process.argv[2];
if (!csvFilePath) {
  console.error('❌ CSV dosya yolu belirtmelisiniz!');
  console.log('Kullanım: node csv-to-firebase.js dosyaadi.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ Dosya bulunamadı: ${csvFilePath}`);
  process.exit(1);
}

uploadCSV(csvFilePath);
```

#### 🚀 CSV Upload Kullanımı
```bash
# CSV dosyasını Firestore'a yükle
node csv-to-firebase.js sozcukte-anlam.csv

# Çıktı örneği:
# CSV dosyası okunuyor: sozcukte-anlam.csv
# 10 soru bulundu. Firebase'e yükleniyor...
# Eklendi: Aşağıdaki cümlelerin hangisinde altı çizili sözcük...
# Eklendi: "Keskin" sözcüğü aşağıdakilerin hangisinde...
# ...
# ✅ Tüm sorular başarıyla Firebase'e yüklendi!
```

#### 📝 CSV Hazırlama Kuralları
- **Ayırıcı:** `$` (dolar) işareti kullanın
- **Encoding:** UTF-8 formatında kaydedin
- **Tırnak İşaretleri:** Açıklama metinlerinde `"` kullanabilirsiniz
- **Boş Satırlar:** Boş satırlar otomatik olarak atlanır
- **Alan Sayısı:** En az 9 alan olmalıdır

#### 🔍 CSV Validation
```typescript
// CSV doğrulama fonksiyonu
const validateCSV = (csvContent: string): boolean => {
  const lines = csvContent.split('\n');
  const headers = lines[0].split('$');
  
  // Header kontrolü
  const requiredHeaders = [
    'topicId', 'question', 'optionA', 'optionB', 
    'optionC', 'optionD', 'correctAnswer', 'testNumber', 'explanation'
  ];
  
  const hasAllHeaders = requiredHeaders.every(header => 
    headers.includes(header)
  );
  
  if (!hasAllHeaders) {
    console.error('❌ Gerekli başlıklar eksik!');
    return false;
  }
  
  // Veri kontrolü
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split('$');
    if (values.length < 9) {
      console.error(`❌ Satır ${i}: Yetersiz alan sayısı`);
      return false;
    }
    
    const correctAnswer = parseInt(values[6]);
    if (correctAnswer < 0 || correctAnswer > 3) {
      console.error(`❌ Satır ${i}: Geçersiz doğru cevap indeksi`);
      return false;
    }
  }
  
  return true;
};
```

### 👤 User Operations

#### 📖 Read User
```typescript
const getUserProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as User;
  } else {
    // Yeni kullanıcı oluştur
    const newUser = createNewUser(firebaseUser);
    await setDoc(userRef, newUser, { merge: true });
    return newUser;
  }
};
```

#### ✏️ Update User Stats
```typescript
const updateUserStats = async (userId: string, correct: number, total: number) => {
  const userRef = doc(db, 'users', userId);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  await updateDoc(userRef, {
    'stats.totalQuizzes': increment(1),
    'stats.correctAnswers': increment(correct),
    'stats.totalQuestions': increment(total),
    [`stats.dailyActivity.${today}.questionsSolved`]: increment(total),
    [`stats.dailyActivity.${today}.correctAnswers`]: increment(correct),
  });
};
```

#### 🔄 Update Energy
```typescript
const updateUserEnergy = async (uid: string, newEnergy: number, lastUpdate: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    energy: newEnergy,
    lastEnergyUpdate: lastUpdate,
  });
};
```

### ❓ Question Operations

#### 📖 Read Questions
```typescript
const fetchQuestions = async (topicId: string, testNumber: number): Promise<Question[]> => {
  const questionsRef = collection(db, 'questions');
  const q = query(
    questionsRef,
    where('topicId', '==', topicId),
    where('testNumber', '==', testNumber)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Question[];
};
```

#### ➕ Add Question
```typescript
const addQuestion = async (question: Omit<Question, 'id'>): Promise<string> => {
  const questionsRef = collection(db, 'questions');
  const docRef = await addDoc(questionsRef, {
    ...question,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  return docRef.id;
};
```

#### 🗑️ Delete Questions
```typescript
const deleteQuestionsByTopic = async (topicId: string): Promise<void> => {
  const questionsRef = collection(db, 'questions');
  const q = query(questionsRef, where('topicId', '==', topicId));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};
```

---

## ⚡ Real-time Updates (Gerçek Zamanlı Güncellemeler)

### 🔄 User Session Tracking
```typescript
const updateSessionTime = async (uid: string, sessionDuration: number) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const prevTime = userSnap.data().totalSessionTime || 0;
    await updateDoc(userRef, {
      totalSessionTime: prevTime + sessionDuration,
    });
  }
};
```

### 📊 Real-time Listeners
```typescript
// Kullanıcı verilerini dinle
const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
  if (doc.exists()) {
    const userData = doc.data() as User;
    setUser(userData);
  }
});

// Cleanup
return () => unsubscribe();
```

---

## 🚀 Performance Optimizations (Performans Optimizasyonları)

### 📦 Data Caching
```typescript
// Questions cache
const questionsCache = useRef<Map<string, Question[]>>(new Map());

// Cache check
if (questionsCache.current.has(cacheKey)) {
  setQuestions(questionsCache.current.get(cacheKey)!);
  return;
}

// Cache update
questionsCache.current.set(cacheKey, fetchedQuestions);
```

### 🔍 Query Optimization
```typescript
// Composite queries
const q = query(
  collection(db, 'questions'),
  where('topicId', '==', topicId),
  where('testNumber', '==', testNumber),
  orderBy('createdAt', 'desc'),
  limit(20)
);
```

### 📊 Batch Operations
```typescript
// Batch write operations
const batch = writeBatch(db);

questions.forEach(question => {
  const docRef = doc(collection(db, 'questions'));
  batch.set(docRef, question);
});

await batch.commit();
```

---

## 💾 Backup ve Restore

### 📤 Export Data
```typescript
const exportUserData = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    const userData = userSnap.data();
    return JSON.stringify(userData, null, 2);
  }
};
```

### 📥 Import Data
```typescript
const importUserData = async (userId: string, data: string) => {
  const userData = JSON.parse(data);
  const userRef = doc(db, 'users', userId);
  
  await setDoc(userRef, userData, { merge: true });
};
```

### 🔄 Database Backup Script
```javascript
// backup-database.js
const admin = require('firebase-admin');
const fs = require('fs');

async function backupDatabase() {
  const db = admin.firestore();
  
  // Users backup
  const usersSnapshot = await db.collection('users').get();
  const users = usersSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Questions backup
  const questionsSnapshot = await db.collection('questions').get();
  const questions = questionsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  const backup = {
    timestamp: new Date().toISOString(),
    users,
    questions
  };
  
  fs.writeFileSync('backup.json', JSON.stringify(backup, null, 2));
}
```

### 📊 CSV Export Script
```javascript
// export-questions-to-csv.js
const admin = require('firebase-admin');
const fs = require('fs');

async function exportQuestionsToCSV(topicId, testNumber) {
  const db = admin.firestore();
  
  const questionsRef = db.collection('questions');
  const q = query(
    questionsRef,
    where('topicId', '==', topicId),
    where('testNumber', '==', testNumber)
  );
  
  const snapshot = await q.get();
  const questions = snapshot.docs.map(doc => doc.data());
  
  // CSV formatına çevir
  const csvContent = [
    'topicId$question$optionA$optionB$optionC$optionD$correctAnswer$testNumber$explanation'
  ];
  
  questions.forEach(question => {
    const row = [
      question.topicId,
      question.question,
      question.options[0],
      question.options[1],
      question.options[2],
      question.options[3],
      question.correctAnswer,
      question.testNumber,
      question.explanation || ''
    ].join('$');
    
    csvContent.push(row);
  });
  
  const filename = `${topicId}_test${testNumber}.csv`;
  fs.writeFileSync(filename, csvContent.join('\n'), 'utf8');
  console.log(`✅ ${questions.length} soru ${filename} dosyasına export edildi.`);
}

// Kullanım: node export-questions-to-csv.js topicId testNumber
const topicId = process.argv[2];
const testNumber = parseInt(process.argv[3]);

if (!topicId || !testNumber) {
  console.error('❌ Topic ID ve Test Number belirtmelisiniz!');
  console.log('Kullanım: node export-questions-to-csv.js topicId testNumber');
  process.exit(1);
}

exportQuestionsToCSV(topicId, testNumber);
```

### 🔄 Batch CSV Import
```javascript
// batch-import-csv.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function batchImportCSV(csvDirectory) {
  const db = admin.firestore();
  const files = fs.readdirSync(csvDirectory).filter(file => file.endsWith('.csv'));
  
  console.log(`${files.length} CSV dosyası bulundu.`);
  
  for (const file of files) {
    const filePath = path.join(csvDirectory, file);
    console.log(`\n📁 İşleniyor: ${file}`);
    
    try {
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const questions = parseCSV(csvContent);
      
      const batch = db.batch();
      questions.forEach(question => {
        const docRef = db.collection('questions').doc();
        batch.set(docRef, question);
      });
      
      await batch.commit();
      console.log(`✅ ${questions.length} soru eklendi.`);
      
    } catch (error) {
      console.error(`❌ ${file} dosyası işlenirken hata:`, error.message);
    }
  }
  
  console.log('\n🎉 Tüm dosyalar işlendi!');
}

// Kullanım: node batch-import-csv.js /path/to/csv/directory
const csvDirectory = process.argv[2];

if (!csvDirectory) {
  console.error('❌ CSV dizini belirtmelisiniz!');
  console.log('Kullanım: node batch-import-csv.js /path/to/csv/directory');
  process.exit(1);
}

if (!fs.existsSync(csvDirectory)) {
  console.error(`❌ Dizin bulunamadı: ${csvDirectory}`);
  process.exit(1);
}

batchImportCSV(csvDirectory);
```

---

## 📊 Monitoring ve Analytics

### 📈 Database Metrics
- **Read Operations:** Saniye başına okuma işlemi
- **Write Operations:** Saniye başına yazma işlemi
- **Delete Operations:** Saniye başına silme işlemi
- **Document Count:** Toplam döküman sayısı
- **Storage Size:** Toplam depolama boyutu

### 🔍 Query Performance
- **Query Latency:** Sorgu gecikme süresi
- **Index Usage:** İndeks kullanım oranları
- **Cache Hit Rate:** Önbellek isabet oranı

### 📊 Error Tracking
```typescript
// Error logging
const logDatabaseError = (error: any, operation: string) => {
  console.error(`Database Error in ${operation}:`, error);
  
  // Firebase Analytics
  analytics.logEvent('database_error', {
    operation,
    error_code: error.code,
    error_message: error.message
  });
};
```

---

## 🔧 Maintenance ve Troubleshooting

### 🧹 Data Cleanup
```typescript
// Eski verileri temizle
const cleanupOldData = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('lastLogin', '<', thirtyDaysAgo));
  const snapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
};
```

### 🔍 Query Debugging
```typescript
// Query performance monitoring
const debugQuery = async (query: Query) => {
  const startTime = performance.now();
  const snapshot = await getDocs(q);
  const endTime = performance.now();
  
  console.log(`Query took ${endTime - startTime}ms`);
  console.log(`Retrieved ${snapshot.size} documents`);
  
  return snapshot;
};
```

### 🧹 CSV Data Cleanup
```typescript
// Duplicate questions cleanup
const cleanupDuplicateQuestions = async (topicId: string) => {
  const questionsRef = collection(db, 'questions');
  const q = query(questionsRef, where('topicId', '==', topicId));
  const snapshot = await getDocs(q);
  
  const questions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Duplicate detection
  const duplicates = [];
  const seen = new Set();
  
  questions.forEach(question => {
    const key = `${question.question}-${question.correctAnswer}-${question.testNumber}`;
    if (seen.has(key)) {
      duplicates.push(question.id);
    } else {
      seen.add(key);
    }
  });
  
  // Delete duplicates
  if (duplicates.length > 0) {
    const batch = writeBatch(db);
    duplicates.forEach(id => {
      const docRef = doc(db, 'questions', id);
      batch.delete(docRef);
    });
    
    await batch.commit();
    console.log(`🗑️ ${duplicates.length} duplicate soru silindi.`);
  }
  
  return duplicates.length;
};

// Invalid questions cleanup
const cleanupInvalidQuestions = async () => {
  const questionsRef = collection(db, 'questions');
  const snapshot = await getDocs(questionsRef);
  
  const invalidQuestions = [];
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Validation checks
    if (!data.question || data.question.trim() === '') {
      invalidQuestions.push(doc.id);
    } else if (!data.options || data.options.length !== 4) {
      invalidQuestions.push(doc.id);
    } else if (data.correctAnswer < 0 || data.correctAnswer > 3) {
      invalidQuestions.push(doc.id);
    } else if (!data.topicId || !data.testNumber) {
      invalidQuestions.push(doc.id);
    }
  });
  
  // Delete invalid questions
  if (invalidQuestions.length > 0) {
    const batch = writeBatch(db);
    invalidQuestions.forEach(id => {
      const docRef = doc(db, 'questions', id);
      batch.delete(docRef);
    });
    
    await batch.commit();
    console.log(`🗑️ ${invalidQuestions.length} geçersiz soru silindi.`);
  }
  
  return invalidQuestions.length;
};
```

---

## 📚 Best Practices

### ✅ Do's
- **Index Optimization:** Sık kullanılan sorgular için composite indexler oluştur
- **Batch Operations:** Çoklu işlemler için batch kullan
- **Real-time Listeners:** Gerektiğinde unsubscribe yap
- **Error Handling:** Tüm database işlemlerinde try-catch kullan
- **Data Validation:** Client-side validation ile birlikte server-side validation

### ❌ Don'ts
- **Large Documents:** 1MB'dan büyük dökümanlar oluşturma
- **Deep Nesting:** 3 seviyeden derin nested yapılar kullanma
- **Unlimited Queries:** Limit olmadan büyük koleksiyonları sorgulama
- **Real-time Everything:** Gereksiz real-time listenerlar kullanma

---

## 🔮 Gelecek Geliştirmeler

### 📈 Planlanan Özellikler
- [ ] **Subcollections:** Kullanıcı quiz geçmişi için subcollections
- [ ] **Aggregation Queries:** Toplu istatistik hesaplamaları
- [ ] **Full-text Search:** Soru içeriği arama
- [ ] **Data Analytics:** Gelişmiş analitik dashboard
- [ ] **Multi-region:** Çoklu bölge desteği

### 🔧 Teknik İyileştirmeler
- [ ] **Connection Pooling:** Bağlantı havuzu optimizasyonu
- [ ] **Query Optimization:** Sorgu performansı iyileştirmeleri
- [ ] **Caching Strategy:** Gelişmiş önbellek stratejisi
- [ ] **Backup Automation:** Otomatik yedekleme sistemi

---

**Firestore Database** - YKS Quiz'in güçlü backend'i! 🔥📊

*Son güncelleme: 2025* 