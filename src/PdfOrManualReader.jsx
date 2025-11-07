import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfOrManualReader = () => {
  const [mode, setMode] = useState("upload"); // upload | manual
  const [course, setCourse] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [registerNumbers, setRegisterNumbers] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  const extractDataFromText = (text) => {
    try {
      const courseMatch = text.match(/Course\s+([A-Z0-9-]+\s*-\s*.+?)\s+\[/i);
      const dateMatch = text.match(/Date of Examination\s+([\d.]+\s+[0-9:APM\s]+)/i);
      const regMatches = [...text.matchAll(/([A-Z]{5,}\d{3,})/g)].map(m => m[1]);
      const uniqueRegs = [...new Set(regMatches)];

      setCourse(courseMatch ? courseMatch[1].trim() : "");
      setDateTime(dateMatch ? dateMatch[1].trim() : "");
      setRegisterNumbers(uniqueRegs);
      setTotal(uniqueRegs.length);
      setError("");
    } catch (e) {
      setError("Failed to extract data. Try manual mode.");
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str);
      fullText += strings.join(" ") + "\n";
    }
    extractDataFromText(fullText);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Nominal Roll Reader</h1>

      <div className="mb-4">
        <button
          onClick={() => setMode("upload")}
          className={`px-4 py-2 rounded-l-lg ${mode === "upload" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Upload PDF
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-r-lg ${mode === "manual" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Manual Input
        </button>
      </div>

      {mode === "upload" ? (
        <div {...getRootProps()} className={`border-2 border-dashed p-8 text-center rounded-xl ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}>
          <input {...getInputProps()} />
          <p>{isDragActive ? "Drop PDF here..." : "Drag & drop or click to upload PDF"}</p>
          {error && <p className="text-red-600 mt-3">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <input
            type="text"
            placeholder="Course Name"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full border rounded p-2"
          />
          <input
            type="text"
            placeholder="Date & Time"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full border rounded p-2"
          />
          <textarea
            rows="5"
            placeholder="Enter Register Numbers (one per line)"
            value={registerNumbers.join("\n")}
            onChange={(e) => setRegisterNumbers(e.target.value.split("\n"))}
            className="w-full border rounded p-2"
          />
          <p className="font-medium">Total: {registerNumbers.length}</p>
        </div>
      )}

      {course && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border">
          <h2 className="font-semibold text-lg">Extracted Data</h2>
          <p><b>Course:</b> {course}</p>
          <p><b>Date & Time:</b> {dateTime}</p>
          <p><b>Total Students:</b> {total}</p>
          <details className="mt-3">
            <summary className="cursor-pointer text-blue-600">Show Register Numbers</summary>
            <pre className="text-sm mt-2">{registerNumbers.join("\n")}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default PdfOrManualReader;
