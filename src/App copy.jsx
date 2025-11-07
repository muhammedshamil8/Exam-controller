import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import { Upload, FileText, Edit, CheckCircle, AlertCircle } from "lucide-react";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const App = () => {
  const [mode, setMode] = useState("upload");
  const [course, setCourse] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [registerNumbers, setRegisterNumbers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const extractDataFromText = (text) => {
    try {
      // Multiple patterns for course name extraction
      const coursePatterns = [
        /Course\s*:?\s*([A-Z0-9-]+\s*-\s*.+?)(?:\s+\[|\s+Date|\n)/i,
        /Course\s+Name\s*:?\s*(.+?)(?:\s+Date|\n)/i,
        /Subject\s*:?\s*(.+?)(?:\s+Date|\n)/i,
      ];

      // Multiple patterns for date/time extraction
      const datePatterns = [
        /Date\s+of\s+Examination\s*:?\s*([\d.\-/]+\s+[0-9:APM\s]+)/i,
        /Date\s*:?\s*([\d.\-/]+\s+[0-9:APM\s]+)/i,
        /Exam\s+Date\s*:?\s*([\d.\-/]+)/i,
      ];

      // Extract course
      let extractedCourse = "";
      for (const pattern of coursePatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedCourse = match[1].trim();
          break;
        }
      }

      // Extract date/time
      let extractedDateTime = "";
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedDateTime = match[1].trim();
          break;
        }
      }

      // Extract register numbers - flexible pattern for various formats
      // Matches patterns like: ABC123, ABCDE1234, ABC12DE345, etc.
      const regMatches = [...text.matchAll(/\b([A-Z]{2,}[0-9]{2,}[A-Z0-9]*)\b/g)]
        .map(m => m[1])
        .filter(reg => {
          // Filter out common false positives
          const len = reg.length;
          const digitCount = (reg.match(/\d/g) || []).length;
          return len >= 5 && len <= 20 && digitCount >= 2;
        });

      const uniqueRegs = [...new Set(regMatches)];

      if (extractedCourse || extractedDateTime || uniqueRegs.length > 0) {
        setCourse(extractedCourse);
        setDateTime(extractedDateTime);
        setRegisterNumbers(uniqueRegs);
        setError("");
        setSuccess(true);
      } else {
        throw new Error("No data found");
      }
    } catch (e) {
      setError("Unable to extract data automatically. Please use Manual Input mode.");
      setSuccess(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
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
    } catch (e) {
      setError("Failed to process PDF. Please check the file or use Manual Input mode.");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: loading,
  });

  const handleManualUpdate = () => {
    setSuccess(true);
    setError("");
  };

  const resetForm = () => {
    setCourse("");
    setDateTime("");
    setRegisterNumbers([]);
    setError("");
    setSuccess(false);
  };

  const total = registerNumbers.filter(r => r.trim()).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Nominal Roll Reader</h1>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setMode("upload");
                resetForm();
              }}
              className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
                mode === "upload"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
            <button
              onClick={() => {
                setMode("manual");
                resetForm();
              }}
              className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
                mode === "manual"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Edit className="w-4 h-4" />
              Manual Input
            </button>
          </div>

          {/* Upload Mode */}
          {mode === "upload" && (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-all ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50 scale-105"
                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
                } ${loading ? "opacity-50 cursor-wait" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                {loading ? (
                  <p className="text-lg text-gray-600">Processing PDF...</p>
                ) : isDragActive ? (
                  <p className="text-lg text-blue-600 font-medium">Drop PDF here</p>
                ) : (
                  <div>
                    <p className="text-lg text-gray-700 font-medium mb-2">
                      Drag & drop PDF or click to browse
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports various nominal roll formats
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Extraction Failed</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-medium">Data extracted successfully!</p>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {mode === "manual" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., CS101 - Data Structures"
                  value={course}
                  onChange={(e) => {
                    setCourse(e.target.value);
                    handleManualUpdate();
                  }}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date & Time
                </label>
                <input
                  type="text"
                  placeholder="e.g., 15.03.2024 10:00 AM"
                  value={dateTime}
                  onChange={(e) => {
                    setDateTime(e.target.value);
                    handleManualUpdate();
                  }}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Register Numbers <span className="text-gray-500">(one per line)</span>
                </label>
                <textarea
                  rows="8"
                  placeholder="ABC123&#10;DEF456&#10;GHI789"
                  value={registerNumbers.join("\n")}
                  onChange={(e) => {
                    setRegisterNumbers(e.target.value.split("\n"));
                    handleManualUpdate();
                  }}
                  className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <span className="text-blue-800 font-medium">Total Students:</span>
                <span className="text-2xl font-bold text-blue-600">{total}</span>
              </div>
            </div>
          )}

          {/* Extracted Data Display */}
          {(course || dateTime || total > 0) && (
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Extracted Data</h2>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-3">
                {course && (
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Course</p>
                    <p className="text-lg font-semibold text-gray-800">{course}</p>
                  </div>
                )}

                {dateTime && (
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Date & Time</p>
                    <p className="text-lg font-semibold text-gray-800">{dateTime}</p>
                  </div>
                )}

                <div className="bg-white p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600">{total}</p>
                </div>

                {total > 0 && (
                  <details className="bg-white p-4 rounded-lg">
                    <summary className="cursor-pointer text-blue-600 font-medium hover:text-blue-700 flex items-center gap-2">
                      <span>View All Register Numbers</span>
                      <span className="text-sm text-gray-500">({total} students)</span>
                    </summary>
                    <div className="mt-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                        {registerNumbers.filter(r => r.trim()).join("\n")}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Supports multiple PDF formats • Automatic extraction with manual fallback</p>
        </div>
      </div>
    </div>
  );
};

export default App;