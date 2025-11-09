// components/ManualInput.js
import React from "react";
import { PlusCircle } from "lucide-react";

const ManualInput = ({ papers, onPapersUpdate }) => {
  const addManualPaper = () => {
    onPapersUpdate([...papers, { course: "", dateTime: "", registerNumbers: [] }]);
  };

  const updatePaper = (index, key, value) => {
    const updated = [...papers];
    if (key === "registerNumbers") {
      const lines = value
        .split("\n")
        .map((l) => l.trim())
        .filter((r) => /^[A-Z]+[A-Z0-9]*\d+$/.test(r));
      
      lines.sort((a, b) => {
        const prefixA = a.replace(/\d+$/, '');
        const prefixB = b.replace(/\d+$/, '');
        const numA = parseInt(a.replace(prefixA, '')) || 0;
        const numB = parseInt(b.replace(prefixB, '')) || 0;
        
        if (prefixA !== prefixB) {
          return prefixA.localeCompare(prefixB);
        }
        return numA - numB;
      });
      
      updated[index][key] = lines;
    } else {
      updated[index][key] = value;
    }
    onPapersUpdate(updated);
  };

  const removePaper = (index) => {
    const updated = papers.filter((_, i) => i !== index);
    onPapersUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {papers.map((paper, index) => (
        <div
          key={index}
          className="border border-gray-300 p-5 rounded-lg bg-gray-50 relative"
        >
          <button
            onClick={() => removePaper(index)}
            className="absolute top-3 right-3 text-red-600 hover:text-red-800"
          >
            ×
          </button>
          
          <h3 className="font-semibold text-gray-700 mb-3">
            Paper {index + 1}
          </h3>
          <input
            type="text"
            placeholder="Course Name"
            value={paper.course}
            onChange={(e) =>
              updatePaper(index, "course", e.target.value)
            }
            className="w-full border p-2 rounded mb-3"
          />
          <input
            type="text"
            placeholder="Date & Time (e.g., 04-11-2025 FN)"
            value={paper.dateTime}
            onChange={(e) =>
              updatePaper(index, "dateTime", e.target.value)
            }
            className="w-full border p-2 rounded mb-3"
          />
          <textarea
            rows="5"
            placeholder="Register numbers (one per line) - will be auto-sorted"
            value={paper.registerNumbers.join("\n")}
            onChange={(e) =>
              updatePaper(index, "registerNumbers", e.target.value)
            }
            className="w-full border p-2 rounded font-mono text-sm"
          />
          <p className="text-sm text-gray-700 font-medium mt-1">
            Total: {paper.registerNumbers.length} (Auto-sorted by prefix then number)
          </p>
        </div>
      ))}
      
      <button
        onClick={addManualPaper}
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
      >
        <PlusCircle className="w-4 h-4" /> Add New Paper
      </button>
    </div>
  );
};

export default ManualInput;