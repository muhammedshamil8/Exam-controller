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

  const extractDataFromText = (text) => {
    const coursePatterns = [
      /Paper Details\s*[:]*\s*(.+?--\([A-Za-z0-9]+\)\s*\/\s*\d{4})/i,
      // old patterns remain below
      /(?:Course|Subject|Paper)?\s*[:]*\s*([A-Z0-9]+(?:\s*\([^)]*\))?\s*-\s*[^[]+)/i,
      /^([A-Z]{2,}[0-9A-Z]+(?:\s*\([^)]*\))?\s*-\s*.+)$/im,
    ];

    let extractedCourse = "";
    for (const pattern of coursePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedCourse = match[1].trim();
        break;
      }
    }

    const dateTimePatterns = [
      /Exam Date\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i,
      /Date\s+of\s+Examination\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i,
      /Date\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i,
      /Exam\s+Date\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i,
      /Time\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i,
      /([\d]{1,2}[/-][\d]{1,2}[/-][\d]{4}\s+[\d]{1,2}:[\d]{2}\s*[APMapm]*)/,
    ];

    let extractedDateTime = "";
    for (const pattern of dateTimePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedDateTime = match[1].trim();
        break;
      }
    }

    if (!extractedDateTime) {
      const dateMatch = text.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4})/);
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[APMapm]*)/);
      if (dateMatch && timeMatch)
        extractedDateTime = `${dateMatch[1]} ${timeMatch[1]}`;
      else if (dateMatch) extractedDateTime = dateMatch[1];
      else if (timeMatch) extractedDateTime = timeMatch[1];
    }

    // text = text.replace(/\b[A-Z]{2,}\d{2,}[A-Z]{0,}\s*-\s*[^.\n]+/g, "");
    text = text.replace(/\b[A-Z]{2,}\d{2,}[A-Z]{0,}\s*-\s*[^\n(]+$/gm, "");

    const regMatches = [...text.matchAll(/\b([A-Z]{6,}[A-Z]*\d{2,3})\b/g)].map(
      (m) => m[1]
    );

    let validRegs = [...new Set(regMatches)].filter((r) =>
      /^[A-Z]+[A-Z0-9]*\d+$/.test(r)
    );
    validRegs = validRegs.filter(
      (r) => !/[A-Z]{2,}\d[A-Z]{1,}/.test(r.slice(0, 8))
    );

    validRegs.sort((a, b) => {
      const prefixA = a.replace(/\d+$/, "");
      const prefixB = b.replace(/\d+$/, "");
      const numA = parseInt(a.replace(prefixA, "")) || 0;
      const numB = parseInt(b.replace(prefixB, "")) || 0;
      return prefixA === prefixB ? numA - numB : prefixA.localeCompare(prefixB);
    });

    return {
      course: extractedCourse,
      dateTime: extractedDateTime,
      registerNumbers: validRegs,
      fileName: "",
    };
  };

  const validateDateTimeConsistency = (extractedPapers) => {
    const warnings = [];
    const dateTimeGroups = {};

    extractedPapers.forEach((paper) => {
      if (!paper.dateTime) {
        warnings.push({
          type: "missing",
          message: `No date/time found in "${paper.fileName}"`,
          severity: "warning",
        });
        return;
      }
      if (!dateTimeGroups[paper.dateTime]) dateTimeGroups[paper.dateTime] = [];
      dateTimeGroups[paper.dateTime].push(paper.fileName);
    });

    const uniqueDateTimes = Object.keys(dateTimeGroups);
    if (uniqueDateTimes.length > 1) {
      warnings.push({
        type: "conflict",
        message: `Different exam dates detected across PDFs (${uniqueDateTimes.length})`,
        details: uniqueDateTimes.map((dt) => ({
          dateTime: dt,
          files: dateTimeGroups[dt],
        })),
        severity: "warning",
      });
    }

    return warnings;
  };

  const formatDateTimeWarnings = (warnings) =>
    warnings.map((warning, index) => (
      <div
        key={index}
        className={`p-3 rounded-lg mb-2 ${
          warning.severity === "error"
            ? "bg-red-50 border border-red-200"
            : "bg-yellow-50 border border-yellow-200"
        }`}
      >
        <div className="flex items-start gap-2">
          <AlertCircle
            className={`w-5 h-5 mt-0.5 ${
              warning.severity === "error" ? "text-red-600" : "text-yellow-600"
            }`}
          />
          <div className="flex-1">
            <p
              className={`font-medium ${
                warning.severity === "error"
                  ? "text-red-800"
                  : "text-yellow-800"
              }`}
            >
              {warning.message}
            </p>

            {/* ✅ Handle conflict warnings */}
            {warning.type === "conflict" && warning.details && (
              <div className="mt-2 text-sm">
                {warning.details.map((detail, idx) => (
                  <div key={idx} className="ml-2 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-mono text-gray-600">
                      {detail.dateTime}
                    </span>
                    {detail.files?.length > 0 && (
                      <span className="text-gray-500">
                        – {detail.files.join(", ")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ✅ Handle date/session mismatch warnings */}
            {(warning.type === "date-mismatch" ||
              warning.type === "session-mismatch") &&
              warning.details && (
                <div className="mt-2 text-sm">
                  <ul className="ml-4 list-disc text-gray-600">
                    {warning.details.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

            {/* ✅ Handle missing date/time warnings */}
            {warning.type === "missing" && warning.fileName && (
              <div className="mt-2 text-sm text-gray-600 ml-4">
                File: {warning.fileName}
              </div>
            )}
          </div>
        </div>
      </div>
    ));

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
      })),
    ]);
    setDateTimeWarnings([]);
    setError("");
  }, []);

  const removeFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
    setDateTimeWarnings([]);
    setError("");
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess(false);
    setDateTimeWarnings([]);

    try {
      const results = [];
      const warnings = [];

      for (const f of files) {
        const arrayBuffer = await f.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        const data = extractDataFromText(fullText);
        data.fileName = f.name;

        const formattedSelected = selectedDate
          ? selectedDate.split("-").reverse().join("-")
          : "";

        if (data.dateTime) {
          const pdfDateNorm = data.dateTime
            .replace(/[^0-9A-Za-z]/g, "")
            .toLowerCase();
          const selectedNorm = formattedSelected
            .replace(/[^0-9A-Za-z]/g, "")
            .toLowerCase();

          if (formattedSelected && !pdfDateNorm.includes(selectedNorm)) {
            warnings.push({
              type: "date-mismatch",
              message: `Date mismatch in "${f.name}"`,
              details: [
                `Extracted: ${data.dateTime}`,
                `Expected: ${formattedSelected}`,
              ],
              severity: "warning",
            });
          }

          const extractedSession = data.dateTime.toUpperCase().includes("AN")
            ? "AN"
            : "FN";
          if (session && extractedSession !== session) {
            warnings.push({
              type: "session-mismatch",
              message: `Session mismatch in "${f.name}"`,
              details: [
                `Extracted: ${extractedSession}`,
                `Expected: ${session}`,
              ],
              severity: "warning",
            });
          }
          data.extractedSession = extractedSession;
        }

        // const formattedDate = selectedDate
        //   ? selectedDate.split("-").reverse().join("-")
        //   : "";
        // data.dateTime = `${formattedDate} ${session}`;
        const extracted = data.dateTime;

        const onlyDate = extracted.split(" ")[0];
        const normalized = onlyDate.replace(/[./]/g, "-");
        const parts = normalized.split("-");
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

        data.extractedDateTime = formattedDate;

        results.push(data);
      }

      const consistencyWarnings = validateDateTimeConsistency(results);
      setDateTimeWarnings([...warnings, ...consistencyWarnings]);
      if (warnings.length > 0 || consistencyWarnings.length > 0) {
        onValidationError(true); // BLOCK parent
      } else {
        onValidationError(false); // CLEAR error
      }

      onPapersUpdate([...(papers || []), ...results]);
      setSuccess(true);
      setFiles([]);
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError("Extraction failed. Please use Manual mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (papers.length === 0) {
      setDateTimeWarnings([]);
      setError("");
      setSuccess(false);
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
            ? "border-gray-500 bg-gray-100 scale-105"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-700 font-medium">
          {isDragActive
            ? "Drop PDF files here"
            : "Drag & drop or click to upload PDFs"}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Upload all PDFs for the same exam schedule
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-lg"
            >
              <span className="text-gray-800 font-medium">{f.name}</span>
              <button
                onClick={() => removeFile(f.id)}
                className="text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {dateTimeWarnings.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Schedule Validation
          </h4>
          {formatDateTimeWarnings(dateTimeWarnings)}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold disabled:opacity-50"
          >
            {loading ? "Extracting..." : "Submit & Extract"}
          </button>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-700" />
          <p className="text-green-800 font-medium">
            Extraction successful for {papers.length} file(s)!
            {dateTimeWarnings.length > 0 && " (with warnings)"}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;
