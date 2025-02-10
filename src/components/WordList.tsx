import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WordWithContext, Lookup } from "@/types";

interface WordListProps {
  words: WordWithContext[];
}

export const WordList: React.FC<WordListProps> = ({ words }) => {
  const highlightWord = (word: string, text: string) => {
    if (!text) return text;
    const regex = new RegExp(`\\b(${word})\\b`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLocaleLowerCase() === word.toLocaleLowerCase()) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  const getLatestLookup = (lookup: Lookup[]) => {
    return lookup.reduce((prev, current) => {
      return prev.timestamp > current.timestamp ? prev : current;
    });
  };

  return (
    <div className="space-y-4">
      {words.map(word => {
        const latestContext = getLatestLookup(word.lookups);

        return (
          <Card key={word.id} className="w-full">
            <CardHeader>
              <CardTitle>{word.word}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{highlightWord(word.word, latestContext.usage)}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
