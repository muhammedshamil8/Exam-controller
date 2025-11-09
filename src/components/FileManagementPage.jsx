// components/FileManagementPage.js
import React, { useState, useEffect } from "react";
import PDFGenerator from "./PDFGenerator";
import { ArrowLeft, Edit, Plus, Trash2, Eye } from "lucide-react";


const FileManagementPage = ({ exam, updateExam, onBack, onEditHalls }) => {
  const [files, setFiles] = useState(exam.files || []);
  const [showFileManager, setShowFileManager] = useState(false);

  const addFile = (file) => {
    const newFiles = [...files, { id: Date.now(), ...file }];
    setFiles(newFiles);
    updateExam({ ...exam, files: newFiles });
  };

  const removeFile = (id) => {
    const newFiles = files.filter(file => file.id !== id);
    setFiles(newFiles);
    updateExam({ ...exam, files: newFiles });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
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
            <Eye className="w-4 h-4" /> {showFileManager ? 'Hide' : 'Show'} Files
          </button>
        </div>
      </div>

      {/* File Manager */}
      {showFileManager && (
        <div className="mb-6 p-6 bg-gray-50 border border-gray-300 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Uploaded Files</h3>
            <button
              onClick={() => addFile({ name: `file-${files.length + 1}.pdf`, type: 'manual' })}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
            >
              <Plus className="w-4 h-4" /> Add File
            </button>
          </div>
          
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex justify-between items-center bg-white p-3 rounded-lg border">
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
              <p className="text-gray-600 text-center py-4">No files uploaded yet</p>
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