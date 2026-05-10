import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, RefreshCw, Send, CheckCircle2, FileDown, Download } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const parseInput = (input) => {
  const match = input.match(/Add:(.*)/i);
  const new_headings = match
    ? match[1].split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  return { user_feedback: input, new_headings };
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

// ─── Normalize inline / single-line tables ─────────────────────────────────────
// Handles: | A | B | | val1 | val2 |  (entire table on one line)
const normalizeTableText = (text) => {
  const lines = text.split("\n");
  const expanded = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // A "packed" line starts with | and has the pattern | ... | | ... |
    if (/^\|/.test(trimmed) && /\|\s*\|/.test(trimmed)) {
      // Split at boundaries where a closing | is followed by whitespace then another opening |
      const rows = trimmed.split(/(?<=\|)\s*(?=\|[^|])/);
      rows.forEach((r) => { if (r.trim()) expanded.push(r.trim()); });
    } else {
      expanded.push(line);
    }
  }

  return expanded.join("\n");
};

// ─── Parse raw markdown into typed blocks ─────────────────────────────────────
const processRawContent = (text) => {
  const normalized = normalizeTableText(text);
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

  // Ensure every table has a separator row (required by remark-gfm)
  const ensureSeparator = (tableContent) => {
    const rows = tableContent.trim().split("\n");
    if (rows.length >= 2 && /^[\s|:-]+$/.test(rows[1])) return tableContent;
    const cols = (rows[0].match(/\|/g) || []).length - 1;
    const sep = "| " + Array(Math.max(cols, 1)).fill("---").join(" | ") + " |";
    return [rows[0], sep, ...rows.slice(1)].join("\n");
  };

  const result = [];
  blocks.forEach((block, bi) => {
    if (block.type === "table") {
      result.push({ id: `table-${bi}`, type: "table", content: ensureSeparator(block.content) });
    } else {
      applyFormatting(block.content).forEach((item) =>
        result.push({ ...item, id: `${bi}-${item.id}` })
      );
    }
  });

  return result;
};

