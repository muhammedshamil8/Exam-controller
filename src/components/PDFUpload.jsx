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

const detectExamType = (text) => {
  const upper = text.toUpperCase();
  return upper.includes("DISTANCE") || upper.includes("SDE") ? "SDE" : "REG";
};

const detectLevel = (text) => {
  const upper = text.toUpperCase();

  if (
    upper.includes("MSC") ||
    upper.includes("MCOM") ||
    upper.includes("MA") ||
    upper.includes("PG")
  ) {
    return "PG";
  }

  if (
    upper.includes("BA") ||
    upper.includes("BSC") ||
    upper.includes("BCOM") ||
    upper.includes("UG")
  ) {
    return "UG";
  }

  return "UNKNOWN";
};

const detectSystem = (text) => {
  const upper = text.toUpperCase();

  if (upper.includes("FYUG")) return "FYUG";
  if (upper.includes("CBCSS")) return "CBCSS";
  if (upper.includes("DISTANCE")) return "DISTANCE";

  return "UNKNOWN";
};

const detectExamModel = (text) => {
  return {
    exam_type: detectExamType(text),
    level: detectLevel(text),
    system: detectSystem(text),
  };
};

const extractDateAndSession = (text) => {
  const dateMatch = text.match(/(\d{2})\s*[.\-/]\s*(\d{2})\s*[.\-/]\s*(\d{4})/);

  if (!dateMatch) {
    return { date: "", session: "" };
  }

  const [, dd, mm, yyyy] = dateMatch;
  const date = `${yyyy}-${mm}-${dd}`; // ISO format

  // Detect session from AM / PM
  const upper = text.toUpperCase();
  let session = "";

  if (upper.includes("AM")) session = "FN";
  else if (upper.includes("PM")) session = "AN";

  return { date, session };
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
  const { date, session } = extractDateAndSession(text);
  return {
    ...model,
    course: extractCourseOrPaper(text, model.system),
    extractedDateTime: date,
    extractedSession: session,
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

  const toISODate = (input) => {
    if (!input) return "";
    const clean = input.split(" ")[0].replace(/[./]/g, "-");

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // If DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
      const [dd, mm, yyyy] = clean.split("-");
      return `${yyyy}-${mm}-${dd}`;
    }

    return "";
  };

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

        // console.log("Extracted data from", selectedDate, data.extractedDateTime, f.name);

        // ✅ DATE MISMATCH CHECK (HERE)
        if (selectedDate && data.extractedDateTime && selectedDate !== data.extractedDateTime) {
          warnings.push({
            type: "date-mismatch",
            message: `Date mismatch in "${f.name}"`,
            severity: "warning",
          });
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
