// components/DateSelectionPage.js
import React, { useState } from "react";
import PDFUpload from "./PDFUpload";
import ManualInput from "./ManualInput";
import { Upload, Edit, Eye, ArrowRight } from "lucide-react";

const DateSelectionPage = ({ examData, updateExamData, onContinue, onViewFiles }) => {
  const [mode, setMode] = useState("upload");
  const [selectedDate, setSelectedDate] = useState(examData.selectedDate || "");

  const handleDateSubmit = () => {
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
    updateExamData({ selectedDate });
  };

  const handlePapersUpdate = (papers) => {
    updateExamData({ papers });
  };

  const canContinue = examData.papers.length > 0 && examData.selectedDate;

  return (
    <div>
      {/* Date Selection */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Select Exam Date</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>
          <button
            onClick={handleDateSubmit}
            className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold"
          >
            Set Date
          </button>
        </div>
        
        {examData.selectedDate && (
          <div className="mt-3 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg inline-flex items-center gap-2">
            ✓ Date set: {new Date(examData.selectedDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode("upload")}
          className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
            mode === "upload"
              ? "bg-gray-800 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Upload className="w-4 h-4" /> Upload PDFs
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
            mode === "manual"
              ? "bg-gray-800 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Edit className="w-4 h-4" /> Manual Input
        </button>
      </div>

      {/* Content based on mode */}
      {mode === "upload" ? (
        <PDFUpload 
          papers={examData.papers}
          onPapersUpdate={handlePapersUpdate}
        />
      ) : (
        <ManualInput 
          papers={examData.papers}
          onPapersUpdate={handlePapersUpdate}
        />
      )}

      {/* Action Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-300">
        <button
          onClick={onViewFiles}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          <Eye className="w-4 h-4" /> View All Files
        </button>
        
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold ${
            canContinue
              ? "bg-gray-800 text-white hover:bg-gray-900"
              : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          Continue to Hall Setup <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      {examData.papers.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2">Summary</h3>
          <p className="text-gray-700">
            <strong>{examData.papers.length}</strong> paper(s) loaded •{" "}
            <strong>
              {examData.papers.reduce((sum, paper) => sum + paper.registerNumbers.length, 0)}
            </strong>{" "}
            total students
          </p>
        </div>
      )}
    </div>
  );
};

export default DateSelectionPage;