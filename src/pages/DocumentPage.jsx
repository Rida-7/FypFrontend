import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, History, X, ChevronRight, FolderOpen,
  AlertCircle, Eye, ChevronDown, FileDown, Download, RefreshCw,
} from "lucide-react";
import {
  SiSlack, SiTrello, SiClickup, SiNotion,
  SiJira, SiGithub, SiAsana, SiLinear,
} from "react-icons/si";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ── Tool metadata ─────────────────────────────────────────────────────────────
const TOOL_CONFIG = {
  trello: { label: "Trello", color: "#0079BF", bg: "#e8f4fd", Icon: SiTrello },
  slack: { label: "Slack", color: "#E01E5A", bg: "#fde8ef", Icon: SiSlack },
  github: { label: "GitHub", color: "#24292e", bg: "#f0ebfd", Icon: SiGithub },
  notion: { label: "Notion", color: "#374151", bg: "#f3f4f6", Icon: SiNotion },
  jira: { label: "Jira", color: "#0052CC", bg: "#e6effe", Icon: SiJira },
  asana: { label: "Asana", color: "#F06A6A", bg: "#fef0f0", Icon: SiAsana },
  linear: { label: "Linear", color: "#5E6AD2", bg: "#eeeffe", Icon: SiLinear },
  clickup: { label: "ClickUp", color: "#7B68EE", bg: "#f0eeff", Icon: SiClickup },
};

function getToolConfig(toolName = "") {
  const key = toolName.toLowerCase().trim();
  return TOOL_CONFIG[key] || { label: toolName || "Other", color: "#6366f1", bg: "#eef2ff", Icon: null };
}

function resolveToolName(doc) {
  return doc.tool_name || doc.tool || doc.source || doc.integration || doc.workspace_type || "Other";
}

function resolveProjectName(doc) {
  return (doc.board_name || doc.project_name || doc.workspace_name || "Unknown Project").trim();
}

// ── Template name map (keys stored lowercase for case-insensitive lookup) ─────
const TEMPLATE_NAME_MAP = {
  wbs: "WBS Document",
  srs: "SRS Document",
  sprintreport: "Sprint Report",
  testcase: "Test Case Document",
  usermanual: "User Manual",
  api: "API Documentation",
  readme: "README File",
  authenticate: "Authentication Flow Documentation",
  backend: "Backend Service Documentation",
  configuration: "Configuration Guide",
  database: "Database Schema Documentation",
  risk: "Risk Management Report",
  deploy: "Deployment Guide",
};

function resolveTemplateName(doc) {
  const raw = doc.template_name || doc.template_key || "";
  return TEMPLATE_NAME_MAP[raw.toLowerCase()] || raw;
}

// ── Script loader ─────────────────────────────────────────────────────────────
const loadScript = (src, globalCheck) =>
  new Promise((resolve, reject) => {
    if (window[globalCheck]) { resolve(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }
    const el = document.createElement("script");
    el.src = src; el.onload = resolve;
    el.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(el);
  });

// ── Normalize inline tables ───────────────────────────────────────────────────
const normalizeTableText = (text) => {
  const lines = text.split("\n");
  const expanded = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\|/.test(trimmed) && /\|\s*\|/.test(trimmed)) {
      const rows = trimmed.split(/(?<=\|)\s*(?=\|[^|])/);
      rows.forEach((r) => { if (r.trim()) expanded.push(r.trim()); });
    } else {
      expanded.push(line);
    }
  }
  return expanded.join("\n");
};

