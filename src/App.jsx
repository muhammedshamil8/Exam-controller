// App.js
import React, { useState, useEffect } from "react";
import ExamListPage from "./components/ExamListPage";
import DateSelectionPage from "./components/DateSelectionPage";
import HallConfigurationPage from "./components/HallConfigurationPage";
import FileManagementPage from "./components/FileManagementPage";
import { FileText, Plus } from "lucide-react";

const App = () => {
  const [currentPage, setCurrentPage] = useState("examList");
  const [exams, setExams] = useState(() => {
    const saved = localStorage.getItem("exams");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentExamId, setCurrentExamId] = useState(null);

  // Save to localStorage whenever exams change
  useEffect(() => {
    localStorage.setItem("exams", JSON.stringify(exams));
  }, [exams]);

  // Get current exam data
  const currentExam = exams.find(exam => exam.id === currentExamId);

  // Exam management functions
  const createNewExam = () => {
    const newExam = {
      id: Date.now().toString(),
      name: `Exam ${exams.length + 1}`,
      date: "",
      session: "FN", // FN or AN
      papers: [],
      halls: [],
      files: [],
      createdAt: new Date().toISOString()
    };
    setExams(prev => [...prev, newExam]);
    setCurrentExamId(newExam.id);
    setCurrentPage("dateSelection");
  };

  const updateExam = (examId, newData) => {
    setExams(prev => prev.map(exam => 
      exam.id === examId ? { ...exam, ...newData } : exam
    ));
  };

  const deleteExam = (examId) => {
    setExams(prev => prev.filter(exam => exam.id !== examId));
    if (currentExamId === examId) {
      setCurrentExamId(null);
      setCurrentPage("examList");
    }
  };

  const selectExam = (examId) => {
    setCurrentExamId(examId);
    setCurrentPage("dateSelection");
  };

  const generatePDF = (examId) => {
    setCurrentExamId(examId);
    setCurrentPage("fileManagement");
  }

  const renderPage = () => {
    switch (currentPage) {
      case "examList":
        return (
          <ExamListPage 
            exams={exams}
            onCreateNew={createNewExam}
            onSelectExam={selectExam}
            onGeneratePDF={generatePDF}
            onDeleteExam={deleteExam}
          />
        );
      case "dateSelection":
        return (
          <DateSelectionPage 
            exam={currentExam}
            updateExam={updateExam}
            onContinue={() => setCurrentPage("hallConfiguration")}
            onViewFiles={() => setCurrentPage("fileManagement")}
            onBack={() => setCurrentPage("examList")}
          />
        );
      case "hallConfiguration":
        return (
          <HallConfigurationPage 
            exam={currentExam}
            updateExam={updateExam}
            onBack={() => setCurrentPage("dateSelection")}
            onContinue={() => setCurrentPage("fileManagement")}
          />
        );
      case "fileManagement":
        return (
          <FileManagementPage 
            exam={currentExam}
            updateExam={updateExam}
            onBack={() => setCurrentPage("hallConfiguration")}
            onEditHalls={() => setCurrentPage("hallConfiguration")}
            onBackToExams={() => setCurrentPage("examList")}
          />
        );
      default:
        return <ExamListPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white sm:rounded-2xl shadow-lg p-4 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-gray-800" />
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">
                Exam Hall Management
              </h1>
            </div>
            
            {currentPage !== "examList" && (
              <button
                onClick={createNewExam}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" /> New Exam
              </button>
            )}
          </div>

          {/* Navigation Breadcrumbs */}
          {currentPage !== "examList" && (
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-600 flex-wrap gap-2">
              <button 
                onClick={() => setCurrentPage("examList")}
                className="px-3 py-1 rounded hover:bg-gray-100"
              >
                All Exams
              </button>
              <span>›</span>
              <button 
                onClick={() => setCurrentPage("dateSelection")}
                className={`px-3 py-1 rounded ${currentPage === "dateSelection" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
              >
                {currentExam?.name || "Date & Papers"}
              </button>
              
              {currentPage === "hallConfiguration" && (
                <>
                  <span>›</span>
                  <button 
                    onClick={() => setCurrentPage("hallConfiguration")}
                    className="px-3 py-1 rounded bg-gray-200 font-medium"
                  >
                    Hall Setup
                  </button>
                </>
              )}
              
              {currentPage === "fileManagement" && (
                <>
                  <span>›</span>
                  <button 
                    onClick={() => setCurrentPage("hallConfiguration")}
                    className="px-3 py-1 rounded hover:bg-gray-100"
                  >
                    Hall Setup
                  </button>
                  <span>›</span>
                  <button 
                    onClick={() => setCurrentPage("fileManagement")}
                    className="px-3 py-1 rounded bg-gray-200 font-medium"
                  >
                    PDF Generation
                  </button>
                </>
              )}
            </div>
          )}

          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default App;