// components/ExamListPage.js
import React, { useState } from "react";
import {
  Plus,
  Calendar,
  Users,
  FileText,
  Trash2,
  Edit,
  Clock,
  ArrowRight,
  HardDrive,
} from "lucide-react";

// storage helpers
const MAX_STORAGE = 5 * 1024 * 1024;

const formatBytes = (bytes) => {
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + " KB";
  return (kb / 1024).toFixed(2) + " MB";
};

const getLocalStorageSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (!localStorage.hasOwnProperty(key)) continue;
    const value = localStorage.getItem(key);
    total += key.length + (value ? value.length : 0);
  }
  return total;
};

const ExamListPage = ({
  exams,
  onCreateNew,
  onSelectExam,
  onDeleteExam,
  onGeneratePDF,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterSession, setFilterSession] = useState(""); // FN / AN

  // FILTERING
  const filteredExams = exams
    .filter(
      (exam) =>
        exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.date.includes(searchTerm)
    )
    .filter((exam) => {
      if (filterDate && exam.date !== filterDate) return false;
      if (filterSession && exam.session !== filterSession) return false;
      return true;
    });

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalStudents = (exam) => {
    return exam.papers.reduce(
      (sum, paper) => sum + paper.registerNumbers.length,
      0
    );
  };

  const getExamStatus = (exam) => {
    if (!exam.date) return "draft";
    if (exam.papers.length === 0) return "setup";
    if (exam.halls.length === 0) return "halls";
    return "ready";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "setup":
        return "bg-yellow-100 text-yellow-800";
      case "halls":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "setup":
        return "Needs Papers";
      case "halls":
        return "Needs Halls";
      case "ready":
        return "Ready";
      default:
        return "Draft";
    }
  };

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
              usedPercent > 90
                ? "bg-red-600"
                : usedPercent > 70
                ? "bg-orange-500"
                : "bg-green-600"
            }`}
            style={{ width: `${usedPercent}%` }}
          ></div>
        </div>

        <p className="text-sm text-gray-700">
          {formatBytes(usedBytes)} used / {formatBytes(MAX_STORAGE)} (
          {usedPercent}%)
        </p>

        {usedPercent > 90 && (
          <p className="text-red-600 text-sm mt-1 font-semibold">
            Storage almost full. Delete some exams.
          </p>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Your Exams</h2>
          <p className="text-gray-600">
            Manage multiple exam dates and sessions
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold"
        >
          <Plus className="w-5 h-5" /> Create New Exam
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search exams by name or date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg"
        />
      </div>

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="text-sm text-gray-600">Filter by Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="flex-1">
          <label className="text-sm text-gray-600">Filter by Session</label>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg"
          >
            <option value="">All Sessions</option>
            <option value="FN">Forenoon (FN)</option>
            <option value="AN">Afternoon (AN)</option>
          </select>
        </div>
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            No exams yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first exam to get started
          </p>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold mx-auto"
          >
            <Plus className="w-5 h-5" /> Create First Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const status = getExamStatus(exam);
            const totalStudents = getTotalStudents(exam);

            return (
              <div
                key={exam.id}
                className="border border-gray-300 rounded-xl p-6 bg-white hover:shadow-md transition-shadow"
              >
                {/* Title + Status */}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    {exam.name}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      status
                    )}`}
                  >
                    {getStatusText(status)}
                  </span>
                </div>

                {/* DATE SUB-HEADING */}
                <p className="text-sm font-medium text-gray-700 mb-4">
                  {formatDate(exam.date)}{" "}
                  {exam.session && (
                    <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {exam.session}
                    </span>
                  )}
                </p>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(exam.date)}</span>
                  </div>

                  {exam.session && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {exam.session === "FN" ? "Forenoon" : "Afternoon"}{" "}
                        Session
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{totalStudents} students</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span>{exam.papers.length} papers</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200 flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectExam(exam.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => onDeleteExam(exam.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>

                  {status === "ready" && (
                    <button
                      onClick={() => onGeneratePDF(exam.id)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium"
                    >
                      Generate PDFs <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {exams.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-800">
              {exams.length}
            </div>
            <div className="text-sm text-gray-600">Total Exams</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {exams.filter((exam) => getExamStatus(exam) === "ready").length}
            </div>
            <div className="text-sm text-gray-600">Ready</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">
              {exams.reduce((sum, exam) => sum + getTotalStudents(exam), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">
              {exams.reduce((sum, exam) => sum + exam.papers.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Papers</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamListPage;
