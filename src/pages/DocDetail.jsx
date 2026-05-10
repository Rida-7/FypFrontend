import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, FileText, RefreshCw, Download, FileDown } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ─── Template name display map ────────────────────────────────────────────────
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

// Case-insensitive lookup — handles "SprintReport", "sprintreport", "SPRINTREPORT", etc.
const getTemplatDisplayName = (key) => {
  if (!key) return "Document";
  const normalized = key.replace(/[\s_-]/g, "").toLowerCase();
  return TEMPLATE_NAME_MAP[normalized] || key;
};

// ─── Table-only markdown components ───────────────────────────────────────────
const TableMarkdownComponents = {
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gradient-to-r from-indigo-600 to-purple-600">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-indigo-50/40 transition-colors duration-150">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-gray-700 text-sm align-top">{children}</td>
  ),
  p: ({ children }) => <>{children}</>,
  h1: () => null, h2: () => null, h3: () => null,
  ul: () => null, ol: () => null, li: () => null,
  hr: () => null, blockquote: () => null,
};

export default function DocumentDetail() {
  const { template_name } = useParams();
  const templateName = template_name;
  // Friendly display name resolved from map (case-insensitive)
  const displayName = getTemplatDisplayName(templateName);

  const [searchParams] = useSearchParams();
  const [rawContent, setRawContent] = useState("");
  const [formattedContent, setFormattedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [improving, setImproving] = useState(false);
  const [downloading, setDownloading] = useState(null); // "pdf" | "word" | null

  const source = searchParams.get("source");
  const teamId = searchParams.get("teamId");

  const getUserId = () => {
    const raw = localStorage.getItem("userId");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" ? parsed._id : parsed;
    } catch { return raw; }
  };

  const userId = getUserId();
  const projectId = searchParams.get("projectId");
  const boardName = searchParams.get("boardName") || projectId;
  const sprintName = searchParams.get("sprintName") || "";

  useEffect(() => {
    if (!userId || !projectId || !templateName) return;
    fetchGeneratedDoc();
  }, [userId, projectId, templateName]);

  const fetchGeneratedDoc = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/workflow/generated`, {
        params: { user_id: userId, project_id: projectId, template_name: templateName, source, team_id: teamId },
      });
      if (res.data.status === "success") {
        processContent(res.data.generated_docs);
      } else {
        setFormattedContent([{ text: "No document found.", type: "error" }]);
      }
    } catch (err) {
      console.error("Error fetching doc:", err);
      setFormattedContent([{ text: "Error loading document.", type: "error" }]);
    } finally {
      setLoading(false);
    }
  };

  const improveDocument = async () => {
    if (!feedback.trim()) { alert("Please enter feedback first"); return; }
    setImproving(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/workflow/improve-with-feedback`, {
        user_id: userId,
        project_id: projectId,
        template_name: templateName,
        feedback,
        board_name: boardName,
      });
      if (res.data.status === "success") {
        processContent(res.data.generated_docs);
        setFeedback("");
        alert("✅ Document improved!");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to improve document");
    } finally {
      setImproving(false);
    }
  };

  // ─── Normalize inline tables ──────────────────────────────────────────────
  const normalizeText = (text) =>
    text.replace(/(\|[^|\n]+(?:\|[^|\n]*)+\|)\s*\|\s*/g, (match, row) => row + "\n| ");

  // ─── Parse markdown into blocks ───────────────────────────────────────────
  const processContent = (text) => {
    setRawContent(text);
    const normalized = normalizeText(text);
    const lines = normalized.split("\n");
    const blocks = [];
    let currentNonTable = [];
    let currentTable = [];
    let inTable = false;
    const isTableLine = (l) => /^\s*\|/.test(l.trim());

    lines.forEach((line) => {
      if (isTableLine(line)) {
        if (!inTable) {
          if (currentNonTable.length) {
            blocks.push({ type: "text", content: currentNonTable.join("\n") });
            currentNonTable = [];
          }
          inTable = true;
        }
        currentTable.push(line);
      } else {
        if (inTable) {
          blocks.push({ type: "table", content: currentTable.join("\n") });
          currentTable = [];
          inTable = false;
        }
        currentNonTable.push(line);
      }
    });

    if (currentTable.length) blocks.push({ type: "table", content: currentTable.join("\n") });
    if (currentNonTable.length) blocks.push({ type: "text", content: currentNonTable.join("\n") });

    const ensureSeparator = (tableContent) => {
      const rows = tableContent.trim().split("\n");
      if (rows.length >= 2 && /^[\s|:-]+$/.test(rows[1])) return tableContent;
      const cols = (rows[0].match(/\|/g) || []).length - 1;
      const sep = "| " + Array(cols).fill("---").join(" | ") + " |";
      return [rows[0], sep, ...rows.slice(1)].join("\n");
    };

    const result = [];
    blocks.forEach((block, bi) => {
      if (block.type === "table") {
        result.push({ id: `table-${bi}`, type: "table", content: ensureSeparator(block.content) });
      } else {
        const formatted = applyFormatting(block.content);
        formatted.forEach((item) => result.push({ ...item, id: `${bi}-${item.id}` }));
      }
    });

    setFormattedContent(result);
  };

  const applyFormatting = (text) =>
    text
      .split(/\n+/)
      .filter((l) => l.trim() && l.trim() !== "---")
      .map((line, idx) => {
        const clean = line.replace(/[*_`#]/g, "").trim();
        if (/^\d+\./.test(line)) return { id: idx, text: clean.replace(/^\d+\.\s*/, ""), type: "list-number" };
        if (/^[-*]\s+/.test(line)) return { id: idx, text: clean.replace(/^[-*]\s+/, ""), type: "list-bullet" };
        if (/^#/.test(line)) {
          const level = line.match(/^#+/)[0].length;
          return { id: idx, text: clean.replace(/^#+\s*/, ""), type: `h${level}` };
        }
        return { id: idx, text: clean, type: "text" };
      });

  // ─── Helper: inject a <script> tag and wait for it to load ──────────────
  const loadScript = (src, globalCheck) =>
    new Promise((resolve, reject) => {
      if (window[globalCheck]) { resolve(); return; }
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { existing.addEventListener("load", resolve); existing.addEventListener("error", reject); return; }
      const el = document.createElement("script");
      el.src = src;
      el.onload = resolve;
      el.onerror = () => reject(new Error(`Failed to load: ${src}`));
      document.head.appendChild(el);
    });

  // ─── PDF Download ─────────────────────────────────────────────────────────
  const downloadAsPDF = async () => {
    setDownloading("pdf");
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js", "pdfMake");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js", "_pdfFontsReady");
      window._pdfFontsReady = true;
      const pdfMake = window.pdfMake;

      const metaParts = [];
      if (boardName) metaParts.push(`Project: ${boardName}`);
      if (sprintName) metaParts.push(`Sprint: ${sprintName}`);

      const content = [];

      // Title uses displayName instead of raw templateName
      content.push({ text: displayName, style: "docTitle", marginBottom: 4 });
      if (metaParts.length) {
        content.push({ text: metaParts.join("   ·   "), style: "meta", marginBottom: 12 });
      }
      content.push({
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 495, y2: 0, lineWidth: 1, lineColor: "#C7D2FE" }],
        marginBottom: 16,
      });

      const lines = rawContent.split("\n");
      let tableRows = [];
      let inTableBlock = false;

      const flushTable = () => {
        if (!tableRows.length) return;
        const dataRows = tableRows.filter(r => !/^[\s|:-]+$/.test(r));
        if (!dataRows.length) { tableRows = []; inTableBlock = false; return; }

        const parsed = dataRows.map(row =>
          row.split("|").map(c => c.trim()).filter(Boolean)
        );
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
          table: {
            headerRows: 1,
            widths: colWidths,
            body: pdfRows,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => "#E5E7EB",
            vLineColor: () => "#E5E7EB",
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3,
          },
          marginBottom: 12,
        };

        if (isWide) {
          content.push({ ...tableNode, pageOrientation: "landscape", pageBreak: "before" });
          content.push({ text: "", pageOrientation: "portrait", pageBreak: "after" });
        } else {
          content.push(tableNode);
        }

        tableRows = [];
        inTableBlock = false;
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
        header: () => ({
          columns: [
            // Header also uses displayName
            { text: displayName, style: "headerLeft", margin: [50, 20, 0, 0] },
            { text: metaParts.join(" · "), style: "headerRight", alignment: "right", margin: [0, 20, 50, 0] },
          ],
        }),
        footer: (currentPage, pageCount) => ({
          columns: [
            { text: metaParts.join(" · "), style: "footerText", margin: [50, 10, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, style: "footerText", alignment: "right", margin: [0, 10, 50, 0] },
          ],
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
          headerRight: { fontSize: 8, color: "#9CA3AF" },
          footerText: { fontSize: 8, color: "#9CA3AF" },
        },
        defaultStyle: { font: "Roboto" },
      };

      // File name also uses displayName
      const fileName = [displayName, boardName, sprintName]
        .filter(Boolean).join("_").replace(/\s+/g, "_") + ".pdf";
      pdfMake.createPdf(docDef).download(fileName);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("❌ Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  // ─── Word Download ────────────────────────────────────────────────────────
  const downloadAsWord = async () => {
    setDownloading("word");
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip");
      const JSZip = window.JSZip;

      const esc = (s) => String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      const stripInline = (s) => s.replace(/[*_`]/g, "").trim();

      const metaParts = [];
      if (boardName) metaParts.push(`Project: ${boardName}`);
      if (sprintName) metaParts.push(`Sprint: ${sprintName}`);
      const metaStr = metaParts.join("   ·   ");

      const xmlParts = [];

      // Title paragraph uses displayName
      xmlParts.push(`
        <w:p>
          <w:pPr><w:pStyle w:val="Title"/><w:jc w:val="left"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="111827"/></w:rPr>
            <w:t>${esc(displayName)}</w:t>
          </w:r>
        </w:p>`);

      if (metaStr) {
        xmlParts.push(`
          <w:p>
            <w:pPr><w:spacing w:after="160"/></w:pPr>
            <w:r><w:rPr><w:i/><w:sz w:val="20"/><w:color w:val="6B7280"/></w:rPr>
              <w:t>${esc(metaStr)}</w:t>
            </w:r>
          </w:p>`);
      }

      xmlParts.push(`
        <w:p>
          <w:pPr>
            <w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C7D2FE"/></w:pBdr>
            <w:spacing w:after="240"/>
          </w:pPr>
        </w:p>`);

      const lines = rawContent.split("\n");
      let tableBuffer = [];
      let inTableBlock = false;

      const flushTable = () => {
        if (!tableBuffer.length) return;
        const dataRows = tableBuffer.filter(r => !/^[\s|:-]+$/.test(r.trim()));
        if (!dataRows.length) { tableBuffer = []; inTableBlock = false; return; }

        const parsed = dataRows.map(row => row.split("|").map(c => c.trim()).filter(Boolean));
        const colCount = Math.max(...parsed.map(r => r.length));
        const colW = Math.floor(8640 / colCount);

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
                <w:tcW w:w="${colW}" w:type="dxa"/>
                <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
                <w:tcMar>
                  <w:top    w:w="80"  w:type="dxa"/>
                  <w:bottom w:w="80"  w:type="dxa"/>
                  <w:left   w:w="120" w:type="dxa"/>
                  <w:right  w:w="120" w:type="dxa"/>
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

        if (/^\s*\|/.test(trimmed)) {
          inTableBlock = true; tableBuffer.push(trimmed); continue;
        }
        if (inTableBlock) flushTable();
        if (!trimmed || trimmed === "---") continue;

        if (/^###\s/.test(trimmed)) {
          const txt = esc(stripInline(trimmed.replace(/^###\s*/, "")));
          xmlParts.push(`<w:p>
            <w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="200" w:after="80"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);

        } else if (/^##\s/.test(trimmed)) {
          const txt = esc(stripInline(trimmed.replace(/^##\s*/, "")));
          xmlParts.push(`<w:p>
            <w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="280" w:after="120"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F2937"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);

        } else if (/^#\s/.test(trimmed)) {
          const txt = esc(stripInline(trimmed.replace(/^#\s*/, "")));
          xmlParts.push(`<w:p>
            <w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="360" w:after="160"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);

        } else if (/^[-*]\s+/.test(trimmed)) {
          const txt = esc(stripInline(trimmed.replace(/^[-*]\s+/, "")));
          xmlParts.push(`<w:p>
            <w:pPr>
              <w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>
              <w:spacing w:after="60"/>
            </w:pPr>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);

        } else if (/^\d+\.\s+/.test(trimmed)) {
          const txt = esc(stripInline(trimmed.replace(/^\d+\.\s+/, "")));
          xmlParts.push(`<w:p>
            <w:pPr>
              <w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>
              <w:spacing w:after="60"/>
            </w:pPr>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);

        } else {
          const txt = esc(stripInline(trimmed));
          xmlParts.push(`<w:p>
            <w:pPr><w:spacing w:after="120"/></w:pPr>
            <w:r><w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
              <w:t xml:space="preserve">${txt}</w:t>
            </w:r>
          </w:p>`);
        }
      }
      if (inTableBlock) flushTable();

      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
<w:body>
${xmlParts.join("\n")}
<w:sectPr>
  <w:headerReference w:type="default" r:id="rId10"/>
  <w:footerReference w:type="default" r:id="rId11"/>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

      // Word header also uses displayName
      const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="E0E7FF"/></w:pBdr>
      <w:jc w:val="left"/>
    </w:pPr>
    <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="4F46E5"/></w:rPr>
      <w:t xml:space="preserve">${esc(displayName)}</w:t>
    </w:r>
    ${metaStr ? `<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr>
      <w:t xml:space="preserve">   ·   ${esc(metaStr)}</w:t>
    </w:r>` : ""}
  </w:p>
</w:hdr>`;

      const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="right"/></w:pPr>
    ${metaStr ? `<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr>
      <w:t xml:space="preserve">${esc(metaStr)}   </w:t></w:r>` : ""}
    <w:fldSimple w:instr=" PAGE ">
      <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>1</w:t></w:r>
    </w:fldSimple>
    <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t xml:space="preserve"> / </w:t></w:r>
    <w:fldSimple w:instr=" NUMPAGES ">
      <w:r><w:rPr><w:sz w:val="16"/><w:color w:val="9CA3AF"/></w:rPr><w:t>1</w:t></w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>`;

      const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="818CF8"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="111827"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="360" w:after="160"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="111827"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="280" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="1F2937"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr><w:outlineLvl w:val="2"/><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="374151"/></w:rPr>
  </w:style>
</w:styles>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"    Target="styles.xml"/>
  <Relationship Id="rId2"  Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"    Target="header1.xml"/>
  <Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"    Target="footer1.xml"/>
</Relationships>`;

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/header1.xml"   ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml"   ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
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
      zip.file("word/header1.xml", headerXml);
      zip.file("word/footer1.xml", footerXml);
      zip.file("word/_rels/document.xml.rels", relsXml);

      const blob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // File name uses displayName
      a.download = [displayName, boardName, sprintName]
        .filter(Boolean).join("_").replace(/\s+/g, "_") + ".docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Word download error:", err);
      alert("❌ Failed to generate Word document: " + err.message);
    } finally {
      setDownloading(null);
    }
  };

  // ─── Render grouped content ───────────────────────────────────────────────
  const renderGroupedContent = () => {
    const elements = [];
    let currentList = null;

    const flushList = () => {
      if (!currentList) return;
      elements.push(currentList);
      currentList = null;
    };

    formattedContent.forEach((item) => {
      if (item.type === "table") {
        flushList();
        elements.push(item);
        return;
      }
      if (item.type === "list-bullet" || item.type === "list-number") {
        if (!currentList) currentList = { type: item.type === "list-bullet" ? "ul" : "ol", items: [] };
        currentList.items.push(item);
      } else {
        flushList();
        elements.push(item);
      }
    });
    flushList();

    return elements.map((item, i) => {
      if (item.type === "table") return (
        <ReactMarkdown key={item.id} remarkPlugins={[remarkGfm]} components={TableMarkdownComponents}>
          {item.content}
        </ReactMarkdown>
      );
      if (item.type === "ul") return (
        <ul key={i} className="my-3 space-y-2 ml-1">
          {item.items.map((li) => (
            <li key={li.id} className="flex items-start gap-2.5 text-gray-600 text-[15px] leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {li.text}
            </li>
          ))}
        </ul>
      );
      if (item.type === "ol") return (
        <ol key={i} className="my-3 space-y-2 ml-1">
          {item.items.map((li, n) => (
            <li key={li.id} className="flex items-start gap-3 text-gray-600 text-[15px] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">{n + 1}</span>
              {li.text}
            </li>
          ))}
        </ol>
      );
      if (item.type === "error") return (
        <div key={i} className="flex items-center gap-3 text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium">{item.text}</div>
      );
      switch (item.type) {
        case "h1": return (
          <div key={i} className="mt-10 mb-3 first:mt-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{item.text}</h1>
            <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-transparent rounded-full" />
          </div>
        );
        case "h2": return (
          <h2 key={i} className="text-lg font-bold text-gray-800 mt-8 mb-2 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 inline-block flex-shrink-0" />
            {item.text}
          </h2>
        );
        case "h3": return <h3 key={i} className="text-base font-semibold text-gray-700 mt-5 mb-1.5">{item.text}</h3>;
        default: return <p key={i} className="text-gray-600 text-[15px] leading-relaxed mb-3">{item.text}</p>;
      }
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
        <p className="text-gray-500 font-medium">Loading document…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">

        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">Document</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={downloadAsPDF}
                disabled={!!downloading || !rawContent}
                className="inline-flex items-center gap-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                {downloading === "pdf"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <FileDown className="w-4 h-4" />}
                {downloading === "pdf" ? "Generating…" : "PDF"}
              </button>

              <button
                onClick={downloadAsWord}
                disabled={!!downloading || !rawContent}
                className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                {downloading === "word"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                {downloading === "word" ? "Generating…" : "Word"}
              </button>
            </div>
          </div>

          {/* Page title uses displayName */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mt-4">
            {displayName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {boardName && (
              <p className="text-gray-500 text-base">
                Project · <span className="font-semibold text-gray-700">{boardName}</span>
              </p>
            )}
            {sprintName && (
              <p className="text-gray-500 text-base">
                Sprint · <span className="font-semibold text-indigo-600">{sprintName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-8 py-8">{renderGroupedContent()}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
          <div className="px-8 py-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-500 inline-block flex-shrink-0" />
              Improve Document
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Give feedback and the AI will regenerate an improved version.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. make it more structured, add risks section, improve clarity…"
              className="w-full border border-gray-200 rounded-xl p-4 text-[15px] text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none transition mb-4"
              rows={4}
            />
            <button
              onClick={improveDocument}
              disabled={improving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {improving
                ? <><RefreshCw className="w-4 h-4 animate-spin" />Improving…</>
                : "Improve Document"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}