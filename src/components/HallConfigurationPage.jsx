// components/HallConfigurationPage.js
import React, { useState, useEffect } from "react";
import { Plus, Minus, Users, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

const HallConfigurationPage = ({ exam, updateExam, onBack, onContinue }) => {
  const [halls, setHalls] = useState(exam.halls || []);
  const [capacityError, setCapacityError] = useState("");
  const [editable, setEditable] = useState(exam.hallsEditable !== false);
  const totalStudents = exam.papers.reduce((sum, p) => sum + p.registerNumbers.length, 0);
  const suggestedHalls = Math.ceil(totalStudents / 30);
  const totalCapacity = halls.reduce((sum, hall) => sum + hall.strength, 0);
  

  // Initialize halls if empty
  useEffect(() => {
    if (totalStudents > 0 && halls.length === 0) {
      const newHalls = Array.from({ length: suggestedHalls }, (_, index) => ({
        id: index + 1,
        name: "",
        strength: 30,
        invigilator: ""
      }));
      setHalls(newHalls);
    }
  }, [totalStudents, suggestedHalls]);

  // Validate capacity
  useEffect(() => {
    if (totalStudents > 0) {
      if (totalCapacity < totalStudents) {
        setCapacityError(`Insufficient capacity! Need ${totalStudents - totalCapacity} more seats`);
      } else if (totalCapacity > totalStudents + 30) {
        setCapacityError(`Excess capacity! ${totalCapacity - totalStudents} extra seats`);
      } else {
        setCapacityError("");
      }
    }
  }, [totalCapacity, totalStudents]);

  const addHall = () => {
    const newId = halls.length > 0 ? Math.max(...halls.map(h => h.id)) + 1 : 1;
    setHalls([...halls, { id: newId, name: "", strength: 30, invigilator: "" }]);
  };

  const removeHall = (id) => {
    if (halls.length > 1) {
      setHalls(halls.filter(hall => hall.id !== id));
    }
  };

  const updateHall = (id, field, value) => {
    setHalls(halls.map(hall => 
      hall.id === id ? { ...hall, [field]: field === 'strength' ? parseInt(value) || 30 : value } : hall
    ));
  };

  const adjustHallsToSuggestion = () => {
    if (suggestedHalls > halls.length) {
      const newHalls = [...halls];
      for (let i = halls.length; i < suggestedHalls; i++) {
        newHalls.push({ id: Date.now() + i, name: "", strength: 30, invigilator: "" });
      }
      setHalls(newHalls);
    } else if (suggestedHalls < halls.length) {
      const newHalls = halls.slice(0, Math.max(suggestedHalls, 1));
      setHalls(newHalls);
    }
  };

  const handleContinue = () => {
    updateExam(exam.id, { halls: halls })
    onContinue();
  };

  const handleEditableToggle = () => {
    setEditable(!editable);
    updateExam(exam.id, { hallsEditable: !editable });
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        <div className="bg-gray-200 p-3 rounded-lg">
          <p className="text-sm text-gray-800">
            <strong>Total Students:</strong> {totalStudents}<br />
            <strong>Suggested:</strong> {suggestedHalls} halls needed (30 students each)
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4 flex-col sm:flex-row gap-4">
          <h2 className="text-xl font-bold text-gray-800">Hall Configuration</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={adjustHallsToSuggestion}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-[11px] sm:text-medium font-medium "
            >
              <Users className="w-4 h-4" /> Auto Setup
            </button>
            <button
              onClick={addHall}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-medium text-[11px] sm:text-medium "
            >
              <Plus className="w-4 h-4" /> Add Hall
            </button>
            <button
              onClick={handleEditableToggle}
              className={`flex items-center gap-2 px-3 py-2 text-[11px] sm:text-medium rounded-md font-medium  ${editable ? "bg-yellow-600 text-white hover:bg-yellow-700" : "bg-green-600 text-white hover:bg-green-700"}`}
            
            >
              {editable ? (<>
                <Minus className="w-4 h-4" /> Lock Edits
              </>) : (<>
                <Plus className="w-4 h-4" /> Unlock Edits
              </>)}
            </button>

          </div>

        </div>

       <div className="space-y-3 mb-4">
  {halls.map((hall, index) => (
    <div
      key={hall.id}
      className="p-3 bg-white border border-gray-300 rounded-lg"
    >
      {/* Top Label */}
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-700">
          Hall {index + 1}
        </span>
      </div>

      {/* Form Row (responsive) */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full">

        {/* Hall Name */}
        <div className="flex-1">
          <input
            disabled={!editable}
            required
            type="text"
            placeholder={`Hall name (e.g., G-${23 + index})`}
            value={hall.name}
            onChange={(e) => updateHall(hall.id, "name", e.target.value)}
            className="w-full border p-2 rounded text-sm disabled:bg-gray-100 border-gray-300"
          />
        </div>

        {/* Invigilator */}
        <div className="flex-1">
          <input
            disabled={!editable}
            type="text"
            placeholder="Invigilator Name"
            value={hall.invigilator}
            onChange={(e) =>
              updateHall(hall.id, "invigilator", e.target.value)
            }
            className="w-full border p-2 rounded text-sm disabled:bg-gray-100 border-gray-300"
          />
        </div>

        {/* Strength + Delete button */}
        <div className="flex items-center gap-2 sm:w-auto w-full">

          <div className="w-24">
            <input
              disabled={!editable}
              type="number"
              min="1"
              placeholder="Strength"
              value={hall.strength}
              onChange={(e) =>
                updateHall(hall.id, "strength", e.target.value)
              }
              className="w-full border p-2 rounded text-sm disabled:bg-gray-100 border-gray-300"
            />
          </div>

          <button
            onClick={() => removeHall(hall.id)}
            disabled={halls.length === 1}
            className="p-2 text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <Minus className="w-4 h-4" />
          </button>

        </div>

      </div>
    </div>
  ))}
</div>


        {/* Capacity Validation */}
        <div className="mb-4">
          {capacityError && (
            <div className={`p-3 rounded-lg ${
              capacityError.includes("Insufficient") 
                ? "bg-red-100 border border-red-300 text-red-800"
                : "bg-yellow-100 border border-yellow-300 text-yellow-800"
            }`}>
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {capacityError}
            </div>
          )}
          
          {!capacityError && totalCapacity >= totalStudents && totalStudents > 0 && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg">
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Capacity is sufficient! Ready to continue.
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-300 flex-wrap gap-4">
          <div>
            <p className="text-gray-700">
              <strong>Current Capacity:</strong> {totalCapacity} seats across {halls.length} halls
            </p>
          </div>
          
          <button
            onClick={handleContinue}
            disabled={totalCapacity < totalStudents || halls.length === 0 || totalStudents === 0 || halls.some(hall => hall.name.trim() === "")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold 
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
              totalCapacity >= totalStudents && halls.length > 0
                ? "bg-gray-800 text-white hover:bg-gray-900"
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
            }`}
          >
            Continue to PDF Generation <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HallConfigurationPage;