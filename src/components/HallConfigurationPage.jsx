// components/HallConfigurationPage.js
import React, { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  Users,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const DEFAULT_STRENGTH = 30;

const HallConfigurationPage = ({ exam, updateExam, onBack, onContinue }) => {
  /* ===============================
     SPLIT PAPERS BY EXAM TYPE
  =============================== */
  const regPapers = exam.papers.filter(p => p.exam_type === "REG");
  const sdePapers = exam.papers.filter(p => p.exam_type === "SDE");

  const regStudents = regPapers.reduce(
    (sum, p) => sum + p.registerNumbers.length,
    0
  );

  const sdeStudents = sdePapers.reduce(
    (sum, p) => sum + p.registerNumbers.length,
    0
  );

  const hasSDE = sdeStudents > 0;

  /* ===============================
     STATE
  =============================== */
  const [activeType, setActiveType] = useState("REG");

  const [halls, setHalls] = useState({
    REG: exam.halls?.REG || [],
    SDE: exam.halls?.SDE || [],
  });

  const [capacityError, setCapacityError] = useState("");

  /* ===============================
     FORCE REG WHEN NO SDE
  =============================== */
  useEffect(() => {
    if (!hasSDE && activeType === "SDE") {
      setActiveType("REG");
    }
  }, [hasSDE, activeType]);

  /* ===============================
     DERIVED VALUES (PER TYPE)
  =============================== */
  const currentStudents =
    activeType === "REG" ? regStudents : sdeStudents;

  const currentHalls = halls[activeType];

  const suggestedHalls = Math.ceil(
    currentStudents / DEFAULT_STRENGTH
  );

  const totalCapacity = currentHalls.reduce(
    (sum, h) => sum + h.strength,
    0
  );

  /* ===============================
     AUTO INIT HALLS
  =============================== */
  useEffect(() => {
    if (currentStudents > 0 && currentHalls.length === 0) {
      setHalls(prev => ({
        ...prev,
        [activeType]: Array.from(
          { length: suggestedHalls },
          (_, i) => ({
            id: `${activeType}-${i + 1}`,
            name: "",
            strength: DEFAULT_STRENGTH,
            invigilator: "",
          })
        ),
      }));
    }
  }, [activeType, currentStudents, suggestedHalls]);

  /* ===============================
     CAPACITY VALIDATION
  =============================== */
  useEffect(() => {
    if (currentStudents === 0) {
      setCapacityError("");
      return;
    }

    if (totalCapacity < currentStudents) {
      setCapacityError(
        `Insufficient capacity! Need ${
          currentStudents - totalCapacity
        } more seats`
      );
    } else if (totalCapacity > currentStudents + DEFAULT_STRENGTH) {
      setCapacityError(
        `Excess capacity! ${
          totalCapacity - currentStudents
        } extra seats`
      );
    } else {
      setCapacityError("");
    }
  }, [totalCapacity, currentStudents]);

  /* ===============================
     ACTIONS
  =============================== */
  const addHall = () => {
    setHalls(prev => ({
      ...prev,
      [activeType]: [
        ...prev[activeType],
        {
          id: `${activeType}-${Date.now()}`,
          name: "",
          strength: DEFAULT_STRENGTH,
          invigilator: "",
        },
      ],
    }));
  };

  const removeHall = id => {
    setHalls(prev => ({
      ...prev,
      [activeType]: prev[activeType].filter(h => h.id !== id),
    }));
  };

  const updateHall = (id, field, value) => {
    setHalls(prev => ({
      ...prev,
      [activeType]: prev[activeType].map(h =>
        h.id === id
          ? {
              ...h,
              [field]:
                field === "strength" ? Number(value) || 0 : value,
            }
          : h
      ),
    }));
  };

  const autoSetup = () => {
    setHalls(prev => ({
      ...prev,
      [activeType]: Array.from(
        { length: suggestedHalls },
        (_, i) => ({
          id: `${activeType}-${i + 1}`,
          name: "",
          strength: DEFAULT_STRENGTH,
          invigilator: "",
        })
      ),
    }));
  };

  /* ===============================
     CONTINUE VALIDATION (GLOBAL)
  =============================== */
  const canContinue =
    // REG validation
    (regStudents === 0 ||
      (halls.REG.length > 0 &&
        halls.REG.every(h => h.name.trim() !== "") &&
        halls.REG.reduce(
          (s, h) => s + h.strength,
          0
        ) >= regStudents)) &&
    // SDE validation (only if exists)
    (!hasSDE ||
      (halls.SDE.length > 0 &&
        halls.SDE.every(h => h.name.trim() !== "") &&
        halls.SDE.reduce(
          (s, h) => s + h.strength,
          0
        ) >= sdeStudents));

  const handleContinue = () => {
    updateExam(exam.id, {
      halls: {
        REG: halls.REG,
        SDE: hasSDE ? halls.SDE : [],
      },
    });
    onContinue();
  };

  /* ===============================
     RENDER
  =============================== */
  return (
    <div>
      {/* TOP BAR */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-gray-200 p-3 rounded-lg text-sm">
          <strong>REG:</strong> {regStudents} students ·{" "}
          {halls.REG.length} halls
          <br />
          <strong>SDE:</strong> {sdeStudents} students ·{" "}
          {halls.SDE.length} halls
        </div>
      </div>

      {/* TYPE SWITCH */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveType("REG")}
          className={`px-4 py-2 rounded ${
            activeType === "REG"
              ? "bg-gray-800 text-white"
              : "bg-gray-200"
          }`}
        >
          REG
        </button>

        {hasSDE && (
          <button
            onClick={() => setActiveType("SDE")}
            className={`px-4 py-2 rounded ${
              activeType === "SDE"
                ? "bg-gray-800 text-white"
                : "bg-gray-200"
            }`}
          >
            SDE
          </button>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={autoSetup}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded"
        >
          <Users className="w-4 h-4" /> Auto Setup
        </button>

        <button
          onClick={addHall}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded"
        >
          <Plus className="w-4 h-4" /> Add Hall
        </button>
      </div>

      {/* HALL LIST */}
      <div className="space-y-3">
        {currentHalls.map((hall, index) => (
          <div
            key={hall.id}
            className="p-3 bg-white border rounded-lg"
          >
            <div className="mb-2 font-medium">
              Hall {index + 1} ({activeType})
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                placeholder="Hall Name"
                value={hall.name}
                onChange={e =>
                  updateHall(hall.id, "name", e.target.value)
                }
                className="border p-2 rounded flex-1"
              />

              <input
                placeholder="Invigilator"
                value={hall.invigilator}
                onChange={e =>
                  updateHall(
                    hall.id,
                    "invigilator",
                    e.target.value
                  )
                }
                className="border p-2 rounded flex-1"
              />

              <input
                type="number"
                min="1"
                value={hall.strength}
                onChange={e =>
                  updateHall(
                    hall.id,
                    "strength",
                    e.target.value
                  )
                }
                className="border p-2 rounded w-28"
              />

              <button
                onClick={() => removeHall(hall.id)}
                className="p-2 text-gray-700"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* VALIDATION MESSAGE */}
      <div className="mt-4">
        {capacityError && (
          <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded">
            <AlertCircle className="inline w-4 h-4 mr-2" />
            {capacityError}
          </div>
        )}

        {!capacityError && currentStudents > 0 && (
          <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded">
            <CheckCircle className="inline w-4 h-4 mr-2" />
            Capacity is sufficient
          </div>
        )}
      </div>

      {/* CONTINUE */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded disabled:opacity-50"
        >
          Continue to PDF <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default HallConfigurationPage;
