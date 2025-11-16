import React, { useState } from "react";
import { Plus, Calendar, Users, FileText, Trash2, Edit, Clock, ArrowRight, HardDrive } from "lucide-react";

// storage helpers
const MAX_STORAGE = 5 * 1024 * 1024;

const getLocalStorageSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (!localStorage.hasOwnProperty(key)) continue;
    const value = localStorage.getItem(key);
    total += key.length + (value ? value.length : 0);
  }
  return total;
};

const formatBytes = (bytes) => {
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
};

const getExamSize = (exam) => {
  try {
    return new Blob([JSON.stringify(exam)]).size;
  } catch {
    return JSON.stringify(exam).length;
  }
};

const getPaperSize = (paper) => {
  try {
    return new Blob([JSON.stringify(paper)]).size;
  } catch {
    return JSON.stringify(paper).length;
  }
};


// MAIN COMPONENT
const ExamListPage = ({ exams, onCreateNew, onSelectExam, onDeleteExam, onGeneratePDF }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExams = exams.filter(exam => 
    exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.date.includes(searchTerm)
  );

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalStudents = (exam) => {
    return exam.papers.reduce((sum, paper) => sum + paper.registerNumbers.length, 0);
  };

  const getExamStatus = (exam) => {
    if (!exam.date) return "draft";
    if (exam.papers.length === 0) return "setup";
    if (exam.halls.length === 0) return "halls";
    return "ready";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "setup": return "bg-yellow-100 text-yellow-800";
      case "halls": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "draft": return "Draft";
      case "setup": return "Needs Papers";
      case "halls": return "Needs Halls";
      case "ready": return "Ready";
      default: return "Draft";
    }
  };

  // storage
  const usedBytes = getLocalStorageSize();
  const usedPercent = ((usedBytes / MAX_STORAGE) * 100).toFixed(1);

  return (
    <div>

      {/* STORAGE BAR */}
      <div className="mb-6 p-4 bg-gray-100 border rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-800">Storage Usage</span>
        </div>

        <div className="w-full bg-gray-300 h-3 rounded-full overflow-hidden mb-2">
          <div
            className={`h-3 rounded-full ${
              usedPercent > 90 ? "bg-red-600" :
              usedPercent > 70 ? "bg-orange-500" :
              "bg-green-600"
            }`}
            style={{ width: `${usedPercent}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-700">
          {formatBytes(usedBytes)} used / {formatBytes(MAX_STORAGE)} ({usedPercent}%)
        </p>

        {usedPercent > 90 && (
          <p className="text-red-600 text-sm mt-1 font-semibold">
            Storage almost full. Delete some exams.
          </p>
        )}
      </div>


      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Exams</h2>
          <p className="text-gray-600">Manage multiple exam dates and sessions</p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold"
        >
          <Plus className="w-5 h-5" /> Create New Exam
        </button>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search exams by name or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.map((exam) => {
          const status = getExamStatus(exam);
          const totalStudents = getTotalStudents(exam);
          const examSize = getExamSize(exam);

          return (
            <div key={exam.id} className="border p-6 rounded-xl bg-white hover:shadow-md transition">

              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-800">{exam.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(exam.date)}
                </div>

                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {totalStudents} students
                </div>

                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {exam.papers.length} papers
                </div>

                {/* EXAM STORAGE SIZE */}
                <div className="text-xs text-gray-500">
                  Size: {formatBytes(examSize)}
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectExam(exam.id)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>

                  <button
                    onClick={() => onDeleteExam(exam.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>

                {status === "ready" && (
                  <button
                    onClick={() => onGeneratePDF(exam.id)}
                    className="px-3 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900"
                  >
                    Generate <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* PAPERS LIST WITH STORAGE */}
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-2 text-gray-700">Papers Storage</div>
                {exam.papers.map((paper, i) => (
                  <div key={i} className="text-xs text-gray-600 mb-1">
                    • {paper.course} — <span className="text-gray-800">{formatBytes(getPaperSize(paper))}</span>
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExamListPage;
