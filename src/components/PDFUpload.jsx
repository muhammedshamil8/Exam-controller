// components/PDFUpload.js
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Upload, Trash2, CheckCircle, AlertCircle } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PDFUpload = ({ papers, onPapersUpdate }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const extractDataFromText = (text) => {
    // Your existing extraction logic here
    const coursePatterns = [
      /(?:Course|Subject|Paper)?\s*[:]*\s*([A-Z0-9()-]+\s*-\s*[^[]+)/i,
      /^([A-Z]{2,}[0-9A-Z()-]+\s*-\s*.+)$/im,
    ];

    let extractedCourse = "";
    for (const pattern of coursePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedCourse = match[1].trim();
        break;
      }
    }

    const dateMatch = text.match(
      /Date\s+of\s+Examination\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i
    );
    let extractedDate = dateMatch ? dateMatch[1].trim() : "";

    const regMatches = [
      ...text.matchAll(/\b([A-Z]{2,}[A-Z0-9]*[0-9]{2,})\b/g),
    ].map((m) => m[1]);

    let validRegs = [...new Set(regMatches)].filter((r) =>
      /^[A-Z]+[A-Z0-9]*\d+$/.test(r)
    );

    validRegs.sort((a, b) => {
      const prefixA = a.replace(/\d+$/, '');
      const prefixB = b.replace(/\d+$/, '');
      const numA = parseInt(a.replace(prefixA, '')) || 0;
      const numB = parseInt(b.replace(prefixB, '')) || 0;
      
      if (prefixA !== prefixB) {
        return prefixA.localeCompare(prefixB);
      }
      return numA - numB;
    });

    return {
      course: extractedCourse,
      dateTime: extractedDate,
      registerNumbers: validRegs,
    };
  };

  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
      })),
    ]);
  }, []);

  const removeFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const results = [];
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
        results.push(data);
      }

      onPapersUpdate(results);
      setSuccess(true);
      setFiles([]);
    } catch (err) {
      setError("Extraction failed. Please use Manual mode.");
    } finally {
      setLoading(false);
    }
  };

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
            : "Drag & drop or click to upload multiple PDFs"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex justify-between items-center bg-gray-100 p-3 rounded-lg"
            >
              <span className="text-gray-800 font-medium">
                {f.name}
              </span>
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

      {files.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold"
        >
          {loading ? "Extracting..." : "Submit & Extract"}
        </button>
      )}

      {success && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-gray-700" />
          <p className="text-gray-800 font-medium">
            Extraction successful for {papers.length} file(s)!
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-gray-700" />
          <p className="text-gray-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default PDFUpload;