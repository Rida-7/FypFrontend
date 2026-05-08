import React, { useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { Download, ArrowRight, FileText, CheckCircle2 } from "lucide-react";

const templates = [
  { name: "WBS Template",                      file: "/templates/WBS_Template_Project.pdf",                       key: "WBS",           desc: "Work Breakdown Structure for full project planning." },
  { name: "SRS Template",                      file: "/templates/SRS_Template.pdf",                               key: "SRS",           desc: "Software Requirements Specification document." },
  { name: "Sprint Report",                     file: "/templates/Sprint_Report_Template.pdf",                     key: "SprintReport",  desc: "Summarize sprint progress, blockers, and outcomes." },
  { name: "Test Case Template",                file: "/templates/Test_Case_Template.pdf",                         key: "TestCase",      desc: "Structured test cases for QA and validation." },
  { name: "User Manual",                       file: "/templates/UserManual.pdf",                                 key: "UserManual",    desc: "End-user guide explaining system features and usage." },
  { name: "API Documentation",                 file: "/templates/API_Template.pdf",                               key: "API",           desc: "Detailed API endpoints, request/response formats, and integration guide." },
  { name: "README File",                       file: "/templates/Readme_File_Template.pdf",                       key: "ReadMe",        desc: "Project overview, setup instructions, and usage guidelines." },
  { name: "Authentication Flow Documentation", file: "/templates/Authentication_Flow_Documentation_Template.pdf", key: "authenticate",  desc: "Describes authentication architecture, flow, methods, and security handling."},
  { name: "Backend Service Documentation",     file: "/templates/Backend_Service_Documentation_Template.pdf",     key: "backend",       desc: "Covers backend architecture, APIs, configuration, security, and service structure."},
  { name: "Configuration Guide",               file: "/templates/Configuration_Guide_Template.pdf",               key: "configuration", desc: "Defines environment setup, configuration parameters, deployment settings, and dependencies."},
  { name: "Database Schema Documentation",     file: "/templates/Database_Schema_Documentation_Template.pdf",     key: "database",      desc: "Describes database structure, tables, relationships, indexing, and constraints."},
  { name: "Risk Management Report",            file: "/templates/Risk_Management_Report_Template.pdf",            key: "risk",          desc: "Identifies project risks, impact analysis, mitigation strategies, and monitoring plan."},
  { name: "Deployment Guide",                  file: "/templates/Deployment_Guide_Template.pdf",                  key: "deploy",        desc: "Step-by-step deployment process including environment setup, CI/CD, and rollback procedures."}
];

const cardTheme = {
  gradient: "from-indigo-700 to-purple-700",
  light:    "bg-indigo-50",
  text:     "text-indigo-600",
  glow:     "rgba(99,102,241,0.22)",
};

export default function TemplatesPage() {
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);

  const { boardId }      = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();


  const handleSelect = (t) => {
    setSelected(t.key);
    navigate(
      `/headings?${boardId}&templateKey=${t.key}&templateName=${encodeURIComponent(t.name)}`
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Background glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">

        {/* ── Header ── */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                Documentation
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Pick a Template
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-gray-700">
              {templates.length} templates
            </span>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          {templates.map((t) => {
            const isHovered  = hovered  === t.key;
            const isSelected = selected === t.key;
            const c          = cardTheme;

            return (
              <div
                key={t.key}
                onMouseEnter={() => setHovered(t.key)}
                onMouseLeave={() => setHovered(null)}
                className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  boxShadow: isHovered
                    ? `0 8px 30px ${c.glow}, 0 1px 4px rgba(0,0,0,0.05)`
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                {/* Accent bar */}
                <div
                  className={`h-0.5 w-full bg-gradient-to-r ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                />

                {/* PDF Preview */}
                <div className="relative h-64 bg-gray-50 border-b border-gray-100 overflow-y-auto">
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer fileUrl={t.file} defaultScale={0.45} theme="light" />
                  </Worker>

                  {isSelected && (
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white border border-green-200 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selected
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-9 h-9 rounded-xl ${c.light} flex items-center justify-center`}>
                      <FileText className={`w-4 h-4 ${c.text}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{t.name}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{t.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelect(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${c.gradient} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                    >
                      Use Template
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <a
                      href={t.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-500" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}