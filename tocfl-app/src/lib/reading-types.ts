export interface Reading {
  id: string;
  title: string;
  title_vi: string;
  band: string;
  topic: string;
  content: string;
  content_pinyin: string;
  content_vi: string;
  questions: ReadingQuestion[];
}

export interface ReadingQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation_vi: string;
}
