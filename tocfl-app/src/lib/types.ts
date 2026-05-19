export interface VocabularyWord {
  id: string;
  vocabulary: string;
  pinyin: string;
  pos: string[];
  context: string;
  sino_vietnamese: string;
  meaning_vi: string;
  example: string;
  example_pinyin: string;
  example_meaning_vi: string;
  variants?: string[];
  level_code?: string;
  level_name?: string;
  level_name_en?: string;
  level_order?: number;
}
