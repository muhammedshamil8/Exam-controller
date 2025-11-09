// App.js
import React, { useState, useEffect } from "react";
import DateSelectionPage from "./components/DateSelectionPage";
import HallConfigurationPage from "./components/HallConfigurationPage";
import FileManagementPage from "./components/FileManagementPage";
import { FileText } from "lucide-react";

const App = () => {
  const [currentPage, setCurrentPage] = useState("dateSelection");
  const [examData, setExamData] = useState(() => {
    const saved = localStorage.getItem("examData");
    return saved ? JSON.parse(saved) : {
      selectedDate: "",
      papers: [],
      halls: [],
      files: []
    };
  });

  // Save to localStorage whenever examData changes
  useEffect(() => {
    localStorage.setItem("examData", JSON.stringify(examData));
  }, [examData]);

  const updateExamData = (newData) => {
    setExamData(prev => ({ ...prev, ...newData }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dateSelection":
        return (
          <DateSelectionPage 
            examData={examData}
            updateExamData={updateExamData}
            onContinue={() => setCurrentPage("hallConfiguration")}
            onViewFiles={() => setCurrentPage("fileManagement")}
          />
        );
      case "hallConfiguration":
        return (
          <HallConfigurationPage 
            examData={examData}
            updateExamData={updateExamData}
            onBack={() => setCurrentPage("dateSelection")}
            onContinue={() => setCurrentPage("fileManagement")}
          />
        );
      case "fileManagement":
        return (
          <FileManagementPage 
            examData={examData}
            updateExamData={updateExamData}
            onBack={() => setCurrentPage("hallConfiguration")}
            onEditHalls={() => setCurrentPage("hallConfiguration")}
          />
        );
      default:
        return <DateSelectionPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-gray-800" />
            <h1 className="text-3xl font-bold text-gray-800">
              Multi PDF Nominal Roll Reader
            </h1>
          </div>

          {/* Navigation Breadcrumbs */}
          <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
            <button 
              onClick={() => setCurrentPage("dateSelection")}
              className={`px-3 py-1 rounded ${currentPage === "dateSelection" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
            >
              Date & Papers
            </button>
            <span>›</span>
            <button 
              onClick={() => setCurrentPage("hallConfiguration")}
              className={`px-3 py-1 rounded ${currentPage === "hallConfiguration" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
              disabled={!examData.papers.length}
            >
              Hall Configuration
            </button>
            <span>›</span>
            <button 
              onClick={() => setCurrentPage("fileManagement")}
              className={`px-3 py-1 rounded ${currentPage === "fileManagement" ? "bg-gray-200 font-medium" : "hover:bg-gray-100"}`}
              disabled={!examData.halls.length}
            >
              PDF Generation
            </button>
          </div>

          {renderPage()}
        </div>
      </div>
    </div>
  );
};

export default App;