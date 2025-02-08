"use client";

import React, { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Database } from "sql.js";

interface BookInfo {
  id: string;
  asin: string;
  guid: string;
  lang: string;
  title: string;
  authors: string;
}

interface Lookup {
  id: string;
  word_key: string;
  book_key: string;
  dict_key: string;
  pos: string;
  usage: string;
  timestamp: string;
}

interface Word {
  id: string;
  word: string;
  stem: string;
  lang: string;
  category: string;
  timestamp: string;
  profiled: string;
}

const FileUpload: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [db, setDb] = useState<Database | null>(null);
  const [SQL, setSQL] = useState<any>(null);

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

      setDb(database);
      setSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div>
        <label>
          <Upload></Upload>
          <span>
            {isLoading ? "Processing..." : "Upload your Kindle Vocab.db file"}
          </span>
          <input
            type="file"
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
