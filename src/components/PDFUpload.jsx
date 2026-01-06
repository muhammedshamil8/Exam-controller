import React, { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* =========================
   UTILITIES
========================= */

const normalizeText = (text) =>
  text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*/g, ": ")
    .replace(/\s*-\s*/g, "-")
    .trim();

const detectExamModel = (text) => {
  const system = text.includes("FYUG")
    ? "FYUG"
    : text.includes("CBCSS")
    ? "CBCSS"
    : "UNKNOWN";

  if (system === "UNKNOWN") {
    throw new Error("Unsupported exam format");
  }

  const level =
    system === "CBCSS" && text.includes("CBCSS-PG")
      ? "PG"
      : system === "CBCSS"
      ? "UG"
      : "FYUG";

  const category = system === "CBCSS" && text.includes("SDE") ? "SDE" : "REG";

  return { system, level, category };
};

const extractDateTime = (text) => {
  const dateMatch = text.match(/\b(\d{2}[.\-/]\d{2}[.\-/]\d{4})\b/);
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*[AP]M)\b/i);

  if (!dateMatch) return "";

  return `${dateMatch[1]} ${timeMatch?.[1] || ""}`.trim();
};

const extractCourseOrPaper = (text, system) => {
  if (system === "FYUG") {
    const match = text.match(/Course\s+([A-Z0-9]+)\s*-\s*(.+?)\s*\[/i);
    return match ? `${match[1]} - ${match[2]}` : "";
  }

  const match = text.match(/Paper Details\s*:\s*(.+?)\s*\/\s*\d{4}/i);
  return match ? match[1].trim() : "";
};

const extractRegisterNumbers = (text) => {
  const matches = [...text.matchAll(/\b([A-Z]{4,}\d{2,5})\b/g)].map(
    (m) => m[1]
  );

  return [...new Set(matches)].sort();
};

const extractDataFromText = (rawText) => {
  const text = normalizeText(rawText);
  const model = detectExamModel(text);

  return {
    ...model,
    course: extractCourseOrPaper(text, model.system),
    dateTime: extractDateTime(text),
    registerNumbers: extractRegisterNumbers(text),
    fileName: "",
  };
};

/* =========================
   COMPONENT
========================= */

const PDFUpload = ({
  papers,
  onPapersUpdate,
  selectedDate,
  session,
  onValidationError,
}) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dateTimeWarnings, setDateTimeWarnings] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
      })),
    ]);
    setError("");
    setDateTimeWarnings([]);
  }, []);

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const normalizeDate = (d) => d.replace(/[./]/g, "-");

  const handleSubmit = async () => {
    if (!files.length) return;

    setLoading(true);
    setError("");
    setSuccess(false);
    setDateTimeWarnings([]);

    try {
      const results = [];
      const warnings = [];

      for (const f of files) {
        const buffer = await f.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((it) => it.str).join(" ") + " ";
        }

        const data = extractDataFromText(fullText);
        data.fileName = f.name;

        // ✅ DATE MISMATCH CHECK (HERE)
        if (selectedDate && data.dateTime) {
          const pdfDate = normalizeDate(data.dateTime);
          const selected = normalizeDate(selectedDate);

          if (!pdfDate.includes(selected)) {
            warnings.push({
              type: "date-mismatch",
              message: `Date mismatch in "${f.name}"`,
              severity: "warning",
            });
          }
        }

        results.push(data);
      }

      setDateTimeWarnings(warnings);
      onValidationError(warnings.length > 0);

      onPapersUpdate([...(papers || []), ...results]);
      setFiles([]);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Extraction failed. Please use Manual mode.");
      onValidationError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!papers?.length) {
      setSuccess(false);
      setError("");
      setDateTimeWarnings([]);
    }
  }, [papers]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-all ${
          isDragActive
            ? "border-gray-500 bg-gray-100"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="font-medium">
          {isDragActive
            ? "Drop PDF files here"
            : "Drag & drop or click to upload PDFs"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex justify-between bg-gray-100 p-3 rounded"
            >
              <span>{f.name}</span>
              <button onClick={() => removeFile(f.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 px-6 py-3 bg-gray-800 text-white rounded disabled:opacity-50"
        >
          {loading ? "Extracting..." : "Submit & Extract"}
        </button>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 bg-green-100 p-3 rounded">
          <CheckCircle className="w-5 h-5 text-green-700" />
          <span>Extraction successful</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 bg-red-50 p-3 rounded">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
