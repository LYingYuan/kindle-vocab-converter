import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { WordWithContext, Lookup } from "@/types";
import { Download } from "lucide-react";

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

  const exportToAnki = () => {
    const tsvContent = words
      .map(word => {
        const latest = getLatestLookup(word.lookups);
        const usage = latest.usage.replace(word.word, `<strong>${word.word}</strong>`);
        return `${word.word}\t${usage}`;
      })
      .join("\n");

    const blob = new Blob([tsvContent], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "vocab.tsv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={exportToAnki}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Download className="w-4 h-4"></Download>
          Export to Anki
        </button>
      </div>
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