const applyFormatting = (text) =>
  text
    .split(/\n+/)
    .filter((l) => l.trim() && l.trim() !== "---")
    .map((line, idx) => {
      const trimmed = line.trim();
      const clean = trimmed.replace(/[*_`#]/g, "").trim();
      if (/^\d+\./.test(trimmed)) return { id: idx, text: clean.replace(/^\d+\.\s*/, ""), type: "list-number" };
      if (/^[-*]\s+/.test(trimmed)) return { id: idx, text: clean.replace(/^[-*]\s+/, ""), type: "list-bullet" };
      if (/^#/.test(trimmed)) {
        const level = trimmed.match(/^#+/)[0].length;
        return { id: idx, text: clean.replace(/^#+\s*/, ""), type: `h${Math.min(level, 4)}` };
      }
      return { id: idx, text: clean, type: "text" };
    });

// ─── Render typed blocks into JSX ─────────────────────────────────────────────
const RenderFormattedContent = ({ formattedContent }) => {
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

  return (
    <>
      {elements.map((item, i) => {
        if (item.type === "table") return (
          <ReactMarkdown key={item.id} remarkPlugins={[remarkGfm]} components={TableMarkdownComponents}>
            {item.content}
          </ReactMarkdown>
        );

        if (item.type === "ul") return (
          <ul key={i} className="my-3 space-y-2 ml-1">
            {item.items.map((li) => (
              <li key={li.id} className="flex items-start gap-2.5 text-gray-600 text-sm leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {li.text}
              </li>
            ))}
          </ul>
        );

        if (item.type === "ol") return (
          <ol key={i} className="my-3 space-y-2 ml-1">
            {item.items.map((li, n) => (
              <li key={li.id} className="flex items-start gap-3 text-gray-600 text-sm leading-relaxed">
                <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
                  {n + 1}
                </span>
                {li.text}
              </li>
            ))}
          </ol>
        );

        switch (item.type) {
          case "h1": return (
            <div key={i} className="mt-10 mb-3 first:mt-0">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{item.text}</h1>
              <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-transparent rounded-full" />
            </div>
          );
          case "h2": return (
            <h2 key={i} className="text-xl font-bold text-gray-800 mt-8 mb-2 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 inline-block flex-shrink-0" />
              {item.text}
            </h2>
          );
          case "h3": return (
            <h3 key={i} className="text-base font-semibold text-indigo-700 mt-6 mb-1.5 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {item.text}
            </h3>
          );
          case "h4": return (
            <h4 key={i} className="text-sm font-semibold text-gray-700 uppercase tracking-wider mt-4 mb-2">
              {item.text}
            </h4>
          );
          default: return (
            <p key={i} className="text-gray-600 text-sm leading-relaxed mb-3">{item.text}</p>
          );
        }
      })}
    </>
  );
};

// ─── Script loader helper ─────────────────────────────────────────────────────
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
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(el);
  });

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GeneratedDocPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const boardId =
    location.state?.boardId ||
    location.state?.repoId ||
    searchParams.get("boardId") ||
    searchParams.get("repoId");

  const userId = location.state?.userId || searchParams.get("userId");
  const templateName = location.state?.templateName || searchParams.get("templateName");
  const teamId = location.state?.teamId || searchParams.get("teamId");
  const templateKey = location.state?.doc_type || searchParams.get("doc_type");

  const source =
    location.state?.source ||
    localStorage.getItem("source") ||
    "trello";

  const selectedHeadings =
    location.state?.selectedHeadings ||
    JSON.parse(localStorage.getItem("selected_headings") || "[]");

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [interruptData, setInterruptData] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [downloading, setDownloading] = useState(null); // "pdf" | "word" | null

  const hasStarted = useRef(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const tokenQueueRef = useRef([]);
  const isTypingRef = useRef(false);
  const rawContentRef = useRef(""); // latest assistant content for downloads

  const isFinal = messages.some((m) => m.content?.includes("Document marked as FINAL"));

  // Sync rawContentRef with latest assistant message
  useEffect(() => {
    const latestDoc = [...messages].reverse().find((m) => m.role === "assistant")?.content || "";
    rawContentRef.current = latestDoc;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (interruptData && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [interruptData]);

  useEffect(() => {
    if (hasStarted.current) return;
    if (!boardId || !userId || !templateName) return;
    hasStarted.current = true;
    startWorkflow();
  }, []);

  // ── Token streaming ──────────────────────────────────────────────────────────
  const processTokenQueue = async () => {
    if (isTypingRef.current) return;
    isTypingRef.current = true;

    while (tokenQueueRef.current.length > 0) {
      const chunk = tokenQueueRef.current.shift();
      for (let i = 0; i < chunk.length; i += 2) {
        const piece = chunk.slice(i, i + 2);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content += piece;
          } else {
            updated.push({ role: "assistant", content: piece });
          }
          return [...updated];
        });
        await new Promise((r) => setTimeout(r, 15));
      }
    }

    isTypingRef.current = false;
  };

  // ── Start workflow (SSE streaming) ───────────────────────────────────────────
  
  const startWorkflow = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${BACKEND_URL}/workflow/start-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: boardId,
            user_id: userId,
            template: templateKey,
            source: source,
            team_id: teamId,
            selected_headings: selectedHeadings,
            pdf_headings: selectedHeadings,
          }),
        }
      );

      console.log("✅ Response status:", res.status);
      console.log("✅ Response ok:", res.ok);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      setMessages([
        {
          role: "assistant",
          content: "",
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();

        console.log(
          "📦 Chunk received, done:",
          done,
          "value length:",
          value?.length
        );

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        console.log("📝 Buffer:", buffer);

        const lines = buffer.split("\n");

        buffer = lines.pop();

        for (let line of lines) {
          if (!line.trim()) continue;

          console.log("📨 Raw line:", line);

          const clean = line
            .replace("data:", "")
            .trim();

          let event;

          try {
            event = JSON.parse(clean);

            console.log("✅ Parsed event:", event);
          } catch (e) {
            console.log(
              "❌ Parse failed for:",
              clean,
              e
            );

            continue;
          }

          // loading
          if (event.type === "loading") {
            setLoading(true);
          }

          // token stream
          if (event.type === "token") {
            console.log(
              "🔤 Token received:",
              event.data?.slice(0, 30)
            );

            tokenQueueRef.current.push(event.data);

            processTokenQueue();
          }

          // done
          if (event.type === "done") {
            console.log(
              "✅ DONE event received, data length:",
              event.data?.length
            );

            // ✅ empty done
            if (!event.data) {
              setLoading(false);
            }

            // ✅ subscription limit check
            if (
              event.data &&
              typeof event.data === "string" &&
              event.data.includes("SUBSCRIPTION_LIMIT")
            ) {
              setMessages([
                {
                  role: "system",
                  content:
                    "⚠️ You've reached your document limit. Please upgrade your plan.",
                },
              ]);

              setLoading(false);
              return;
            }

            setLoading(false);
          }

          // error
          if (event.type === "error") {

            console.log("❌ Stream error:", event.data);

            if (
              event.data &&
              typeof event.data === "string" &&
              event.data.includes("SUBSCRIPTION_LIMIT")
            ) {
              setMessages([
                {
                  role: "system",
                  content:
                    "⚠️ You've reached your document limit. Please upgrade your plan.",
                },
              ]);
            } else {
              setMessages([
                {
                  role: "system",
                  content:
                    "❌ Something went wrong while generating the document.",
                },
              ]);
            }

            setLoading(false);
            return;
          }

          // interrupt
          if (event.type === "interrupt") {
            console.log(
              "⚠️ Interrupt received:",
              event.data
            );

            const interruptVal =
              event.data?.value || event.data;

            setInterruptData(event.data);

            setLoading(false);

            if (
              typeof interruptVal === "object" &&
              interruptVal?.final_doc
            ) {
              setMessages([
                {
                  role: "assistant",
                  content: interruptVal.final_doc,
                },
              ]);
            }
          }
        }
      }

      console.log("🏁 Stream reading complete");
    } catch (err) {
      console.error("❌ Error:", err);

      // ✅ subscription limit
      if (
        err?.message?.includes("SUBSCRIPTION_LIMIT") ||
        err?.response?.data?.detail?.includes("SUBSCRIPTION_LIMIT")
      ) {
        setMessages([
          {
            role: "system",
            content:
              "⚠️ You've reached your document limit. Please upgrade your plan.",
          },
        ]);
      } else {
        setMessages([
          {
            role: "system",
            content:
              "❌ Failed to generate document.",
          },
        ]);
      }

      setLoading(false);
    }
  };

  // ── Finalize ─────────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    setLoading(true);
    try {
      const latestDoc =
        [...messages].reverse().find((m) => m.role === "assistant")?.content || "";

      const res = await axios.post(`${BACKEND_URL}/workflow/resume`, {
        user_id: userId,
        project_id: boardId,
        template: templateKey,
        source,
        team_id: teamId,
        final_doc: latestDoc,
        user_input: "FINALIZE",
        is_final: true,
      });

      const doc = res.data?.data?.final_doc || "";
      if (doc) setMessages((prev) => [...prev, { role: "assistant", content: doc }]);
      setMessages((prev) => [...prev, { role: "system", content: "Document marked as FINAL" }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Send Feedback ─────────────────────────────────────────────────────────────
  const handleSendFeedback = async () => {
    if (!userInput.trim()) return;
    const { user_feedback, new_headings } = parseInput(userInput);

    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setUserInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/workflow/resume`, {
        user_id: userId,
        project_id: boardId,
        template: templateKey,
        source,
        team_id: teamId,
        user_input: user_feedback,
        new_headings,
      });

      const doc = res.data?.data?.final_doc || res.data?.data?.draft_doc || "";
      if (doc) setMessages((prev) => [...prev, { role: "assistant", content: doc }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── PDF Download ──────────────────────────────────────────────────────────────
  const downloadAsPDF = async () => {
    setDownloading("pdf");
    const rawContent = rawContentRef.current;
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js", "pdfMake");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js", "_pdfFontsReady");
      window._pdfFontsReady = true;
      const pdfMake = window.pdfMake;

      const content = [];
      content.push({ text: templateName || "Document", style: "docTitle", marginBottom: 4 });
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
        const dataRows = tableRows.filter((r) => !/^[\s|:-]+$/.test(r));
        if (!dataRows.length) { tableRows = []; inTableBlock = false; return; }

        const parsed = dataRows.map((row) =>
          row.split("|").map((c) => c.trim()).filter(Boolean)
        );
        const colCount = Math.max(...parsed.map((r) => r.length));
        const isWide = colCount > 4;

        // Cell padding per col = paddingLeft(4) + paddingRight(4) = 8pt
        const CELL_PAD = 8;
        const pageUsableWidth = isWide ? 742 : 495;
        // Subtract all cell padding from total width before dividing
        const availableForText = pageUsableWidth - colCount * CELL_PAD;
        const baseColWidth = Math.floor(availableForText / colCount);
        const lastColWidth = availableForText - baseColWidth * (colCount - 1);

        const colWidths = Array(colCount).fill(baseColWidth);
        colWidths[colCount - 1] = lastColWidth;

        const pdfRows = parsed.map((cells, ri) =>
          Array.from({ length: colCount }, (_, ci) => ({
            text: (cells[ci] || "").replace(/[*_`]/g, ""),
            style: ri === 0 ? "tableHeader" : "tableCell",
            fillColor: ri === 0 ? "#4F46E5" : ri % 2 === 0 ? "#F5F3FF" : "#FFFFFF",
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
          content.push({ pageBreak: "before", pageOrientation: "landscape", ...tableNode });
          content.push({ text: "", pageBreak: "after", pageOrientation: "portrait" });
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
            { text: templateName || "Document", style: "headerLeft", margin: [50, 20, 0, 0] },
          ],
        }),
        footer: (currentPage, pageCount) => ({
          columns: [
            { text: `${currentPage} / ${pageCount}`, style: "footerText", alignment: "right", margin: [0, 10, 50, 0] },
          ],
        }),
        content,
        styles: {
          docTitle: { fontSize: 22, bold: true, color: "#111827" },
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

      const fileName = (templateName || "Document").replace(/\s+/g, "_") + ".pdf";
      pdfMake.createPdf(docDef).download(fileName);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("❌ Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  // ── Word Download ─────────────────────────────────────────────────────────────
  const downloadAsWord = async () => {
    setDownloading("word");
    const rawContent = rawContentRef.current;
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip");
      const JSZip = window.JSZip;

      const esc = (s) =>
        String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      const stripInline = (s) => s.replace(/[*_`]/g, "").trim();

      const xmlParts = [];

      xmlParts.push(`
        <w:p>
          <w:pPr><w:pStyle w:val="Title"/><w:jc w:val="left"/></w:pPr>
          <w:r><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="111827"/></w:rPr>
            <w:t>${esc(templateName || "Document")}</w:t>
          </w:r>
        </w:p>`);

      xmlParts.push(`
        <w:p>
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
        const dataRows = tableBuffer.filter((r) => !/^[\s|:-]+$/.test(r.trim()));
        if (!dataRows.length) { tableBuffer = []; inTableBlock = false; return; }

        const parsed = dataRows.map((row) => row.split("|").map((c) => c.trim()).filter(Boolean));
        const colCount = Math.max(...parsed.map((r) => r.length));
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
            const fill = ri === 0 ? "4F46E5" : ri % 2 === 0 ? "F5F3FF" : "FFFFFF";
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
        tableBuffer = [];
        inTableBlock = false;
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\s*\|/.test(trimmed)) { inTableBlock = true; tableBuffer.push(trimmed); continue; }
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
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

      const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/><w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="818CF8"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/><w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
      <w:rPr><w:sz w:val="20"/><w:color w:val="4B5563"/></w:rPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault>
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
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"    Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
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
      a.download = (templateName || "Document").replace(/\s+/g, "_") + ".docx";
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

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading && messages.length === 0)
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
        </div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Generating your document…</p>
          <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
        </div>
      </div>
    );

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 pt-8 pb-6 flex flex-col flex-1 min-h-0">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                Generated Document
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
              {templateName || "Document"}
            </h1>
          </div>

          {/* Download buttons — shown as soon as there's content */}
          {isFinal && (
            <div className="flex items-center gap-2 mt-1 flex-shrink-0">
              <button
                onClick={downloadAsPDF}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                {downloading === "pdf"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <FileDown className="w-4 h-4" />}
                {downloading === "pdf" ? "Generating…" : "PDF"}
              </button>
              <button
                onClick={downloadAsWord}
                disabled={!!downloading}
                className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                {downloading === "word"
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : <Download className="w-4 h-4" />}
                {downloading === "word" ? "Generating…" : "Word"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex-shrink-0" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 min-h-0">
            {messages.map((msg, i) => {
              // ── Assistant message: full formatting ──
              if (msg.role === "assistant") {
                const formattedContent = processRawContent(msg.content);
                return (
                  <div key={i} className="doc-content">
                    <RenderFormattedContent formattedContent={formattedContent} />
                  </div>
                );
              }

              // ── System message (status banners) ──
              if (msg.role === "system")
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium border ${msg.content.includes("FINAL")
                      ? "bg-green-50 border-green-100 text-green-700"
                      : "bg-amber-50 border-amber-100 text-amber-700"
                      }`}
                  >
                    {msg.content.includes("FINAL") ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <RefreshCw className="w-4 h-4 flex-shrink-0" />
                    )}
                    {msg.content}
                  </div>
                );

              // ── User message (feedback bubble) ──
              if (msg.role === "user")
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[75%] bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                );

              return null;
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                AI is thinking…
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex flex-col gap-3">

            {interruptData && !isFinal && (
              <div className="flex justify-end">
                <button
                  onClick={handleFinalize}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Final
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isFinal || loading}
                placeholder={
                  isFinal
                    ? "Document finalized. Use the download buttons above to export."
                    : "Write feedback… or type Add: heading1, heading2 to add sections"
                }
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && userInput.trim()) handleSendFeedback();
                }}
              />
              <button
                onClick={handleSendFeedback}
                disabled={loading || isFinal || !userInput.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}