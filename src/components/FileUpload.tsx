"use client";

import React, { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SqlJsStatic } from "sql.js";
import { useRouter } from "next/navigation";
import { vocabDB } from "@/lib/db";

const FileUpload: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [SQL, setSQL] = useState<SqlJsStatic | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initSQL = async () => {
      try {
        const sqlWasmScript = document.createElement("script");
        sqlWasmScript.src =
          "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.min.js";
        sqlWasmScript.async = true;

        sqlWasmScript.onload = async () => {
          try {
            const initSqlJs = window.initSqlJs;
            const SQL = await initSqlJs({
              locateFile: (file: string) =>
                `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
            });

            setSQL(SQL);
          } catch (error) {
            setError("Failed to initialize SQL.js WASM");
            console.error(error);
          }
        };

        sqlWasmScript.onerror = () => {
          setError("Failed to load SQL.js script");
        };

        document.body.appendChild(sqlWasmScript);

        return () => {
          document.body.removeChild(sqlWasmScript);
        };
      } catch (error) {
        setError("Failed to initialize SQL.js");
        console.error(error);
      }
    };

    vocabDB.init().catch(error => {
      console.error("Failed to initialize IndexedDB:", error);
      setError("Failed to initialize database");
    });

    initSQL();
  }, []);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!SQL) {
      setError("SQL.js is not initialized yet. Please try again.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      const fileBuffer = await file.arrayBuffer();
      const database = new SQL.Database(new Uint8Array(fileBuffer));

      const testQuery = database.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('BOOK_INFO', 'LOOKUPS', 'WORDS')"
      );

      if (!testQuery[0]?.values?.length || testQuery[0].values.length !== 3) {
        throw new Error(
          "Invalid database structure. Please upload a valid Kindle vocabulary database."
        );
      }

      // Clear existing database
      await vocabDB.clearDatabase();

      const booksResult = database.exec(`
        SELECT DISTINCT b.*
        FROM BOOK_INFO b
        INNER JOIN LOOKUPS l ON b.id = l.book_key
        ORDER BY b.title
      `);

      if (booksResult[0]) {
        const books = booksResult[0].values.map(row => ({
          id: row[0] as string,
          asin: row[1] as string,
          guid: row[2] as string,
          lang: row[3] as string,
          title: row[4] as string,
          authors: row[5] as string,
        }));
        await vocabDB.saveBooks(books);
      }

      const wordsResult = database.exec(`
        SELECT DISTINCT w.*
        FROM WORDS w
        INNER JOIN LOOKUPS l ON w.id = l.word_key
        ORDER BY w.word
      `);

      if (wordsResult[0]) {
        const words = wordsResult[0].values.map(row => ({
          id: row[0] as string,
          word: row[1] as string,
          stem: row[2] as string,
          lang: row[3] as string,
          category: row[4] as string,
          timestamp: row[5] as string,
          profiled: row[6] as string,
        }));
        await vocabDB.saveWords(words);
      }

      const lookupsResult = database.exec(`
        SELECT l.*
        FROM LOOKUPS l
        ORDER BY l.timestamp DESC
      `);

      if (lookupsResult[0]) {
        const lookups = lookupsResult[0].values.map(row => ({
          id: row[0] as string,
          word_key: row[1] as string,
          book_key: row[2] as string,
          dict_key: row[3] as string,
          pos: row[4] as string,
          usage: row[5] as string,
          timestamp: row[6] as string,
        }));
        await vocabDB.saveLookups(lookups);
      }

      setSuccess(true);
      router.push("/vocabulary");
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <div className="flex flex-col items-center space-y-2 w-full h-48 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50 hover:bg-gray-100">
        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400"></Upload>
          <span className="mt-2 text-sm text-gray-500">
            {isLoading ? "Processing..." : "Upload your Kindle Vocab.db file"}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".db"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>File uploaded successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FileUpload;
