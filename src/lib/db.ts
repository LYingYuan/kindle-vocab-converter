import { BookInfo, Lookup, Word, WordWithContext } from "@/types";

class VocabDB {
  private db!: IDBDatabase;
  private readonly DB_NAME = "kindle_vocab_db";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains("books")) {
          const bookStore = db.createObjectStore("books", { keyPath: "id" });
          bookStore.createIndex("title", "title", { unique: true });
          bookStore.createIndex("asin", "asin", { unique: true });
          bookStore.createIndex("guid", "guid", { unique: true });
          bookStore.createIndex("lang", "lang", { unique: false });
          bookStore.createIndex("authors", "authors", { unique: false });
        }

        if (!db.objectStoreNames.contains("words")) {
          const wordStore = db.createObjectStore("words", { keyPath: "id" });
          wordStore.createIndex("word", "word", { unique: true });
          wordStore.createIndex("stem", "stem", { unique: false });
          wordStore.createIndex("lang", "lang", { unique: false });
          wordStore.createIndex("category", "category", { unique: false });
          wordStore.createIndex("timestamp", "timestamp", { unique: false });
          wordStore.createIndex("profiled", "profiled", { unique: false });
        }

        if (!db.objectStoreNames.contains("lookups")) {
          const lookupStore = db.createObjectStore("lookups", {
            keyPath: "id",
          });
          lookupStore.createIndex("word_key", "word_key", { unique: false });
          lookupStore.createIndex("book_key", "book_key", { unique: false });
          lookupStore.createIndex("dict_key", "dict_key", { unique: false });
          lookupStore.createIndex("pos", "pos", { unique: false });
          lookupStore.createIndex("usage", "usage", { unique: false });
          lookupStore.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async saveBooks(books: BookInfo[]): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("books", "readwrite");
    const store = transaction.objectStore("books");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      books.forEach(book => {
        store.put(book);
      });
    });
  }

  async saveWords(words: Word[]): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("words", "readwrite");
    const store = transaction.objectStore("words");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      words.forEach(word => {
        store.put(word);
      });
    });
  }

  async saveLookups(lookups: Lookup[]): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("lookups", "readwrite");
    const store = transaction.objectStore("lookups");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      lookups.forEach(lookup => {
        store.put(lookup);
      });
    });
  }

  async getAllBooks(): Promise<BookInfo[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("books", "readonly");
    const store = transaction.objectStore("books");

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getWordWithContext(wordId: string): Promise<WordWithContext | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const word = await this.getWord(wordId);
      if (!word) {
        return null;
      }

      const lookups = await this.getWordLookups(wordId);

      return { ...word, lookups };
    } catch (error) {
      console.error("Error getting word with context:", error);
      return null;
    }
  }

  async getWordsByBook(bookId: string): Promise<WordWithContext[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const lookups = await this.getBookLookups(bookId);
      const wordIds = [...new Set(lookups.map(lookup => lookup.word_key))];
      const words: WordWithContext[] = [];

      for (const wordId of wordIds) {
        const word = await this.getWordWithContext(wordId);
        if (word) {
          const wordLookups = lookups.filter(
            lookup => lookup.word_key === wordId
          );
          words.push({ ...word, lookups: wordLookups });
        }
      }

      return words;
    } catch (error) {
      console.error("Error getting words by book:", error);
      return [];
    }
  }

  async getAllWords(): Promise<WordWithContext[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const transaction = this.db.transaction(["words", "lookups"], "readonly");
      const wordStore = transaction.objectStore("words");

      const words = await new Promise<Word[]>((resolve, reject) => {
        const request = wordStore.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const results: WordWithContext[] = [];
      for (const word of words) {
        const lookups = await this.getWordLookups(word.id);
        results.push({ ...word, lookups });
      }

      return results;
    } catch (error) {
      console.error("Error getting all words:", error);
      return [];
    }
  }

  async clearDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const transaction = this.db.transaction(
      ["books", "words", "lookups"],
      "readwrite"
    );
    const bookStore = transaction.objectStore("books");
    const wordStore = transaction.objectStore("words");
    const lookupStore = transaction.objectStore("lookups");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      bookStore.clear();
      wordStore.clear();
      lookupStore.clear();
    });
  }

  async deleteLookup(lookupId: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("lookups", "readwrite");
    const store = transaction.objectStore("lookups");

    return new Promise((resolve, reject) => {
      const request = store.delete(lookupId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWord(wordId: string): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction(["words", "lookups"], "readwrite");
    const wordStore = transaction.objectStore("words");
    const lookupStore = transaction.objectStore("lookups");
    const lookupIndex = lookupStore.index("word_key");

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      wordStore.delete(wordId);

      const lookupRequest = lookupIndex.openCursor(IDBKeyRange.only(wordId));
      lookupRequest.onsuccess = () => {
        const cursor = lookupRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  private async getWord(wordId: string): Promise<Word | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("words", "readonly");
    const store = transaction.objectStore("words");

    return new Promise((resolve, reject) => {
      const request = store.get(wordId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getWordLookups(wordId: string): Promise<Lookup[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("lookups", "readonly");
    const store = transaction.objectStore("lookups");
    const index = store.index("word_key");

    return new Promise((resolve, reject) => {
      const request = index.getAll(wordId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getBookLookups(bookId: string): Promise<Lookup[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const transaction = this.db.transaction("lookups", "readonly");
    const store = transaction.objectStore("lookups");
    const index = store.index("book_key");

    return new Promise((resolve, reject) => {
      const request = index.getAll(bookId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const vocabDB = new VocabDB();