// ── PDF Download ──────────────────────────────────────────────────────────────
async function downloadAsPDF(doc, setDownloadingMap) {
  const key = doc.project_id + doc.template_name;
  setDownloadingMap(prev => ({ ...prev, [key]: "pdf" }));

  const rawContent = doc.generated_docs || "";
  const templateName = resolveTemplateName(doc);
  const boardName = resolveProjectName(doc);

  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js", "pdfMake");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js", "_pdfFontsReady");
    window._pdfFontsReady = true;
    const pdfMake = window.pdfMake;

    const content = [];
    content.push({ text: templateName, style: "docTitle", marginBottom: 4 });
    if (boardName) content.push({ text: `Project: ${boardName}`, style: "meta", marginBottom: 12 });
    content.push({
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: "#C7D2FE" }],
      marginBottom: 16,
    });

    const normalizedRaw = normalizeTableText(rawContent);
    const lines = normalizedRaw.split("\n");
    let tableRows = [];
    let inTableBlock = false;

    const flushTable = () => {
      if (!tableRows.length) return;
      const dataRows = tableRows.filter(r => !/^[\s|:-]+$/.test(r));
      if (!dataRows.length) { tableRows = []; inTableBlock = false; return; }

      const parsed = dataRows.map(row => row.split("|").map(c => c.trim()).filter(Boolean));
      const colCount = Math.max(...parsed.map(r => r.length));
      const isWide = colCount > 4;

      const CELL_PAD = 8;
      const pageUsableWidth = isWide ? 742 : 495;
      const availableForText = pageUsableWidth - colCount * CELL_PAD;
      const baseColWidth = Math.floor(availableForText / colCount);
      const colWidths = Array(colCount).fill(baseColWidth);
      colWidths[colCount - 1] = availableForText - baseColWidth * (colCount - 1);

      const pdfRows = parsed.map((cells, ri) =>
        Array.from({ length: colCount }, (_, ci) => ({
          text: (cells[ci] || "").replace(/[*_`]/g, ""),
          style: ri === 0 ? "tableHeader" : "tableCell",
          fillColor: ri === 0 ? "#4F46E5" : (ri % 2 === 0 ? "#F5F3FF" : "#FFFFFF"),
        }))
      );

      const tableNode = {
        table: { headerRows: 1, widths: colWidths, body: pdfRows },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0.5,
          hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB",
          paddingLeft: () => 4, paddingRight: () => 4,
          paddingTop: () => 3, paddingBottom: () => 3,
        },
        marginBottom: 12,
      };

      if (isWide) {
        content.push({ ...tableNode, pageOrientation: "landscape", pageBreak: "before" });
        content.push({ text: "", pageOrientation: "portrait", pageBreak: "after" });
      } else {
        content.push(tableNode);
      }
      tableRows = []; inTableBlock = false;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\s*\|/.test(trimmed)) { inTableBlock = true; tableRows.push(trimmed); continue; }
      if (inTableBlock) flushTable();
      if (!trimmed || trimmed === "---") continue;
      const clean = trimmed.replace(/[*_`]/g, "").trim();
      if (/^###\s/.test(trimmed)) content.push({ text: clean.replace(/^#+\s*/, ""), style: "h3", marginBottom: 6 });
      else if (/^##\s/.test(trimmed)) content.push({ text: clean.replace(/^#+\s*/, ""), style: "h2", marginBottom: 8 });
      else if (/^#\s/.test(trimmed)) content.push({ text: clean.replace(/^#+\s*/, ""), style: "h1", marginBottom: 10 });
      else if (/^[-*]\s+/.test(trimmed)) content.push({ ul: [{ text: clean.replace(/^[-*]\s+/, ""), style: "bodyText" }], marginBottom: 3 });
      else if (/^\d+\.\s+/.test(trimmed)) content.push({ ol: [{ text: clean.replace(/^\d+\.\s+/, ""), style: "bodyText" }], marginBottom: 3 });
      else content.push({ text: clean, style: "bodyText", marginBottom: 6 });
    }
    if (inTableBlock) flushTable();

    const docDef = {
      pageSize: "A4",
      pageMargins: [50, 70, 50, 60],
      header: () => ({ columns: [{ text: templateName, style: "headerLeft", margin: [50, 20, 0, 0] }] }),
      footer: (currentPage, pageCount) => ({
        columns: [{ text: `${currentPage} / ${pageCount}`, style: "footerText", alignment: "right", margin: [0, 10, 50, 0] }],
      }),
      content,
      styles: {
        docTitle: { fontSize: 22, bold: true, color: "#111827" },
        meta: { fontSize: 10, italics: true, color: "#6B7280" },
        h1: { fontSize: 16, bold: true, color: "#111827", marginTop: 14 },
        h2: { fontSize: 13, bold: true, color: "#1F2937", marginTop: 10 },
        h3: { fontSize: 11, bold: true, color: "#374151", marginTop: 8 },
        bodyText: { fontSize: 10, color: "#4B5563", lineHeight: 1.5 },
        tableHeader: { fontSize: 9, bold: true, color: "#FFFFFF" },
        tableCell: { fontSize: 9, color: "#374151" },
        headerLeft: { fontSize: 9, bold: true, color: "#4F46E5" },
        footerText: { fontSize: 8, color: "#9CA3AF" },
      },
      defaultStyle: { font: "Roboto" },
    };

    pdfMake.createPdf(docDef).download(templateName.replace(/\s+/g, "_") + ".pdf");
  } catch (err) {
    console.error("PDF error:", err);
    alert("❌ Failed to generate PDF.");
  } finally {
    setDownloadingMap(prev => ({ ...prev, [key]: null }));
  }
}

// ── Word Download ─────────────────────────────────────────────────────────────
async function downloadAsWord(doc, setDownloadingMap) {
  const key = doc.project_id + doc.template_name;
  setDownloadingMap(prev => ({ ...prev, [key]: "word" }));

  const rawContent = doc.generated_docs || "";
  const templateName = resolveTemplateName(doc);
  const boardName = resolveProjectName(doc);

  try {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip");
    const JSZip = window.JSZip;

    const esc = (s) => String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const stripInline = (s) => s.replace(/[*_`]/g, "").trim();

    const xmlParts = [];

    xmlParts.push(`<w:p>
      <w:pPr><w:pStyle w:val="Title"/><w:jc w:val="left"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="111827"/></w:rPr>
        <w:t>${esc(templateName)}</w:t>
      </w:r>
    </w:p>`);

    if (boardName) {
      xmlParts.push(`<w:p>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
        <w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="6B7280"/></w:rPr>
          <w:t>Project: ${esc(boardName)}</w:t>
        </w:r>
      </w:p>`);
    }

    xmlParts.push(`<w:p>
      <w:pPr>
        <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C7D2FE"/></w:pBdr>
        <w:spacing w:after="240"/>
      </w:pPr>
    </w:p>`);

    const normalizedRaw = normalizeTableText(rawContent);
    const lines = normalizedRaw.split("\n");
    let tableBuffer = [];
    let inTableBlock = false;

    const flushTable = () => {
      if (!tableBuffer.length) return;
      const dataRows = tableBuffer.filter(r => !/^[\s|:-]+$/.test(r.trim()));
      if (!dataRows.length) { tableBuffer = []; inTableBlock = false; return; }

      const parsed = dataRows.map(row => row.split("|").map(c => c.trim()).filter(Boolean));
      const colCount = Math.max(...parsed.map(r => r.length));
      const baseColW = Math.floor(8640 / colCount);
      const colWidths = Array(colCount).fill(baseColW);
      colWidths[colCount - 1] = 8640 - baseColW * (colCount - 1);

      let txml = `<w:tbl><w:tblPr>
        <w:tblW w:w="8640" w:type="dxa"/>
        <w:tblBorders>
          <w:top    w:val="single" w:sz="4" w:color="E5E7EB"/>
          <w:left   w:val="single" w:sz="4" w:color="E5E7EB"/>
          <w:bottom w:val="single" w:sz="4" w:color="E5E7EB"/>
          <w:right  w:val="single" w:sz="4" w:color="E5E7EB"/>
          <w:insideH w:val="single" w:sz="4" w:color="E5E7EB"/>
          <w:insideV w:val="single" w:sz="4" w:color="E5E7EB"/>
        </w:tblBorders>
      </w:tblPr>`;

      parsed.forEach((cells, ri) => {
        txml += `<w:tr>`;
        for (let ci = 0; ci < colCount; ci++) {
          const cell = cells[ci] || "";
          const fill = ri === 0 ? "4F46E5" : (ri % 2 === 0 ? "F5F3FF" : "FFFFFF");
          const textColor = ri === 0 ? "FFFFFF" : "374151";
          txml += `<w:tc>
            <w:tcPr>
              <w:tcW w:w="${colWidths[ci]}" w:type="dxa"/>
              <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
              <w:tcMar>
                <w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>
                <w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
              </w:tcMar>
            </w:tcPr>
            <w:p><w:r>
              <w:rPr>${ri === 0 ? "<w:b/>" : ""}<w:sz w:val="18"/><w:color w:val="${textColor}"/></w:rPr>
              <w:t xml:space="preserve">${esc(stripInline(cell))}</w:t>
            </w:r></w:p>
          </w:tc>`;
        }
        txml += `</w:tr>`;
      });
      txml += `</w:tbl><w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>`;
      xmlParts.push(txml);
      tableBuffer = []; inTableBlock = false;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\s*\|/.test(trimmed)) { inTableBlock = true; tableBuffer.push(trimmed); continue; }
      if (inTableBlock) flushTable();
      if (!trimmed || trimmed === "---") continue;

      if (/^###\s/.test(trimmed)) {
        xmlParts.push(`<w:p>
          <w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="200" w:after="80"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed.replace(/^###\s*/, "")))}</w:t>
          </w:r></w:p>`);
      } else if (/^##\s/.test(trimmed)) {
        xmlParts.push(`<w:p>
          <w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="280" w:after="120"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F2937"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed.replace(/^##\s*/, "")))}</w:t>
          </w:r></w:p>`);
      } else if (/^#\s/.test(trimmed)) {
        xmlParts.push(`<w:p>
          <w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="360" w:after="160"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed.replace(/^#\s*/, "")))}</w:t>
          </w:r></w:p>`);
      } else if (/^[-*]\s+/.test(trimmed)) {
        xmlParts.push(`<w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="60"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed.replace(/^[-*]\s+/, "")))}</w:t>
          </w:r></w:p>`);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        xmlParts.push(`<w:p>
          <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed.replace(/^\d+\.\s+/, "")))}</w:t>
          </w:r></w:p>`);
      } else {
        xmlParts.push(`<w:p>
          <w:pPr><w:spacing w:after="120"/></w:pPr>
          <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
            <w:t xml:space="preserve">${esc(stripInline(trimmed))}</w:t>
          </w:r></w:p>`);
      }
    }
    if (inTableBlock) flushTable();

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
<w:body>
${xmlParts.join("\n")}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr>
</w:body></w:document>`;

    const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="818CF8"/></w:rPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="360" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/>
    <w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="280" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F2937"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/>
    <w:pPr><w:outlineLvl w:val="2"/><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr></w:style>
</w:styles>`;

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

    const appRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.file("_rels/.rels", appRelsXml);
    zip.file("word/document.xml", documentXml);
    zip.file("word/styles.xml", stylesXml);
    zip.file("word/numbering.xml", numberingXml);
    zip.file("word/_rels/document.xml.rels", relsXml);

    const blob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateName.replace(/\s+/g, "_") + ".docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Word error:", err);
    alert("❌ Failed to generate Word document: " + err.message);
  } finally {
    setDownloadingMap(prev => ({ ...prev, [key]: null }));
  }
}

// =====================================================
// 📄 FULL VERSION VIEW MODAL
// =====================================================
function FullDocModal({ content, onClose }) {
  if (!content) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Full Document</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 px-6 py-5 leading-relaxed">{content}</pre>
      </div>
    </div>
  );
}

// =====================================================
// 🔁 Version History Modal
// =====================================================
function VersionHistory({ selectedDoc, userId, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullView, setFullView] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!selectedDoc) return;
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const wsParam = selectedDoc.workspace_id ? `&workspace_id=${selectedDoc.workspace_id}` : "";
        const res = await fetch(
          `${BACKEND_URL}/generated-docs/versions?user_id=${userId}&project_id=${selectedDoc.project_id}&template_name=${selectedDoc.template_name}${wsParam}`
        );
        if (!res.ok) throw new Error("Failed to fetch versions");
        const data = await res.json();
        setVersions(data.versions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [selectedDoc, userId]);

  const restoreVersion = async (version) => {
    try {
      setRestoring(true);
      await fetch(`${BACKEND_URL}/generated-docs/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, project_id: selectedDoc.project_id, template_name: selectedDoc.template_name, version }),
      });
      alert("Version restored successfully!");
      window.location.reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">Version History</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading…
            </div>
          )}
          {error && <p className="text-red-500 text-sm py-4">{error}</p>}
          {!loading && !error && versions.length === 0 && (
            <p className="text-gray-400 text-sm py-8 text-center">No version history available.</p>
          )}
          <div className="space-y-3">
            {versions.slice().reverse().map((v, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      Version {v.version}
                      {v.is_latest && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                          Current
                        </span>
                      )}
                    </div>
                    {/* ✅ Creator name */}
                    {v.created_by_name && (
                      <p className="text-xs text-gray-400">
                        by <span className="font-semibold text-gray-600">{v.created_by_name}</span>
                        {v.created_at && (
                          <span className="ml-2 text-gray-300">
                            · {new Date(v.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                      onClick={() => setFullView(v.content)}
                    >
                      <Eye className="w-3.5 h-3.5" /> Full View
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                      onClick={() => setExpanded(expanded === i ? null : i)}
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === i ? "rotate-180" : ""}`} />
                      {expanded === i ? "Collapse" : "Expand"}
                    </button>
                    <button
                      disabled={restoring}
                      className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition"
                      onClick={() => restoreVersion(v.version)}
                    >
                      Restore
                    </button>
                  </div>
                </div>

                {expanded === i && (
                  <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap bg-white max-h-[300px] overflow-auto leading-relaxed">
                    {v.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {fullView && <FullDocModal content={fullView} onClose={() => setFullView(null)} />}
    </div>
  );
}

// =====================================================
// 📄 MAIN PAGE
// =====================================================
export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [hoveredDoc, setHoveredDoc] = useState(null);
  const [collapsedTools, setCollapsedTools] = useState({});
  const [downloadingMap, setDownloadingMap] = useState({});

  const getUserId = () => {
    const raw = localStorage.getItem("userId");
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try { return JSON.parse(raw)?._id || null; } catch { return null; }
    }
    return raw;
  };
  const userId = getUserId();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${BACKEND_URL}/generated-docs/all?user_id=${userId}`)
      .then((r) => { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); })
      .then((d) => setDocs(d.documents || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-500 font-medium">Loading your documents…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">{error}</p>
      </div>
    </div>
  );

  if (!docs.length) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7 text-indigo-300" />
        </div>
        <p className="font-semibold text-gray-600">No documents yet</p>
        <p className="text-sm text-gray-400 mt-1">Run a workflow on a board to generate your first document.</p>
      </div>
    </div>
  );

  // ── Latest version per (project_id + template_name) ───────────────────────
  const latestMap = docs.reduce((acc, doc) => {
    const key = doc.project_id + "_" + doc.template_name;
    if (!acc[key] || (doc.version || 0) > (acc[key].version || 0)) acc[key] = doc;
    return acc;
  }, {});

  // ── Group: tool → project → docs[] ───────────────────────────────────────
  const groupedByTool = Object.values(latestMap).reduce((acc, doc) => {
    const tool = resolveToolName(doc);
    const project = resolveProjectName(doc);
    if (!acc[tool]) acc[tool] = {};
    if (!acc[tool][project]) acc[tool][project] = [];
    acc[tool][project].push(doc);
    return acc;
  }, {});

  const cardGradient = "from-indigo-500 to-purple-600";
  const cardGlow = "rgba(99,102,241,0.13)";
  const toggleTool = (tool) => setCollapsedTools((prev) => ({ ...prev, [tool]: !prev[tool] }));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">

        {/* Page Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">Workspace</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">Documents</h1>
            <p className="mt-2 text-gray-500 text-xl">All your generated docs, grouped by tool and project.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-gray-700">{Object.keys(latestMap).length} docs</span>
          </div>
        </div>

        {/* Tool Sections */}
        {Object.entries(groupedByTool).map(([toolName, projects]) => {
          const toolCfg = getToolConfig(toolName);
          const isCollapsed = collapsedTools[toolName];
          const totalDocs = Object.values(projects).reduce((s, arr) => s + arr.length, 0);

          return (
            <div key={toolName} className="mb-12">
              <button onClick={() => toggleTool(toolName)} className="w-full flex items-center gap-3 mb-5">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm flex-shrink-0"
                  style={{ background: toolCfg.bg, borderColor: toolCfg.color + "44", color: toolCfg.color }}
                >
                  {toolCfg.Icon ? <toolCfg.Icon size={15} /> : <FileText size={15} />}
                  {toolCfg.label}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>

              {!isCollapsed && Object.entries(projects).map(([projectName, projectDocs]) => (
                <div key={projectName} className="mb-8 pl-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-3 h-3 text-gray-500" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-700">{projectName}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {projectDocs.length} doc{projectDocs.length !== 1 ? "s" : ""}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projectDocs.map((doc) => {
                      const docKey = doc.id || doc._id || doc.project_id + doc.template_name;
                      const isHovered = hoveredDoc === docKey;
                      const dlKey = doc.project_id + doc.template_name;
                      const dlState = downloadingMap[dlKey];
                      const displayName = resolveTemplateName(doc);

                      const source = resolveToolName(doc).toLowerCase();
                      const viewLink = `/documents/${encodeURIComponent(doc.template_name)}?projectId=${doc.project_id}&boardName=${encodeURIComponent(projectName)}&source=${source}${doc.team_id ? `&teamId=${doc.team_id}` : ""}${doc.workspace_id ? `&workspaceId=${doc.workspace_id}` : ""}`;
                      
                      return (
                        <div
                          key={docKey}
                          onMouseEnter={() => setHoveredDoc(docKey)}
                          onMouseLeave={() => setHoveredDoc(null)}
                          className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                          style={{
                            boxShadow: isHovered
                              ? `0 8px 28px ${cardGlow}, 0 1px 4px rgba(0,0,0,0.05)`
                              : "0 1px 3px rgba(0,0,0,0.04)",
                            transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                          }}
                        >
                          {/* Tool-colored top accent */}
                          <div
                            className="h-0.5 w-full transition-opacity duration-200"
                            style={{ background: `linear-gradient(to right, ${toolCfg.color}, #a855f7)`, opacity: isHovered ? 1 : 0 }}
                          />

                          <div className="p-5 flex flex-col flex-1">
                            {/* Card header */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: toolCfg.bg }}>
                                {toolCfg.Icon
                                  ? <toolCfg.Icon size={18} style={{ color: toolCfg.color }} />
                                  : <FileText className="w-4 h-4" style={{ color: toolCfg.color }} />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-gray-900 text-base leading-tight truncate">{displayName}</h4>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{projectName}</p>
                              </div>
                            </div>
                            {/* Version badge */}
                            <span className={`self-start text-xs px-2 py-0.5 rounded-full font-semibold mb-3 border ${doc.is_latest ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              v{doc.version ?? "—"}{doc.is_latest ? " · current" : ""}
                            </span>
                            {/* Creator name */}
                            {doc.created_by_name && (
                              <p className="text-xs text-gray-400 mb-2">
                                Generated by <span className="font-semibold text-gray-600">{doc.created_by_name}</span>
                              </p>
                            )}

                            {/* Preview */}
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1 mb-4">
                              {doc.generated_docs
                                ? doc.generated_docs.replace(/[#*_`]/g, "").slice(0, 100) + "…"
                                : "No content preview available."}
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-gray-100">
                              {/* View + History row */}
                              <div className="flex items-center gap-2">
                                <Link
                                  to={viewLink}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${cardGradient} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                                >
                                  View Doc <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  onClick={() => setSelectedDoc({
                                    project_id: doc.project_id,
                                    template_name: doc.template_name,
                                    workspace_id: doc.workspace_id,
                                  })}
                                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                  title="Version History"
                                >
                                  <History className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>

                              {/* Download row */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => downloadAsPDF(doc, setDownloadingMap)}
                                  disabled={!!dlState || !doc.generated_docs}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 py-1.5 rounded-xl text-xs font-semibold transition"
                                >
                                  {dlState === "pdf"
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : <FileDown className="w-3.5 h-3.5" />}
                                  {dlState === "pdf" ? "Generating…" : "PDF"}
                                </button>
                                <button
                                  onClick={() => downloadAsWord(doc, setDownloadingMap)}
                                  disabled={!!dlState || !doc.generated_docs}
                                  className="flex-1 inline-flex items-center justify-center gap-1.5 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 py-1.5 rounded-xl text-xs font-semibold transition"
                                >
                                  {dlState === "word"
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : <Download className="w-3.5 h-3.5" />}
                                  {dlState === "word" ? "Generating…" : "Word"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {selectedDoc && (
        <VersionHistory selectedDoc={selectedDoc} userId={userId} onClose={() => setSelectedDoc(null)} />
      )}

      <style>{`.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`}</style>
    </div>
  );
}