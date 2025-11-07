import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Upload, FileText, Edit, Trash2, CheckCircle, AlertCircle, PlusCircle, Download, Plus, Minus, Users, Chair, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const App = () => {
  const [mode, setMode] = useState("upload");
  const [files, setFiles] = useState([]);
  const [papers, setPapers] = useState([{ course: "", dateTime: "", registerNumbers: [] }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Calculate total students and suggested halls
  const totalStudents = papers.reduce(
    (sum, p) => sum + p.registerNumbers.length,
    0
  );
  const suggestedHalls = Math.ceil(totalStudents / 30);

  // Initialize halls based on suggested count (empty names)
  const [halls, setHalls] = useState([]);
  const [capacityError, setCapacityError] = useState("");
  const [warnNoHalls, setWarnNoHalls] = useState(false);
  const [distributionPreview, setDistributionPreview] = useState([]);
  const [seatArrangementData, setSeatArrangementData] = useState([]);

  // Initialize halls when totalStudents changes
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

  // Calculate total capacity
  const totalCapacity = halls.reduce((sum, hall) => sum + hall.strength, 0);

  // Validate capacity whenever halls or students change
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

  // ----------------- FIXED: Maintain Original Order Distribution Logic -------------------
  const distributeStudentsFlexible = (subjects, hallList) => {
    const distributionRows = [];
    const hallUsage = hallList.map(hall => ({
      hall: hall,
      remaining: hall.strength,
      papers: {},
      students: [], // Store actual student data for seat arrangement
      paperDistribution: {} // Store paper distribution per hall
    }));
    
    let slCounter = 1;

    // Create a pool of students for each subject with actual register numbers IN ORIGINAL ORDER
    const studentPools = subjects.map((subject, subjectIndex) => ({
      subjectName: subject.subjectName,
      students: subject.registerNumbers.map((regNo, i) => ({
        id: `${subject.subjectName}-${i + 1}`,
        subject: subject.subjectName,
        registerNumber: regNo,
        originalIndex: i,
        rnbb: `RNBB${i + 1}` // Maintain original RNBB order
      })),
      distributed: 0,
      total: subject.registerNumbers.length
    }));

    let hallIndex = 0;

    // Continue until all students are distributed or no halls left
    while (studentPools.some(pool => pool.students.length > 0) && hallIndex < hallUsage.length) {
      const currentHall = hallUsage[hallIndex];
      
      if (currentHall.remaining <= 0) {
        hallIndex++;
        continue;
      }

      // Get all papers that have students remaining
      const availablePapers = studentPools.filter(pool => pool.students.length > 0);

      if (availablePapers.length === 0) {
        hallIndex++;
        continue;
      }

      // Strategy: Distribute in original order, but mix papers
      
      // CASE 1: If only one paper available, fill as much as possible
      if (availablePapers.length === 1) {
        const singlePaper = availablePapers[0];
        const maxToTake = Math.min(
          singlePaper.students.length,
          currentHall.remaining
        );

        if (maxToTake > 0) {
          const studentsToTake = singlePaper.students.splice(0, maxToTake);
          
          // Check if we already have this paper in distribution for this hall
          const existingRowIndex = distributionRows.findIndex(
            row => row.subjectName === singlePaper.subjectName && row.room === currentHall.hall.name
          );

          if (existingRowIndex !== -1) {
            // Combine with existing row
            distributionRows[existingRowIndex].count += studentsToTake.length;
            distributionRows[existingRowIndex].students.push(...studentsToTake);
          } else {
            // Create new row
            distributionRows.push({
              sl: slCounter++,
              subjectName: singlePaper.subjectName,
              count: studentsToTake.length,
              room: currentHall.hall.name || `HALL-${hallIndex + 1}`,
              students: studentsToTake
            });
          }

          // Store students for seat arrangement
          currentHall.students.push(...studentsToTake);
          currentHall.papers[singlePaper.subjectName] = 
            (currentHall.papers[singlePaper.subjectName] || 0) + studentsToTake.length;
          currentHall.remaining -= studentsToTake.length;
          singlePaper.distributed += studentsToTake.length;

          // Store paper distribution
          if (!currentHall.paperDistribution[singlePaper.subjectName]) {
            currentHall.paperDistribution[singlePaper.subjectName] = [];
          }
          currentHall.paperDistribution[singlePaper.subjectName].push(...studentsToTake);
        }
      }
      // CASE 2: Multiple papers available - distribute in round-robin fashion
      else {
        let distributedInThisRound = false;

        // Distribute one student from each paper in round-robin fashion
        for (const paper of availablePapers) {
          if (currentHall.remaining <= 0) break;
          if (paper.students.length === 0) continue;

          // Take one student from this paper
          const studentToTake = paper.students.splice(0, 1)[0];
          
          // Check if we already have this paper in distribution for this hall
          const existingRowIndex = distributionRows.findIndex(
            row => row.subjectName === paper.subjectName && row.room === currentHall.hall.name
          );

          if (existingRowIndex !== -1) {
            // Combine with existing row
            distributionRows[existingRowIndex].count += 1;
            distributionRows[existingRowIndex].students.push(studentToTake);
          } else {
            // Create new row
            distributionRows.push({
              sl: slCounter++,
              subjectName: paper.subjectName,
              count: 1,
              room: currentHall.hall.name || `HALL-${hallIndex + 1}`,
              students: [studentToTake]
            });
          }

          // Store student for seat arrangement
          currentHall.students.push(studentToTake);
          currentHall.papers[paper.subjectName] = 
            (currentHall.papers[paper.subjectName] || 0) + 1;
          currentHall.remaining -= 1;
          paper.distributed += 1;
          distributedInThisRound = true;

          // Store paper distribution
          if (!currentHall.paperDistribution[paper.subjectName]) {
            currentHall.paperDistribution[paper.subjectName] = [];
          }
          currentHall.paperDistribution[paper.subjectName].push(studentToTake);
        }

        // If we couldn't distribute any students in this round, move to next hall
        if (!distributedInThisRound) {
          hallIndex++;
        }
      }

      // If current hall is full, move to next hall
      if (currentHall.remaining <= 0) {
        hallIndex++;
      }
    }

    // Handle any remaining students that couldn't be distributed
    studentPools.forEach(pool => {
      if (pool.students.length > 0) {
        distributionRows.push({
          sl: slCounter++,
          subjectName: pool.subjectName,
          count: pool.students.length,
          room: "UNASSIGNED - NO HALLS LEFT",
          students: pool.students,
          _warning: true
        });
      }
    });

    // Sort students within each hall by register number to maintain order
    hallUsage.forEach(usage => {
      usage.students.sort((a, b) => {
        // Extract prefix and numeric parts for proper sorting
        const prefixA = a.registerNumber.replace(/\d+$/, '');
        const prefixB = b.registerNumber.replace(/\d+$/, '');
        const numA = parseInt(a.registerNumber.replace(prefixA, '')) || 0;
        const numB = parseInt(b.registerNumber.replace(prefixB, '')) || 0;
        
        // First sort by prefix, then by number
        if (prefixA !== prefixB) {
          return prefixA.localeCompare(prefixB);
        }
        return numA - numB;
      });
      
      // Also sort within each paper distribution
      Object.values(usage.paperDistribution).forEach(students => {
        students.sort((a, b) => {
          const prefixA = a.registerNumber.replace(/\d+$/, '');
          const prefixB = b.registerNumber.replace(/\d+$/, '');
          const numA = parseInt(a.registerNumber.replace(prefixA, '')) || 0;
          const numB = parseInt(b.registerNumber.replace(prefixB, '')) || 0;
          
          if (prefixA !== prefixB) {
            return prefixA.localeCompare(prefixB);
          }
          return numA - numB;
        });
      });
    });

    // Create preview data for UI
    const previewData = hallUsage.map((usage, index) => ({
      hall: usage.hall.name || `HALL-${index + 1}`,
      invigilator: usage.hall.invigilator || "",
      papers: Object.entries(usage.papers).map(([paper, count]) => ({
        paper,
        count,
        percentage: Math.round((count / usage.hall.strength) * 100)
      })),
      paperDistribution: usage.paperDistribution,
      remaining: usage.remaining,
      utilization: Math.round(((usage.hall.strength - usage.remaining) / usage.hall.strength) * 100),
      paperCount: Object.keys(usage.papers).length,
      students: usage.students
    }));

    // Prepare seat arrangement data
    const seatData = hallUsage.map((usage, index) => ({
      sl: index + 1,
      room: usage.hall.name || `HALL-${index + 1}`,
      students: usage.students,
      totalStudents: usage.hall.strength - usage.remaining
    })).filter(hall => hall.totalStudents > 0);

    const ranOut = distributionRows.some((r) => r._warning);
    return { 
      distributionRows, 
      ranOut, 
      hallUsage: hallUsage.map(h => h.remaining),
      previewData,
      seatArrangementData: seatData
    };
  };

  // ----------------- FIXED: Format Register Numbers for Display -------------------
  const formatRegisterNumbers = (students) => {
    if (students.length === 0) return "";
    
    // Group by prefix
    const groups = {};
    students.forEach(student => {
      const regNo = student.registerNumber;
      // Extract prefix (alphabetic part) and number
      const prefix = regNo.replace(/\d+$/, '');
      const number = parseInt(regNo.replace(prefix, '')) || 0;
      
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(number);
    });
    
    // Create formatted strings for each group
    const formattedGroups = [];
    
    Object.entries(groups).forEach(([prefix, numbers]) => {
      if (numbers.length === 0) return;
      
      // Sort numbers
      numbers.sort((a, b) => a - b);
      
      // Find consecutive ranges
      const ranges = [];
      let start = numbers[0];
      let end = numbers[0];
      
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === end + 1) {
          end = numbers[i];
        } else {
          if (start === end) {
            ranges.push(`${prefix}${start.toString().padStart(3, '0')}`);
          } else {
            ranges.push(`${prefix}${start.toString().padStart(3, '0')} to ${end.toString().padStart(3, '0')}`);
          }
          start = numbers[i];
          end = numbers[i];
        }
      }
      
      // Add the last range
      if (start === end) {
        ranges.push(`${prefix}${start.toString().padStart(3, '0')}`);
      } else {
        ranges.push(`${prefix}${start.toString().padStart(3, '0')} to ${end.toString().padStart(3, '0')}`);
      }
      
      formattedGroups.push(ranges.join(', '));
    });
    
    return formattedGroups.join(', ');
  };

  // ----------------- NEW: Format Register Numbers List for Display -------------------
  const formatRegisterNumbersList = (students) => {
    if (students.length === 0) return "";
    
    // Group by prefix
    const groups = {};
    students.forEach(student => {
      const regNo = student.registerNumber;
      // Extract prefix (alphabetic part) and number
      const prefix = regNo.replace(/\d+$/, '');
      const number = parseInt(regNo.replace(prefix, '')) || 0;
      
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(number);
    });
    
    // Create formatted list for each group
    const formattedGroups = [];
    
    Object.entries(groups).forEach(([prefix, numbers]) => {
      if (numbers.length === 0) return;
      
      // Sort numbers
      numbers.sort((a, b) => a - b);
      
      // Format as list with only numbers after first one
      const formattedList = [];
      formattedList.push(`${prefix}${numbers[0].toString().padStart(3, '0')}`);
      
      for (let i = 1; i < numbers.length; i++) {
        formattedList.push(numbers[i].toString().padStart(3, '0'));
      }
      
      formattedGroups.push(formattedList.join(', '));
    });
    
    return formattedGroups.join(', ');
  };

  // Preview distribution
  const previewDistribution = () => {
    const validHalls = halls.map((hall, index) => ({
      ...hall,
      name: hall.name.trim() || `HALL-${index + 1}`
    })).filter(hall => hall.strength > 0);

    if (validHalls.length === 0) return;

    const subjects = papers.map((p) => ({
      subjectName: p.course || `Paper-${papers.indexOf(p) + 1}`,
      count: p.registerNumbers.length,
      registerNumbers: p.registerNumbers
    }));

    const { previewData, seatArrangementData } = distributeStudentsFlexible(subjects, validHalls);
    setDistributionPreview(previewData);
    setSeatArrangementData(seatArrangementData);
  };

  // ----------------- File Handling -------------------
  const onDrop = useCallback((acceptedFiles) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
      })),
    ]);
  }, []);

  const removeFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  // ----------------- Extraction -------------------
  const extractDataFromText = (text) => {
    const coursePatterns = [
      /(?:Course|Subject|Paper)?\s*[:]*\s*([A-Z0-9()-]+\s*-\s*[^[]+)/i,
      /^([A-Z]{2,}[0-9A-Z()-]+\s*-\s*.+)$/im,
    ];

    let extractedCourse = "";
    for (const pattern of coursePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedCourse = match[1].trim();
        break;
      }
    }

    const dateMatch = text.match(
      /Date\s+of\s+Examination\s*[:]*\s*([\d./-]+\s+[0-9:APM\s]+)/i
    );
    let extractedDate = dateMatch ? dateMatch[1].trim() : "";

    if (extractedDate) {
      extractedDate = extractedDate
        .replace(/\bPM\b/gi, "AN")
        .replace(/\bAM\b/gi, "FN");
    }

    const regMatches = [
      ...text.matchAll(/\b([A-Z]{2,}[A-Z0-9]*[0-9]{2,})\b/g),
    ].map((m) => m[1]);

    let validRegs = [...new Set(regMatches)].filter((r) =>
      /^[A-Z]+[A-Z0-9]*\d+$/.test(r)
    );

    // Sort register numbers to maintain order - by prefix then number
    validRegs.sort((a, b) => {
      const prefixA = a.replace(/\d+$/, '');
      const prefixB = b.replace(/\d+$/, '');
      const numA = parseInt(a.replace(prefixA, '')) || 0;
      const numB = parseInt(b.replace(prefixB, '')) || 0;
      
      if (prefixA !== prefixB) {
        return prefixA.localeCompare(prefixB);
      }
      return numA - numB;
    });

    if (extractedCourse) {
      const courseCodeRaw = extractedCourse.split(" - ")[0].trim();
      const courseCode = courseCodeRaw.replace(/[()]/g, "").toUpperCase();

      validRegs = validRegs.filter((r) => {
        const clean = r.replace(/[()]/g, "").toUpperCase();
        return (
          clean !== courseCode &&
          !clean.startsWith(courseCode) &&
          !courseCode.startsWith(clean)
        );
      });
    }

    return {
      course: extractedCourse,
      dateTime: extractedDate,
      registerNumbers: validRegs,
    };
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const results = [];
      for (const f of files) {
        const arrayBuffer = await f.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        const data = extractDataFromText(fullText);
        results.push(data);
      }

      setPapers(results);
      setSuccess(true);
    } catch (err) {
      setError("Extraction failed. Please use Manual mode.");
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  // ----------------- Manual Mode -------------------
  const addManualPaper = () => {
    setPapers([...papers, { course: "", dateTime: "", registerNumbers: [] }]);
  };

  const updatePaper = (index, key, value) => {
    const updated = [...papers];
    if (key === "registerNumbers") {
      const lines = value
        .split("\n")
        .map((l) => l.trim())
        .filter((r) => /^[A-Z]+[A-Z0-9]*\d+$/.test(r));
      
      // Sort register numbers when updating - by prefix then number
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
    setPapers(updated);
  };

  // ----------------- Hall Management -------------------
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

  // Build subjects array from papers
  const buildSubjectsFromPapers = () =>
    papers.map((p) => ({
      subjectName: p.course || `Paper-${papers.indexOf(p) + 1}`,
      count: p.registerNumbers.length,
      registerNumbers: p.registerNumbers
    }));

  // ----------------- Enhanced PDF Generation -------------------
  const generatePDF = () => {
    setWarnNoHalls(false);
    setCapacityError("");
    
    if (totalCapacity < totalStudents) {
      setCapacityError(`Cannot generate PDF: Insufficient capacity! Need ${totalStudents - totalCapacity} more seats`);
      return;
    }

    const validHalls = halls.map((hall, index) => ({
      ...hall,
      name: hall.name.trim() || `HALL-${index + 1}`
    })).filter(hall => hall.strength > 0);
    
    if (validHalls.length === 0) {
      setWarnNoHalls(true);
      setCapacityError("Please add at least one hall with positive strength");
      return;
    }

    const subjects = buildSubjectsFromPapers();
    const { distributionRows, ranOut, previewData, seatArrangementData } = distributeStudentsFlexible(subjects, validHalls);

    if (ranOut) {
      setWarnNoHalls(true);
    }

    // Create PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    let currentY = 40;

    // Header - Centered
    doc.setFontSize(16);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text("EXAM SUMMARY - TO: EXAM CHIEF", pageWidth / 2, currentY, { align: "center" });
    currentY += 25;

    doc.setFontSize(12);
    const examDate = papers[0]?.dateTime || "04-11-2025 FN";
    doc.text(`Date of Exam : ${examDate}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 30;

    // Summary Table
    autoTable(doc, {
      startY: currentY,
      head: [["", "Count"]],
      body: [
        ["Total Number of Students :", totalStudents],
        ["Total Number of Halls :", validHalls.length],
      ],
      styles: { 
        fontSize: 10,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      margin: { left: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // INVIGILATION AND ROOM DETAILS
    doc.setFontSize(14);
    doc.text("INVIGILATION AND ROOM DETAILS", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    const invigilationData = validHalls.map((hall, index) => [
      index + 1,
      hall.invigilator || "",
      hall.name,
      hall.strength
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["HALL", "NAME OF INVIGILATOR", "ROOM", "STRENGTH"]],
      body: invigilationData,
      styles: { 
        fontSize: 9,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      margin: { left: 40, right: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // QUESTION PAPERS TO BE PRINTED
    doc.setFontSize(14);
    doc.text("QUESTION PAPERS TO BE PRINTED", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    const papersData = subjects.map((subject, index) => [
      index + 1,
      subject.subjectName,
      subject.count
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["SL", "SUBJECT NAME", "COUNT"]],
      body: papersData,
      styles: { 
        fontSize: 9,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      margin: { left: 40, right: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // QUESTION PAPER DISTRIBUTION TABLE
    doc.setFontSize(14);
    doc.text("QUESTION PAPER DISTRIBUTION TABLE", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    const distributionData = distributionRows.map(row => [
      row.sl,
      row.subjectName,
      row.count,
      row.room
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["SL", "SUBJECT NAME", "COUNT", "ROOM"]],
      body: distributionData,
      styles: { 
        fontSize: 9,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        const page = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.text(`Page ${page} of ${pageCount}`, doc.internal.pageSize.getWidth() - 80, doc.internal.pageSize.getHeight() - 20);
      },
    });

    doc.save("exam-summary-distribution.pdf");
  };

  // ----------------- FIXED: Question Paper Distribution PDF (Invigilator Format) -------------------
  const generateQuestionPaperDistributionPDF = () => {
    if (distributionPreview.length === 0) {
      alert("Please generate distribution first using the Preview button");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const examDate = papers[0]?.dateTime || "04-11-2025 FN";
    const pageWidth = doc.internal.pageSize.getWidth();

    // Generate one page per hall
    distributionPreview.forEach((hallData, hallIndex) => {
      if (hallIndex > 0) {
        doc.addPage();
      }

      let currentY = 40;

      // Header
      doc.setFontSize(16);
      doc.text("EXAM DETAILS - TO: INVIGILATOR", pageWidth / 2, currentY, { align: "center" });
      currentY += 25;

      // Single table for invigilator and room details
      const invigilatorData = [
        ["Name of Invigilator", hallData.invigilator || ""],
        ["Room Assigned", hallData.hall],
        ["Hall No:", hallIndex + 1],
        ["No of Students", hallData.students.length],
        ["Exam Date", examDate]
      ];

      autoTable(doc, {
        startY: currentY,
        body: invigilatorData,
        styles: { 
          fontSize: 10,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 4,
          minCellHeight: 8
        },
        margin: { left: 40, right: 40 },
        tableWidth: pageWidth - 80,
      });

      currentY = doc.lastAutoTable.finalY + 20;

      // SUBJECTS AND QUESTION PAPER COUNT
      doc.setFontSize(14);
      doc.text("SUBJECTS AND QUESTION PAPER COUNT", pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      const paperCountData = Object.entries(hallData.paperDistribution || {}).map(([paper, students], index) => [
        index + 1,
        paper,
        students.length
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [["SL", "NAME OF SUBJECT", "COUNT"]],
        body: paperCountData,
        styles: { 
          fontSize: 9,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 3,
          minCellHeight: 8
        },
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [0, 0, 0],
          lineWidth: 0.5
        },
        margin: { left: 40, right: 40 },
      });

      currentY = doc.lastAutoTable.finalY + 20;

      // STUDENTS LIST
      doc.setFontSize(14);
      doc.text("STUDENTS LIST", pageWidth / 2, currentY, { align: "center" });
      currentY += 20;

      // Prepare student data for all papers in this hall WITH PROPER FORMATTING
      const allStudents = [];
      let globalRnbbCounter = 1;
      
      Object.entries(hallData.paperDistribution || {}).forEach(([paper, students]) => {
        // Sort students by register number to maintain order - by prefix then number
        const sortedStudents = [...students].sort((a, b) => {
          const prefixA = a.registerNumber.replace(/\d+$/, '');
          const prefixB = b.registerNumber.replace(/\d+$/, '');
          const numA = parseInt(a.registerNumber.replace(prefixA, '')) || 0;
          const numB = parseInt(b.registerNumber.replace(prefixB, '')) || 0;
          
          if (prefixA !== prefixB) {
            return prefixA.localeCompare(prefixB);
          }
          return numA - numB;
        });

        sortedStudents.forEach((student, studentIndex) => {
          allStudents.push([
            `RNBB${globalRnbbCounter}`,
            student.registerNumber,
            studentIndex === 0 ? paper : '"', // Use " for repeated subjects
            ""
          ]);
          globalRnbbCounter++;
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [["RNBB", "REG NO", "SUBJECT NAME", "REMARKS"]],
        body: allStudents,
        styles: { 
          fontSize: 7,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 2,
          minCellHeight: 6
        },
        headStyles: { 
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [0, 0, 0],
          lineWidth: 0.5
        },
        margin: { left: 40, right: 40 },
        columnStyles: {
          0: { cellWidth: 50 }, // RNBB
          1: { cellWidth: 90 }, // REG NO
          2: { cellWidth: 230 }, // SUBJECT NAME
          3: { cellWidth: 60 }  // REMARKS
        },
      });

      currentY = doc.lastAutoTable.finalY + 30;

      // Signature
      doc.setFontSize(10);
      doc.text("Signature", 40, currentY);

      // Page number
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${hallIndex + 1} of ${distributionPreview.length}`, pageWidth - 80, doc.internal.pageSize.getHeight() - 20);
    });

    doc.save("question-paper-distribution-invigilator.pdf");
  };

  // ----------------- FIXED: Seat Arrangement PDF Generation -------------------
  const generateSeatArrangementPDF = () => {
    if (seatArrangementData.length === 0) {
      alert("Please generate distribution first using the Preview button");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    let currentY = 40;

    // Header - Centered
    doc.setFontSize(16);
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text("SEAT ARRANGEMENT - UNIVERSITY EXAMINATION", pageWidth / 2, currentY, { align: "center" });
    currentY += 25;

    doc.setFontSize(12);
    const examDate = papers[0]?.dateTime || "04-11-2025 FN";
    doc.text(`Date of Examination: ${examDate}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 30;

    // Seat Arrangement Table with formatted register numbers
    const seatData = seatArrangementData.map(hall => {
      const rangeDisplay = formatRegisterNumbers(hall.students);
      const regList = formatRegisterNumbersList(hall.students);
      
      return [
        hall.sl,
        hall.room,
        rangeDisplay,
        regList
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["SL", "ROOM", "REG NO-RANGE", "REG NOS"]],
      body: seatData,
      styles: { 
        fontSize: 8,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      columnStyles: {
        0: { cellWidth: 30 }, // SL
        1: { cellWidth: 60 }, // ROOM
        2: { cellWidth: 150 }, // REG NO-RANGE
        3: { cellWidth: 250 }, // REG NOS
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        const page = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.text(`Page ${page} of ${pageCount}`, pageWidth - 80, doc.internal.pageSize.getHeight() - 20);
      },
    });

    doc.save("seat-arrangement.pdf");
  };

  // Check if generate button should be disabled
  const isGenerateDisabled = totalCapacity < totalStudents || halls.length === 0 || totalStudents === 0;

  // ----------------- UI -------------------
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

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setMode("upload");
                setError("");
                setSuccess(false);
              }}
              className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
                mode === "upload"
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Upload className="w-4 h-4" /> Upload PDFs
            </button>
            <button
              onClick={() => {
                setMode("manual");
                setError("");
                setSuccess(false);
              }}
              className={`px-6 py-2.5 rounded-md font-medium transition-all flex items-center gap-2 ${
                mode === "manual"
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-transparent text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Edit className="w-4 h-4" /> Manual Input
            </button>
          </div>

          {/* Upload Mode */}
          {mode === "upload" && (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed p-12 text-center rounded-xl cursor-pointer transition-all ${
                  isDragActive
                    ? "border-gray-500 bg-gray-100 scale-105"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-700 font-medium">
                  {isDragActive
                    ? "Drop PDF files here"
                    : "Drag & drop or click to upload multiple PDFs"}
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-2">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className="flex justify-between items-center bg-gray-100 p-3 rounded-lg"
                    >
                      <span className="text-gray-800 font-medium">
                        {f.name}
                      </span>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-6 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold"
                >
                  {loading ? "Extracting..." : "Submit & Extract"}
                </button>
              )}

              {success && (
                <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-gray-700" />
                  <p className="text-gray-800 font-medium">
                    Extraction successful for {papers.length} file(s)!
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-700" />
                  <p className="text-gray-800">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {mode === "manual" && (
            <div className="space-y-6">
              {papers.map((paper, index) => (
                <div
                  key={index}
                  className="border border-gray-300 p-5 rounded-lg bg-gray-50"
                >
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
          )}

          {/* Enhanced Hall Configuration with Individual Inputs */}
          {totalStudents > 0 && (
            <div className="mt-8 bg-gray-50 border border-gray-300 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">Hall Configuration</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-200 p-3 rounded-lg">
                    <p className="text-sm text-gray-800">
                      <strong>Total Students:</strong> {totalStudents}<br />
                      <strong>Suggested:</strong> {suggestedHalls} halls needed (30 students each)<br />
                      <strong>Current Capacity:</strong> {totalCapacity} seats
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={adjustHallsToSuggestion}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                    >
                      <Plus className="w-4 h-4" /> Auto Setup
                    </button>
                    <button
                      onClick={addHall}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add Hall
                    </button>
                    <button
                      onClick={previewDistribution}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      <Users className="w-4 h-4" /> Preview
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {halls.map((hall, index) => (
                  <div key={hall.id} className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg">
                    <div className="flex items-center gap-2 w-16">
                      <span className="text-sm font-medium text-gray-700">Hall {index + 1}</span>
                    </div>
                    
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder={`Hall name (e.g., G-${23 + index})`}
                        value={hall.name}
                        onChange={(e) => updateHall(hall.id, 'name', e.target.value)}
                        className="w-full border p-2 rounded text-sm"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Invigilator Name"
                        value={hall.invigilator}
                        onChange={(e) => updateHall(hall.id, 'invigilator', e.target.value)}
                        className="w-full border p-2 rounded text-sm"
                      />
                    </div>
                    
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="Strength"
                        value={hall.strength}
                        onChange={(e) => updateHall(hall.id, 'strength', e.target.value)}
                        className="w-full border p-2 rounded text-sm"
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
                ))}
              </div>

              {/* Distribution Preview */}
              {distributionPreview.length > 0 && (
                <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg">
                  <h3 className="font-bold text-gray-800 mb-3">Distribution Preview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {distributionPreview.map((hall, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="font-semibold text-gray-700 mb-2">{hall.hall}</h4>
                        <p className="text-sm text-gray-600 mb-2">Invigilator: {hall.invigilator || "Not assigned"}</p>
                        <div className="space-y-1">
                          {hall.papers.map((paper, paperIndex) => (
                            <div key={paperIndex} className="flex justify-between text-sm">
                              <span className="text-gray-600">{paper.paper}</span>
                              <span className="font-medium">{paper.count} students</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between text-sm">
                            <span>Utilization:</span>
                            <span className={`font-bold ${
                              hall.utilization >= 90 ? 'text-green-600' : 
                              hall.utilization >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {hall.utilization}%
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Remaining:</span>
                            <span className="font-medium">{hall.remaining} seats</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capacity Validation Messages */}
              <div className="mb-4">
                {capacityError && (
                  <div className={`p-3 rounded-lg ${
                    capacityError.includes("Insufficient") || capacityError.includes("Cannot generate") 
                      ? "bg-red-100 border border-red-300 text-red-800"
                      : "bg-yellow-100 border border-yellow-300 text-yellow-800"
                  }`}>
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {capacityError}
                  </div>
                )}
                {warnNoHalls && (
                  <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    Please add at least one hall with positive strength
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  {!capacityError && totalCapacity >= totalStudents && totalStudents > 0 && (
                    <div className="p-3 bg-green-100 border border-green-300 text-green-800 rounded-lg">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Capacity is sufficient! Ready to generate PDFs.
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={generateQuestionPaperDistributionPDF}
                    disabled={distributionPreview.length === 0}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium ${
                      distributionPreview.length === 0
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" /> Question Paper Distribution
                  </button>
                  
                  <button
                    onClick={generateSeatArrangementPDF}
                    disabled={seatArrangementData.length === 0}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium ${
                      seatArrangementData.length === 0
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <Chair className="w-4 h-4" /> Seat Arrangement PDF
                  </button>
                  
                  <button
                    onClick={generatePDF}
                    disabled={isGenerateDisabled}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-md font-medium ${
                      isGenerateDisabled
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-gray-800 text-white hover:bg-gray-900"
                    }`}
                  >
                    <Download className="w-4 h-4" /> Exam Summary PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Final Summary */}
          {papers.length > 0 && (success || mode === "manual") && (
            <div className="mt-8 bg-gray-50 border border-gray-300 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-3 text-gray-800">
                Summary ({papers.length} Papers)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-800">
                    Total Students: <span className="font-bold">{totalStudents}</span>
                  </p>
                  <p className="text-gray-800">
                    Configured Halls: <span className="font-bold">{halls.filter(h => h.name.trim() !== "").length}</span>
                  </p>
                  <p className="text-gray-800">
                    Total Capacity: <span className="font-bold">{totalCapacity}</span>
                  </p>
                </div>
                <div className="bg-gray-200 p-3 rounded-lg">
                  <p className="text-sm text-gray-800">
                    <strong>Smart Distribution:</strong> Students maintain original register number order. Same papers in same hall are combined automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;