"use client";

import { useEffect, useState } from "react";
import { WordList } from "@/components/WordList";
import { vocabDB } from "@/lib/db";
import { WordWithContext } from "@/types";

export default function VocabularyPage() {
  const [words, setWords] = useState<WordWithContext[]>([]);

  const loadWords = async () => {
    try {
      const allWords = await vocabDB.getAllWords();
      setWords(allWords);
    } catch (error) {
      console.error("Error loading words:", error);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  return (
    <div className="container mx-auto py-8">
      <WordList words={words} onWordsUpdate={loadWords} />
    </div>
  );
}
