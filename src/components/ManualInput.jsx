"use client";
import React, { useEffect } from "react";
import { PlusCircle, Copy, SortAsc, Upload } from "lucide-react";

const ManualInput = ({ papers, onPapersUpdate, selectedDate, session }) => {
  const addManualPaper = () => {
    onPapersUpdate([
      ...papers,
      { course: "", dateTime: `${selectedDate ? selectedDate.split("-").reverse().join("-") : ""} ${session}`, rawInput: "", registerNumbers: [] },
    ]);
  };

  // ✅ Validate papers when selectedDate or session changes — no state mutation
  useEffect(() => {
    papers.forEach((paper) => {
      if (!paper.dateTime) return;

      const extractedSession = paper.dateTime.toUpperCase().includes("AN")
        ? "AN"
        : "FN";

      // Session validation
      if (session && extractedSession !== session) {
        console.warn(
          `⚠ Session mismatch in Paper "${
            paper.course || "(Unnamed)"
          }": expected ${session}, got ${extractedSession}`
        );
      }

      // Date validation (compare flexible formats like YYYY-MM-DD and DD-MM-YYYY)
      if (selectedDate) {
        const formatted = selectedDate.split("-").reverse().join("-");
        const normalizedDateTime = paper.dateTime.replace(/[^\d-]/g, "");
        if (
          !paper.dateTime.includes(formatted) &&
          !normalizedDateTime.includes(selectedDate.replace(/-/g, ""))
        ) {
          console.warn(
            `⚠ Date mismatch in Paper "${
              paper.course || "(Unnamed)"
            }": expected ${selectedDate}`
          );
        }
      }
    });
  }, [selectedDate, session, papers]);

  const updatePaper = (index, key, value) => {
    const updated = [...papers];
    updated[index][key] = value;
    onPapersUpdate(updated);
  };

  const extractRegisterNumbers = (index) => {
    const updated = [...papers];
    let text = updated[index].rawInput || "";

    text = text.replace(/\r/g, "").replace(/\s+/g, " ").trim();
    text = text.replace(/(\d)(?=[A-Z])/g, "$1 ");
    text = text.replace(/([a-z])(?=[A-Z]{2,})/g, "$1 ");

    const matches = text.match(/[A-Z]{2,}[A-Z0-9]*\d{2,}/g) || [];
    const seen = new Set();
    const cleaned = [];
    for (const raw of matches) {
      const reg = raw.trim();
      if (!seen.has(reg)) {
        seen.add(reg);
        cleaned.push(reg);
      }
    }

    updated[index].registerNumbers = cleaned;
    onPapersUpdate(updated);
  };

  const sortRegisterNumbers = (index) => {
    const updated = [...papers];
    const lines = [...updated[index].registerNumbers];
    lines.sort((a, b) => {
      const prefixA = a.replace(/\d+$/, "");
      const prefixB = b.replace(/\d+$/, "");
      const numA = parseInt(a.replace(prefixA, "")) || 0;
      const numB = parseInt(b.replace(prefixB, "")) || 0;
      if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
      return numA - numB;
    });
    updated[index].registerNumbers = lines;
    onPapersUpdate(updated);
  };

  const copyRegisterNumbers = (index) => {
    const content = papers[index].registerNumbers.join("\n");
    navigator.clipboard.writeText(content);
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
            onChange={(e) => updatePaper(index, "course", e.target.value)}
            className="w-full border p-2 rounded mb-3"
          />

          <input
            type="text"
            value={`${
              selectedDate ? selectedDate.split("-").reverse().join("-") : ""
            } ${session}`}
            readOnly
            className="w-full border p-2 rounded mb-3 bg-gray-100 text-gray-700 font-medium cursor-not-allowed"
          />

          <textarea
            rows="6"
            placeholder="Paste register numbers (any format — table or inline)"
            value={paper.rawInput || ""}
            onChange={(e) => updatePaper(index, "rawInput", e.target.value)}
            className="w-full border p-2 rounded font-mono text-sm bg-white min-h-[100px] max-h-80"
          />

          <div className="flex flex-wrap items-center justify-between mt-2 gap-2">
            <p className="text-sm text-gray-700 font-medium">
              Total: {paper.registerNumbers.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => extractRegisterNumbers(index)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300 text-sm"
              >
                <Upload size={14} /> Extract
              </button>
              <button
                onClick={() => sortRegisterNumbers(index)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                <SortAsc size={14} /> Sort
              </button>
              <button
                onClick={() => copyRegisterNumbers(index)}
                className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                <Copy size={14} /> Copy
              </button>
            </div>
          </div>

          {paper.registerNumbers.length > 0 && (
            <textarea
              readOnly
              rows="4"
              className="w-full mt-3 border p-2 rounded font-mono text-sm bg-white min-h-[100px] max-h-80"
              value={paper.registerNumbers.join("\n")}
            />
          )}
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
