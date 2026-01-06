// components/FileManagementPage.js
import React, { useState, useEffect } from "react";
import PDFGenerator from "./PDFGenerator";
import { ArrowLeft, Edit, Plus, Trash2, Eye } from "lucide-react";

const FileManagementPage = ({ exam, updateExam, onBack, onEditHalls }) => {
  const [files, setFiles] = useState(exam.files || []);
  const [showFileManager, setShowFileManager] = useState(false);

  useEffect(() => {
    console.log("Exam data updated:", exam);
  }, [exam]);

  const addFile = (file) => {
    const newFiles = [...files, { id: Date.now(), ...file }];
    setFiles(newFiles);
    updateExam({ ...exam, files: newFiles });
  };

  const removeFile = (id) => {
    const newFiles = files.filter((file) => file.id !== id);
    setFiles(newFiles);
    updateExam({ ...exam, files: newFiles });
  };

  const checkMismatch = (paperDate, paperSession) => {
    return paperDate !== exam.date || paperSession !== exam.session;
  };


  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-col md:flex-row gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Halls
        </button>

        <div className="flex gap-2">
          <button
            onClick={onEditHalls}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Edit className="w-4 h-4" /> Edit Halls
          </button>

          <button
            onClick={() => setShowFileManager(!showFileManager)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            <Eye className="w-4 h-4" /> {showFileManager ? "Hide" : "Show"}{" "}
            Files
          </button>
        </div>
      </div>

      {/* File Manager */}
      {showFileManager && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-300 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Uploaded Files</h3>
            <button
              disabled
              onClick={() =>
                addFile({
                  name: `file-${files.length + 1}.pdf`,
                  type: "manual",
                })
              }
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900
              disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add File
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex justify-between items-center bg-white p-3 rounded-lg border"
              >
                <span className="text-gray-800 font-medium">{file.name}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            ))}

            {files.length === 0 && (
              <>
                {/* <p className="text-gray-600 text-center py-4">
                  File upload functionality is not available now.
                </p> */}

                {exam && exam.papers && exam.papers.length > 0 && (
                  <div className="space-y-4">
                    {exam.papers.map((p, index) => (
                      <div
                        key={index}
                        className="text-gray-700 bg-gray-100 p-4 rounded-lg border"
                      >
                        <div className="font-semibold mb-2">
                          Paper {index + 1}
                          {/* delete feature */}
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this paper?"
                                )
                              ) {
                                const updatedPapers = exam.papers.filter(
                                  (_, i) => i !== index
                                );
                                updateExam(exam.id, { papers: updatedPapers });
                              }
                            }}
                            className="ml-4 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="font-semibold">Paper: {p.course}</p>
                        <p
                          className={`
                    ${
                      checkMismatch(p.extractedDateTime, p.extractedSession)
                        ? "text-red-600"
                        : "text-gray-800"
                    }
                    `}
                        >
                          Date: {p.extractedDateTime} {p.extractedSession}
                          <span>
                            {p.extractedDateTime == null &&
                            p.extractedSession == null
                              ? "Date and session not available is it manual ? then fine"
                              : ""}
                          </span>
                        </p>
                        <p>Total Students: {p.registerNumbers.length}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PDF Generator */}
      <PDFGenerator examData={exam} />
    </div>
  );
};

export default FileManagementPage;
