// components/PDFGenerator.js
import React, { useEffect, useState } from "react";
import {
  Download,
  ClipboardList,
  Armchair as Chair,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PDFGenerator = ({ examData }) => {
  const { papers, halls } = examData;

  useEffect(() => {
    console.log("Papers:", papers);
    console.log("Halls:", halls);
  }, [papers, halls]);

  // CALCULATE MISSING VARIABLES
  const totalStudents = papers.reduce(
    (sum, paper) => sum + paper.registerNumbers.length,
    0
  );
  const totalCapacity = halls.reduce((sum, hall) => sum + hall.strength, 0);

  const [distributionPreview, setDistributionPreview] = useState([]);
  const [seatArrangementData, setSeatArrangementData] = useState([]);
  const [capacityError, setCapacityError] = useState("");
  const [warnNoHalls, setWarnNoHalls] = useState(false);
  const [isError, setIsError] = useState(false);

  // ADD MISSING FUNCTION
  const buildSubjectsFromPapers = () =>
    papers.map((p) => ({
      subjectName: p.course || `Paper-${papers.indexOf(p) + 1}`,
      count: p.registerNumbers.length,
      registerNumbers: p.registerNumbers,
    }));

  // ----------------- FIXED: Maintain Original Order Distribution Logic -------------------
  const distributeStudentsFlexible = (subjects, hallList) => {
    const distributionRows = [];
    const hallUsage = hallList.map((hall) => ({
      hall: hall,
      remaining: hall.strength,
      papers: {},
      students: [],
      paperDistribution: {},
    }));

    let slCounter = 1;

    const studentPools = subjects.map((subject) => ({
      subjectName: subject.subjectName,
      students: subject.registerNumbers.map((regNo, i) => ({
        id: `${subject.subjectName}-${i + 1}`,
        subject: subject.subjectName,
        registerNumber: regNo,
        originalIndex: i,
        rnbb: `RNBB${i + 1}`,
      })),
      distributed: 0,
      total: subject.registerNumbers.length,
    }));

    let hallIndex = 0;

    while (
      studentPools.some((pool) => pool.students.length > 0) &&
      hallIndex < hallUsage.length
    ) {
      const currentHall = hallUsage[hallIndex];

      if (currentHall.remaining <= 0) {
        hallIndex++;
        continue;
      }

      const availablePools = studentPools.filter((p) => p.students.length > 0);
      if (availablePools.length === 0) {
        hallIndex++;
        continue;
      }

      const S = currentHall.hall.strength;
      const target = Math.floor(S / 2); // first paper target
      let remainingSeats = Math.min(currentHall.remaining, S);

      // pick the first available pool (respecting subjects order)
      const firstPoolIndex = studentPools.findIndex(
        (p) => p.students.length > 0
      );
      if (firstPoolIndex === -1) {
        hallIndex++;
        continue;
      }

      const usedPapersThisHall = []; // track papers used and counts for warning
      // --- Allocate from first paper ---
      const firstPool = studentPools[firstPoolIndex];
      const takeFromFirst = Math.min(
        firstPool.students.length,
        target,
        remainingSeats
      );

      if (takeFromFirst > 0) {
        const studentsTaken = firstPool.students.splice(0, takeFromFirst);
        remainingSeats -= studentsTaken.length;
        firstPool.distributed += studentsTaken.length;

        // record distribution row
        const existingRowIndex = distributionRows.findIndex(
          (row) =>
            row.subjectName === firstPool.subjectName &&
            row.room === currentHall.hall.name
        );

        if (existingRowIndex !== -1) {
          distributionRows[existingRowIndex].count += studentsTaken.length;
          distributionRows[existingRowIndex].students.push(...studentsTaken);
        } else {
          distributionRows.push({
            sl: slCounter++,
            subjectName: firstPool.subjectName,
            count: studentsTaken.length,
            room: currentHall.hall.name || `HALL-${hallIndex + 1}`,
            students: studentsTaken,
          });
        }

        currentHall.students.push(...studentsTaken);
        currentHall.papers[firstPool.subjectName] =
          (currentHall.papers[firstPool.subjectName] || 0) +
          studentsTaken.length;
        if (!currentHall.paperDistribution[firstPool.subjectName]) {
          currentHall.paperDistribution[firstPool.subjectName] = [];
        }
        currentHall.paperDistribution[firstPool.subjectName].push(
          ...studentsTaken
        );

        usedPapersThisHall.push(firstPool.subjectName);
      }

      // --- Allocate from second pool (preferred) and subsequent if needed ---
      let poolIdx = firstPoolIndex + 1;
      // second preferred max is target (same as first). But if target === 0 (small halls) allow fill.
      while (remainingSeats > 0 && poolIdx < studentPools.length) {
        const pool = studentPools[poolIdx];
        if (!pool || pool.students.length === 0) {
          poolIdx++;
          continue;
        }

        // For the preferred second pool try to give up to `target`, but also respect remainingSeats.
        // For third+ pools, allow them to contribute but cap per-pool at target as well,
        // except if remainingSeats < target we take what's needed.
        const cap = Math.max(1, target); // ensure at least 1 allowed if target is 0
        const take = Math.min(pool.students.length, remainingSeats, cap);

        if (take <= 0) {
          poolIdx++;
          continue;
        }

        const studentsTaken = pool.students.splice(0, take);
        remainingSeats -= studentsTaken.length;
        pool.distributed += studentsTaken.length;

        // record distribution row
        const existingRowIndex = distributionRows.findIndex(
          (row) =>
            row.subjectName === pool.subjectName &&
            row.room === currentHall.hall.name
        );

        if (existingRowIndex !== -1) {
          distributionRows[existingRowIndex].count += studentsTaken.length;
          distributionRows[existingRowIndex].students.push(...studentsTaken);
        } else {
          distributionRows.push({
            sl: slCounter++,
            subjectName: pool.subjectName,
            count: studentsTaken.length,
            room: currentHall.hall.name || `HALL-${hallIndex + 1}`,
            students: studentsTaken,
          });
        }

        currentHall.students.push(...studentsTaken);
        currentHall.papers[pool.subjectName] =
          (currentHall.papers[pool.subjectName] || 0) + studentsTaken.length;
        if (!currentHall.paperDistribution[pool.subjectName]) {
          currentHall.paperDistribution[pool.subjectName] = [];
        }
        currentHall.paperDistribution[pool.subjectName].push(...studentsTaken);

        if (!usedPapersThisHall.includes(pool.subjectName)) {
          usedPapersThisHall.push(pool.subjectName);
        }

        // move to next pool only if still need seats
        if (remainingSeats > 0) poolIdx++;
      }

      // If after trying successive pools we still have remainingSeats but there are no more pools,
      // then hall remains partially filled and we move on.
      currentHall.remaining -= S - remainingSeats; // seats filled = S - remainingSeats
      // ensure non-negative
      if (currentHall.remaining < 0) currentHall.remaining = 0;

      // mark warning if more than 2 papers ended up in this hall
      if (usedPapersThisHall.length > 2) {
        // find distribution rows for this room and mark them with warning
        distributionRows.forEach((r) => {
          if (
            r.room === (currentHall.hall.name || `HALL-${hallIndex + 1}`) &&
            usedPapersThisHall.includes(r.subjectName)
          ) {
            r._warning = true;
          }
        });
      }

      // move to next hall if full or no more available pools can fill it
      if (currentHall.remaining <= 0) {
        hallIndex++;
      } else {
        // if there are still students but we couldn't fill more from any pool (rare),
        // move to next hall to try distribute others
        const stillHasMovable = studentPools.some((p) => p.students.length > 0);
        if (!stillHasMovable) {
          hallIndex++;
        } else {
          // if current hall still has capacity but next pools are empty, move on to next hall
          const nextAvailable = studentPools.findIndex(
            (p) => p.students.length > 0
          );
          if (nextAvailable === -1) hallIndex++;
          else {
            // if next available is before firstPoolIndex (unlikely), continue same hall; else move on
            if (nextAvailable <= firstPoolIndex) {
              // try again same hall (this rarely happens)
            } else {
              // continue trying same hall only if we still have pools after firstPoolIndex
              const anyAfter = studentPools
                .slice(firstPoolIndex + 1)
                .some((p) => p.students.length > 0);
              if (!anyAfter) hallIndex++;
            }
          }
        }
      }
    } // end while

    // any leftover students -> UNASSIGNED
    studentPools.forEach((pool) => {
      if (pool.students.length > 0) {
        distributionRows.push({
          sl: slCounter++,
          subjectName: pool.subjectName,
          count: pool.students.length,
          room: "UNASSIGNED - NO HALLS LEFT",
          students: pool.students,
          _warning: true,
        });
      }
    });

    // sort students inside each hall and per paperDistribution as before
    hallUsage.forEach((usage) => {
      usage.students.sort((a, b) => {
        const prefixA = a.registerNumber.replace(/\d+$/, "");
        const prefixB = b.registerNumber.replace(/\d+$/, "");
        const numA = parseInt(a.registerNumber.replace(prefixA, "")) || 0;
        const numB = parseInt(b.registerNumber.replace(prefixB, "")) || 0;

        if (prefixA !== prefixB) {
          return prefixA.localeCompare(prefixB);
        }
        return numA - numB;
      });

      Object.values(usage.paperDistribution).forEach((students) => {
        students.sort((a, b) => {
          const prefixA = a.registerNumber.replace(/\d+$/, "");
          const prefixB = b.registerNumber.replace(/\d+$/, "");
          const numA = parseInt(a.registerNumber.replace(prefixA, "")) || 0;
          const numB = parseInt(b.registerNumber.replace(prefixB, "")) || 0;

          if (prefixA !== prefixB) {
            return prefixA.localeCompare(prefixB);
          }
          return numA - numB;
        });
      });
    });

    const previewData = hallUsage.map((usage, index) => ({
      hall: usage.hall.name || `HALL-${index + 1}`,
      invigilator: usage.hall.invigilator || "",
      papers: Object.entries(usage.papers).map(([paper, count]) => ({
        paper,
        count,
        percentage: Math.round((count / usage.hall.strength) * 100),
      })),
      paperDistribution: usage.paperDistribution,
      remaining: usage.remaining,
      utilization: Math.round(
        ((usage.hall.strength - usage.remaining) / usage.hall.strength) * 100
      ),
      paperCount: Object.keys(usage.papers).length,
      students: usage.students,
    }));

    const seatData = hallUsage
      .map((usage, index) => ({
        sl: index + 1,
        room: usage.hall.name || `HALL-${index + 1}`,
        students: usage.students,
        totalStudents: usage.hall.strength - usage.remaining,
      }))
      .filter((hall) => hall.totalStudents > 0);

    const ranOut = distributionRows.some((r) => r._warning);
    return {
      distributionRows,
      ranOut,
      hallUsage: hallUsage.map((h) => h.remaining),
      previewData,
      seatArrangementData: seatData,
    };
  };

  // ----------------- FIXED: Format Register Numbers for Display -------------------
  const formatRegisterNumbers = (students) => {
    if (students.length === 0) return "";

    // Group by prefix
    const groups = {};
    students.forEach((student) => {
      const regNo = student.registerNumber;
      // Extract prefix (alphabetic part) and number
      const prefix = regNo.replace(/\d+$/, "");
      const number = parseInt(regNo.replace(prefix, "")) || 0;

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
            ranges.push(`${prefix}${start.toString().padStart(3, "0")}`);
          } else {
            ranges.push(
              `${prefix}${start.toString().padStart(3, "0")} to ${end
                .toString()
                .padStart(3, "0")}`
            );
          }
          start = numbers[i];
          end = numbers[i];
        }
      }

      // Add the last range
      if (start === end) {
        ranges.push(`${prefix}${start.toString().padStart(3, "0")}`);
      } else {
        ranges.push(
          `${prefix}${start.toString().padStart(3, "0")} to ${end
            .toString()
            .padStart(3, "0")}`
        );
      }

      formattedGroups.push(ranges.join(", "));
    });

    return formattedGroups.join(", ");
  };

  // ----------------- NEW: Format Register Numbers List for Display -------------------
  const formatRegisterNumbersList = (students) => {
    if (students.length === 0) return "";

    // Group by prefix
    const groups = {};
    students.forEach((student) => {
      const regNo = student.registerNumber;
      // Extract prefix (alphabetic part) and number
      const prefix = regNo.replace(/\d+$/, "");
      const number = parseInt(regNo.replace(prefix, "")) || 0;

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
      formattedList.push(`${prefix}${numbers[0].toString().padStart(3, "0")}`);

      for (let i = 1; i < numbers.length; i++) {
        formattedList.push(numbers[i].toString().padStart(3, "0"));
      }

      formattedGroups.push(formattedList.join(", "));
    });

    return formattedGroups.join(", ");
  };

  const previewDistribution = () => {
    const validHalls = halls
      .map((hall, index) => ({
        ...hall,
        name: hall.name.trim() || `HALL-${index + 1}`,
      }))
      .filter((hall) => hall.strength > 0);

    if (validHalls.length === 0) {
      setWarnNoHalls(true);
      setCapacityError("Please add at least one hall with positive strength");
      return;
    }

    const subjects = buildSubjectsFromPapers();
    const { previewData, seatArrangementData } = distributeStudentsFlexible(
      subjects,
      validHalls
    );
    setDistributionPreview(previewData);
    setSeatArrangementData(seatArrangementData);
    setWarnNoHalls(false);
    setCapacityError("");
  };

  const generatePDF = () => {
    setWarnNoHalls(false);
    setCapacityError("");

    if (totalCapacity < totalStudents) {
      setCapacityError(
        `Cannot generate PDF: Insufficient capacity! Need ${
          totalStudents - totalCapacity
        } more seats`
      );
      return;
    }

    const validHalls = halls
      .map((hall, index) => ({
        ...hall,
        name: hall.name.trim() || `HALL-${index + 1}`,
      }))
      .filter((hall) => hall.strength > 0);

    if (validHalls.length === 0) {
      setWarnNoHalls(true);
      setCapacityError("Please add at least one hall with positive strength");
      return;
    }

    const subjects = buildSubjectsFromPapers();
    const { distributionRows, ranOut } = distributeStudentsFlexible(
      subjects,
      validHalls
    );

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
    doc.text("EXAM SUMMARY - TO: EXAM CHIEF", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 25;

    doc.setFontSize(12);
    const examDate = papers[0]?.dateTime || "04-11-2025 FN";
    doc.text(`Date of Exam : ${examDate}`, pageWidth / 2, currentY, {
      align: "center",
    });
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
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      margin: { left: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // INVIGILATION AND ROOM DETAILS
    doc.setFontSize(14);
    doc.text("INVIGILATION AND ROOM DETAILS", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 20;

    const invigilationData = validHalls.map((hall, index) => [
      index + 1,
      hall.invigilator || "",
      hall.name,
      hall.strength,
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
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      margin: { left: 40, right: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // QUESTION PAPERS TO BE PRINTED
    doc.setFontSize(14);
    doc.text("QUESTION PAPERS TO BE PRINTED", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 20;

    const papersData = subjects.map((subject, index) => [
      index + 1,
      subject.subjectName,
      subject.count,
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
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      margin: { left: 40, right: 40 },
    });

    currentY = doc.lastAutoTable.finalY + 25;

    // QUESTION PAPER DISTRIBUTION TABLE
    doc.setFontSize(14);
    doc.text("QUESTION PAPER DISTRIBUTION TABLE", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 20;

    const distributionData = distributionRows.map((row) => [
      row.sl,
      row.subjectName,
      row.count,
      row.room,
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
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      margin: { left: 40, right: 40 },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        const page = doc.internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(8);
        doc.text(
          `Page ${page} of ${pageCount}`,
          doc.internal.pageSize.getWidth() - 80,
          doc.internal.pageSize.getHeight() - 20
        );
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30; // Reduced margin for more space

    // Generate one page per hall
    distributionPreview.forEach((hallData, hallIndex) => {
      if (hallIndex > 0) {
        doc.addPage();
      }

      let currentY = margin;

      // Header
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("EXAM DETAILS - TO: INVIGILATOR", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 25;

      // Single table for invigilator and room details
      const invigilatorData = [
        ["Name of Invigilator", hallData.invigilator || ""],
        ["Room Assigned", hallData.hall],
        ["Hall No:", hallIndex + 1],
        ["No of Students", hallData.students.length],
        ["Exam Date", examDate],
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
          minCellHeight: 8,
        },
        columnStyles: {
          0: { cellWidth: 150 },
          1: { cellWidth: pageWidth - 2 * margin - 150 },
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
      });

      currentY = doc.lastAutoTable.finalY + 20;

      currentY += 7;

      // SUBJECTS AND QUESTION PAPER COUNT
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("SUBJECTS AND QUESTION PAPER COUNT", pageWidth / 2, currentY, {
        align: "center",
      });
      currentY += 15;

      const paperCountData = Object.entries(
        hallData.paperDistribution || {}
      ).map(([paper, students], index) => [index + 1, paper, students.length]);

      autoTable(doc, {
        startY: currentY,
        head: [[examData?.isRnbb ? "RNBB" : "SL", "NAME OF SUBJECT", "COUNT"]],
        body: paperCountData,
        styles: {
          fontSize: 9,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 3,
          minCellHeight: 8,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
        },
        columnStyles: {
          0: { cellWidth: 40, halign: "center" },
          1: { cellWidth: pageWidth - 2 * margin - 100 },
          2: { cellWidth: 60, halign: "center" },
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
      });

      currentY = doc.lastAutoTable.finalY + 15;

      currentY += 7;

      // STUDENTS LIST
      doc.setFontSize(14);
      doc.setFont(undefined, "bold");
      doc.text("STUDENTS LIST", pageWidth / 2, currentY, { align: "center" });
      currentY += 12;

      // Prepare student data for all papers in this hall
      const allStudents = [];
      let globalRnbbCounter = 1;

      Object.entries(hallData.paperDistribution || {}).forEach(
        ([paper, students]) => {
          // Sort students by register number
          const sortedStudents = [...students].sort((a, b) => {
            const prefixA = a.registerNumber.replace(/\d+$/, "");
            const prefixB = b.registerNumber.replace(/\d+$/, "");
            const numA = parseInt(a.registerNumber.replace(prefixA, "")) || 0;
            const numB = parseInt(b.registerNumber.replace(prefixB, "")) || 0;

            if (prefixA !== prefixB) {
              return prefixA.localeCompare(prefixB);
            }
            return numA - numB;
          });

          sortedStudents.forEach((student, studentIndex) => {
            allStudents.push([
              examData?.isRnbb ? `RNBB${globalRnbbCounter}` : `${globalRnbbCounter}`,
              student.registerNumber,
              studentIndex === 0 ? paper : '"',
              "",
            ]);
            globalRnbbCounter++;
          });
        }
      );

      // Calculate available space for students table
      const availableHeight = pageHeight - currentY - 60; // Reserve space for signature and page number

      autoTable(doc, {
        startY: currentY,
        head: [[examData?.isRnbb ? "RNBB" : "SL", "REG NO", "SUBJECT NAME", "SIGNATURE"]],
        body: allStudents,
        styles: {
          fontSize: 8,
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          cellPadding: 3,
          minCellHeight: 7,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          lineColor: [0, 0, 0],
          lineWidth: 0.5,
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 60, halign: "center" },
          1: { cellWidth: 100, halign: "center" },
          2: { cellWidth: pageWidth - 2 * margin - 260 },
          3: { cellWidth: 100, halign: "center" },
        },
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - 2 * margin,
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.5,
      });

      // Position signature at bottom
      const signatureY = pageHeight - 40;
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text("Signature: ____________________", margin, signatureY);

      // Page number at bottom right
      doc.setFontSize(8);
      doc.text(
        `Page ${hallIndex + 1} of ${distributionPreview.length}`,
        pageWidth - margin - 60,
        pageHeight - 20
      );
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

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 50;

    // Header - Centered with better spacing
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("SEAT ARRANGEMENT", pageWidth / 2, currentY, { align: "center" });
    currentY += 20;

    doc.setFontSize(14);
    doc.text("UNIVERSITY EXAMINATION", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 30;

    // Exam details with better formatting
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    const examDate = papers[0]?.dateTime || "04-11-2025 FN";
    doc.text(`Date of Examination: ${examDate}`, pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 8;
    // currentY += 8;

    const totalStudents = seatArrangementData.reduce(
      (sum, hall) => sum + hall.students.length,
      0
    );
    // doc.text(`Total Students: ${totalStudents}`, pageWidth / 2, currentY, {
    //   align: "center",
    // });
    currentY += 25;

    // Seat Arrangement Table with improved styling
    const seatData = seatArrangementData.map((hall) => {
      const rangeDisplay = formatRegisterNumbers(hall.students);
      const regList = formatRegisterNumbersList(hall.students);

      return [hall.sl, hall.room, rangeDisplay, regList];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["SL", "ROOM", "REG NO RANGE", "REGISTER NUMBERS"]],
      body: seatData,
      styles: {
        fontSize: 9,
        fillColor: [255, 255, 255],
        textColor: [40, 40, 40],
        lineColor: [100, 100, 100],
        lineWidth: 0.75,
        cellPadding: 6,
        valign: "middle",
        halign: "left",
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [100, 100, 100],
        lineWidth: 0.75,
        fontSize: 10,
        cellPadding: 8,
      },
      columnStyles: {
        0: { cellWidth: 35, halign: "center" }, // SL
        1: { cellWidth: 80, halign: "center" }, // ROOM
        2: { cellWidth: 140 }, // REG NO RANGE
        3: { cellWidth: 275 }, // REG NOS
      },
      margin: { left: 30, right: 30, top: 50, bottom: 40 },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      didDrawPage: (data) => {
        // Footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        const page = doc.internal.getCurrentPageInfo().pageNumber;

        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        doc.setTextColor(100, 100, 100);

        // Page number centered at bottom
        doc.text(
          `Page ${page} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 25,
          { align: "center" }
        );

        // Generation date on left
        const today = new Date().toLocaleDateString("en-GB");
        doc.text(`Generated: ${today}`, 30, pageHeight - 25);
      },
    });

    doc.save("seat-arrangement.pdf");
  };

  // FIX THE DISABLED CONDITION
  const isGenerateDisabled =
    totalCapacity < totalStudents || halls.length === 0 || totalStudents === 0;

  useEffect(() => {
    // console.log("Exam updated:", examData);
    checkErrors();
  }, [examData]);

  const checkErrors = () => {
    let hasError = false;
    if (examData && examData.papers) {
      for (let paper of examData.papers) {
        if (paper.extractedDateTime == null || paper.extractedSession == null) {
          continue; // Skip if data is incomplete
        }
        if (checkMismatch(paper?.extractedDateTime, paper?.extractedSession)) {
          hasError = true;
          break;
        }
      }
    }
    setIsError(hasError);
  };

    const checkMismatch = (paperDate, paperSession) => {
    return paperDate !== examData.date || paperSession !== examData.session;
  };

  return (
    <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">PDF Generation</h2>

      {/* Add Summary Section */}
      <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-2">Current Setup</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Papers</p>
            <p className="font-bold">{papers.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Students</p>
            <p className="font-bold">{totalStudents}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Halls</p>
            <p className="font-bold">{halls.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Total Capacity</p>
            <p className="font-bold">{totalCapacity}</p>
          </div>
        </div>
      </div>

      <button
        disabled={isError}
        onClick={previewDistribution}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium mb-4
        disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed
        "
      >
        <Users className="w-4 h-4" /> Preview Distribution
      </button>

          {isError && (
  <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
    ⚠ Fix date/session mismatches before continuing.
  </div>
)}
      {/* i mean hall name and invigilator name alert message */}
      <div className="mb-4">
        {distributionPreview.some((hall) => hall.hall.startsWith("HALL-")) && (
          <div className="p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-lg">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Some halls are using default names (e.g., HALL-1). Please consider
            assigning proper names for better clarity.
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end mb-4 flex-col md:flex-row">
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

      {/* Distribution Preview */}
      {distributionPreview.length > 0 && (
        <div className="mb-4 p-4 bg-white border border-gray-300 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-3">Distribution Preview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {distributionPreview.map((hall, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3"
              >
                <h4 className="font-semibold text-gray-700 mb-2">
                  {hall.hall}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Invigilator: {hall.invigilator || "Not assigned"}
                </p>
                <div className="space-y-1">
                  {hall.papers.map((paper, paperIndex) => (
                    <div
                      key={paperIndex}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">{paper.paper}</span>
                      <span className="font-medium">
                        {paper.count} students
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span>Utilization:</span>
                    <span
                      className={`font-bold ${
                        hall.utilization >= 90
                          ? "text-green-600"
                          : hall.utilization >= 70
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
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
          <div
            className={`p-3 rounded-lg ${
              capacityError.includes("Insufficient") ||
              capacityError.includes("Cannot generate")
                ? "bg-red-100 border border-red-300 text-red-800"
                : "bg-yellow-100 border border-yellow-300 text-yellow-800"
            }`}
          >
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
    </div>
  );
};

export default PDFGenerator;
