// components/DateSelectionPage.js
import React, { useState } from "react";
import PDFUpload from "./PDFUpload";
import ManualInput from "./ManualInput";
import {
  Upload,
  Edit,
  Eye,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
} from "lucide-react";

const DateSelectionPage = ({
  exam,
  updateExam,
  onContinue,
  onViewFiles,
  onBack,
}) => {
  const [mode, setMode] = useState("upload");
  const [selectedDate, setSelectedDate] = useState(exam?.date || "");
  const [session, setSession] = useState(exam?.session || "FN");
  const [showFilesList, setShowFilesList] = useState(false);

  const handleDateSubmit = () => {
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
    updateExam(exam.id, {
      date: selectedDate,
      session: session,
      name: `Exam ${new Date(selectedDate).toLocaleDateString()} ${session}`,
    });
  };

  const handlePapersUpdate = (papers) => {
    updateExam(exam.id, { papers });
  };

  const canContinue = exam?.papers?.length > 0 && exam?.date;

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear all papers?")) {
      updateExam(exam.id, { papers: [] });
    }
  };

  const toggleFilesList = () => {
    setShowFilesList(!showFilesList);
  };

  return (
    <div>
      {/* Back Button */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg "
        >
          <ArrowLeft className="w-4 h-4" /> Back to Exams
        </button>
        <button
          disabled={!selectedDate || exam?.papers?.length === 0}
          onClick={onViewFiles}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold
          disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
          "
        >
          <Eye className="w-4 h-4" /> View All Files
        </button>
      </div>
      {/* Exam Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {exam?.name || "New Exam"}
        </h2>
        <p className="text-gray-600">
          Configure date, session, and papers for this exam
        </p>
      </div>

      {/* Date and Session Selection */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-300">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          Exam Date & Session
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Exam Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Session
            </label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="FN">Forenoon (FN)</option>
              <option value="AN">Afternoon (AN)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleDateSubmit}
          className="mt-4 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold mr-2"
        >
          Save Date & Session
        </button>

        {exam?.date && (
          <div className="mt-3 p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg inline-flex items-center gap-2">
            ✓ Date set: {new Date(exam.date).toLocaleDateString()} (
            {exam.session === "FN" ? "Forenoon" : "Afternoon"})
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setMode("upload")}
          className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 text-sm sm:text-medium ${
            mode === "upload"
              ? "bg-gray-800 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Upload className="w-4 h-4" /> Upload PDFs
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 text-sm sm:text-medium ${
            mode === "manual"
              ? "bg-gray-800 text-white shadow-md"
              : "bg-transparent text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Edit className="w-4 h-4" /> Manual Input
        </button>
      </div>

      {/* Content based on mode */}
      <div
        disable={!selectedDate}
        className={!exam?.date ? "opacity-50 pointer-events-none" : ""}
      >
        {!selectedDate && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
            ⚠ Please select and save an exam date and session to proceed.
          </div>
        )}
        {mode === "upload" ? (
          <PDFUpload
            papers={exam.papers}
            onPapersUpdate={handlePapersUpdate}
            selectedDate={selectedDate}
            session={session}
          />
        ) : (
          <ManualInput
            papers={exam.papers}
            onPapersUpdate={handlePapersUpdate}
            selectedDate={selectedDate}
            session={session}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-300">
        <div />

        <button
          onClick={onContinue}
          disabled={!canContinue || !selectedDate || exam?.papers?.length === 0}
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
      {exam?.papers?.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2">Summary</h3>
          <p className="text-gray-700">
            <strong>{exam.papers.length}</strong> paper(s) loaded •{" "}
            <strong>
              {exam.papers.reduce(
                (sum, paper) => sum + paper.registerNumbers.length,
                0
              )}
            </strong>{" "}
            total students
          </p>
          <button
            onClick={clearAll}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
          >
            Clear All Papers
          </button>
          <button
            onClick={toggleFilesList}
            className="mt-3 ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {showFilesList ? "Hide Files" : "Show Files"}
          </button>
        </div>
      )}

      {/* File Upload Unavailable Notice */}
      {showFilesList && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-300 rounded-lg mt-6">
          <p className="text-gray-600 text-center py-4">
            uploaded File show functionality is not available now.
          </p>
          {exam && exam.papers && exam.papers.length > 0 && (
            <div className="space-y-4">
              {exam.papers.map((p, index) => (
                <div
                  key={index}
                  className="text-gray-700 bg-gray-100 p-4 rounded-lg border"
                >
                  <p className="font-semibold">Paper: {p.course}</p>
                  <p>
                    Date: {exam.date} {exam.session}
                  </p>
                  <p>Total Students: {p.registerNumbers.length}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateSelectionPage;
