// Catálogo da biblioteca Resources — porte do tests-data.js do protótipo
// (lms-speakup/public/assets/extra-resources). Fase visual: os dados ficam
// aqui; na próxima fase vêm do banco do LMS e este arquivo sai.
// Interface em inglês, como o LMS (os termos em português de `search`
// existem só para a busca encontrar "viagens", "clima" etc.).

// Pasta servida pelo Vite em dev (public/extra-resources, fora do git e do deploy).
export const RESOURCES_BASE_URL = '/extra-resources/';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Cursos: a primeira escolha do professor. Cada curso lista os próprios livros
// (o rótulo muda por curso: A2 é "Elementary" em Adults e "Key" em Cambridge).
export const RESOURCE_COURSES = [
  { key: 'adults', name: 'Adults', desc: "General English Student's Book, A1 to C2",
    books: [
      { level: 'A1', label: 'A1 · Beginner' },
      { level: 'A2', label: 'A2 · Elementary' },
      { level: 'B1', label: 'B1 · Intermediate' },
      { level: 'B2', label: 'B2 · Upper-Intermediate' },
      { level: 'C1', label: 'C1 · Advanced' },
      { level: 'C2', label: 'C2 · Proficient' },
    ] },
  { key: 'teens', name: 'Teens', desc: 'Courses for teenagers', books: [] },
  { key: 'kids', name: 'Kids', desc: 'Courses for children', books: [] },
  { key: 'cambridge', name: 'Cambridge preparation', desc: 'Exam preparation, A2 Key to C2 Proficiency',
    books: [
      { level: 'A2', label: 'A2 Key' },
      { level: 'B1', label: 'B1 Preliminary' },
      { level: 'B2', label: 'B2 First' },
      { level: 'C1', label: 'C1 Advanced' },
      { level: 'C2', label: 'C2 Proficiency' },
    ] },
];

// Tipos de material — viram as abas.
export const RESOURCE_TYPES = [
  { key: 'written', name: 'Written test', short: 'Written' },
  { key: 'speaking', name: 'Speaking test', short: 'Speaking' },
  { key: 'listening', name: 'Listening test', short: 'Listening' },
  { key: 'worksheet', name: 'Worksheet', short: 'Worksheet' },
  { key: 'grammar', name: 'Grammar practice', short: 'Grammar' },
  { key: 'vocabulary', name: 'Vocabulary practice', short: 'Vocabulary' },
  { key: 'reading', name: 'Reading practice', short: 'Reading' },
  { key: 'writing', name: 'Writing practice', short: 'Writing' },
];

export const RESOURCE_BOOKS = [
  { level: 'A1', series: 'General English', name: "Student's Book", cefr: 'Beginner', units: 12 },
  { level: 'A2', series: 'General English', name: "Student's Book", cefr: 'Elementary', units: 12 },
  { level: 'B1', series: 'General English', name: "Student's Book", cefr: 'Intermediate', units: 12 },
  { level: 'B2', series: 'General English', name: "Student's Book", cefr: 'Upper-Intermediate', units: 12 },
  { level: 'C1', series: 'General English', name: "Student's Book", cefr: 'Advanced', units: 12 },
  { level: 'C2', series: 'General English', name: "Student's Book", cefr: 'Proficient', units: 12 },
];

// `keyFile` vazio = o gabarito é a página #key do próprio arquivo da prova.
export const RESOURCES = [
  {
    id: 'a2-listening-01',
    title: 'Listening Test 01',
    skill: 'Listening',
    kind: 'listening',
    course: 'adults',
    level: 'A2',
    unit: null,
    created: '2026-10-06',
    folder: 'A2/A2_Listening_Test_01',
    file: 'A2_Listening_Test_01.html',
    keyFile: null,
    questions: 25,
    tags: ['Animals', 'Travel', 'Weather', 'Geography', 'School', 'Sports & activities', 'Holidays', 'Food', 'Health', 'Phone messages', 'Daily life'],
    search: 'animais viagens clima geografia escola esportes atividades ferias comida saude recados telefone rotina',
    exercises: [
      { n: 1, type: 'Multiple choice (A/B/C)', typeKey: 'mcq', seconds: 102, audio: 'A2_Test01_Ex01.mp3',
        topic: 'Emily tells a friend about her trip to Canada: bears, tigers, spiders and the heat',
        source: 'Gold Experience 2e A2 · Coursebook 8.5',
        keywords: 'emily oscar canada bears tigers snakes spider weather aunt forest' },
      { n: 2, type: 'Multiple choice (A/B/C)', typeKey: 'mcq', seconds: 127, audio: 'A2_Test01_Ex02.mp3',
        topic: 'Lucy and her dad talk about a geography project: rivers, lakes and Lake Victoria',
        source: 'Gold Experience 2e A2 · Workbook 8.5 · p. 67',
        keywords: 'lucy dad geography project rivers lakes lake victoria mississippi amazon nile temperature' },
      { n: 3, type: 'Gap fill', typeKey: 'gap', seconds: 118, audio: 'A2_Test01_Ex03.mp3',
        topic: 'A phone message about the school picnic: place, time, food and clothes',
        source: 'Gold Experience 2e A2 · Workbook 9.7 · p. 75',
        keywords: 'school picnic phone message park grove road trainers fruit telephone number miss sharp' },
      { n: 4, type: 'Matching', typeKey: 'match', seconds: 115, audio: 'A2_Test01_Ex04.mp3',
        topic: 'Alice tells her grandad which activity she did on each day of a school trip',
        source: 'Gold Experience 2e A2 · Workbook 10.5 · p. 88',
        keywords: 'alice grandad activity holiday days of the week table tennis badminton horse riding sailing cycling climbing' },
      { n: 5, type: 'Multiple choice (A/B/C)', typeKey: 'mcq', seconds: 206, audio: 'A2_Test01_Ex05.mp3',
        topic: 'Five short recordings: a message from mum, a day out, a writing task, a missed party, a water-sports holiday',
        source: 'Gold Experience 2e A2 · Workbook 10.4 · p. 88',
        keywords: 'rosie martha liam phone message homework story party stomach ache windsurfing fishing swimming volleyball' },
    ],
  },
];
