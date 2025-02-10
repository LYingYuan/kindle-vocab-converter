"use client";

import { useState, useEffect } from "react";
import { WordList } from "@/components/WordList";
import { WordWithContext } from "@/types";
import { vocabDB } from "@/lib/db";

export default function VocabularyPage() {
  const [allWords, setAllWords] = useState<WordWithContext[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const wordsData = await vocabDB.getAllWords();
      setAllWords(wordsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <WordList words={allWords} />
    </div>
  );
}
