import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { WordWithContext, Lookup } from "@/types";
import { Download, Edit, Trash2, X, Check } from "lucide-react";
import { vocabDB } from "@/lib/db";

interface WordListProps {
  words: WordWithContext[];
  onWordsUpdate: () => void;
}

export const WordList: React.FC<WordListProps> = ({ words, onWordsUpdate }) => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [wordLimit, setWordLimit] = useState<string>("");
  const [editingContext, setEditingContext] = useState<{
    wordId: string;
    lookupId: string;
    text: string;
  } | null>(null);

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

  const handleEditContext = (wordId: string, lookup: Lookup) => {
    setEditingContext({ wordId, lookupId: lookup.id, text: lookup.usage });
  };

  const handleSaveContext = async () => {
    if (!editingContext) return;

    try {
      const word = words.find(word => word.id === editingContext.wordId);
      const lookup = word?.lookups.find(
        lookup => lookup.id === editingContext.lookupId
      );

      if (!lookup) {
        console.error("Lookup not found");
        return;
      }

      const updatedLookup: Lookup = {
        ...lookup,
        usage: editingContext.text,
      };

      await vocabDB.saveLookups([updatedLookup]);
      setEditingContext(null);
      onWordsUpdate();
    } catch (error) {
      console.error("Error saving context:", error);
    }
  };

  const handleDeleteContext = async (wordId: string, lookupId: string) => {
    if (!confirm("Are you sure you want to delete this context?")) return;

    try {
      const word = words.find(w => w.id === wordId);
      if (!word) return;

      const remainingLookups = word.lookups.filter(l => l.id !== lookupId);

      if (remainingLookups.length === 0) {
        // If this is the last context, delete the word entirely
        await vocabDB.deleteWord(wordId);
      } else {
        // Otherwise, just delete this lookup
        await vocabDB.deleteLookup(lookupId);
      }

      onWordsUpdate();
    } catch (error) {
      console.error("Error deleting context:", error);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!confirm("Are you sure you want to delete this word?")) return;

    try {
      await vocabDB.deleteWord(wordId);
      onWordsUpdate();
    } catch (error) {
      console.error("Error deleting word:", error);
    }
  };

  const exportToAnki = () => {
    const filteredWords = filterAndLimitWords(words);
    const tsvContent = filteredWords
      .map(word => {
        const latest = getLatestLookup(word.lookups);
        const usage = latest.usage.replace(
          word.word,
          `<strong>${word.word}</strong>`
        );
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

  const filterAndLimitWords = (words: WordWithContext[]) => {
    const sortedWords = words.sort((a, b) => {
      return b.lookups.length - a.lookups.length;
    });

    let filteredWords = sortedWords;

    if (dateFrom || dateTo) {
      filteredWords = sortedWords.filter(word => {
        const latestLookup = getLatestLookup(word.lookups);
        const lookupDate = new Date(latestLookup.timestamp);
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        if (fromDate && toDate) {
          return lookupDate >= fromDate && lookupDate <= toDate;
        } else if (fromDate) {
          return lookupDate >= fromDate;
        } else if (toDate) {
          return lookupDate <= toDate;
        }
        return true;
      });
    }

    // Apply word limit if set
    const limit = parseInt(wordLimit);
    if (!isNaN(limit) && limit > 0) {
      filteredWords = filteredWords.slice(0, limit);
    }

    return filteredWords;
  };

  const filterWords = filterAndLimitWords(words);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-4">
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-40"
            placeholder="Start date"
          ></Input>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-40"
            placeholder="End date"
          ></Input>
          <Input
            type="number"
            value={wordLimit}
            onChange={e => setWordLimit(e.target.value)}
            className="w-40"
            placeholder="Word limit"
          ></Input>
        </div>

        <Button
          onClick={exportToAnki}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Download className="w-4 h-4"></Download>
          Export to Anki
        </Button>
      </div>
      {filterWords.map(word => (
        <Card key={word.id} className="w-full relative">
          <Button
            className="absolute top-2 right-2"
            variant="ghost"
            onClick={() => handleDeleteWord(word.id)}
          >
            <X></X>
          </Button>
          <CardHeader>
            <CardTitle>{word.word}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {word.lookups.map(lookup => (
              <div key={lookup.id} className="relative group">
                {editingContext?.lookupId === lookup.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingContext.text}
                      onChange={e =>
                        setEditingContext({
                          ...editingContext,
                          text: e.target.value,
                        })
                      }
                      className="w-full"
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveContext}
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingContext(null)}
                        size="sm"
                        variant="destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <p className="w-4/5">
                      {highlightWord(word.word, lookup.usage)}
                    </p>
                    <div className="hidden group-hover:flex w-1/6 justify-end space-x-1 h-2">
                      <Button
                        onClick={() => handleEditContext(word.id, lookup)}
                        size="sm"
                        variant="link"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteContext(word.id, lookup.id)}
                        size="sm"
                        variant="link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
