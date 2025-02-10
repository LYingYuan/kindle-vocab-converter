export interface BookInfo {
  id: string;
  asin: string;
  guid: string;
  lang: string;
  title: string;
  authors: string;
}

export interface Lookup {
  id: string;
  word_key: string;
  book_key: string;
  dict_key: string;
  pos: string;
  usage: string;
  timestamp: string;
}

export interface Word {
  id: string;
  word: string;
  stem: string;
  lang: string;
  category: string;
  timestamp: string;
  profiled: string;
}

export interface WordWithContext extends Word {
  lookups: Lookup[];
}
