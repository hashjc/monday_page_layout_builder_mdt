import React, { useState, useEffect, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { getAllBoards } from "./hooks/boards";
import { getBoardColumns, getChildBoards } from "./hooks/boardMetadata";
import { PAGELAYOUTSECTION_BOARDID } from "./config_constants";
import {
    PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS,
    PAGELAYOUT_COL_TITLE_CHILD_BOARDS,
    PAGELAYOUTSECTION_COLUMN_TITLE_VALIDATION_RULES,
} from "./config_constants";
import { getPageLayoutSectionRecords } from "./hooks/pageLayoutBuilderUtils";
import { getOperatorsForType, operatorNeedsValue } from "./fieldVisibilityConfig";
import {
    makeRuleId, makeRowId,
    ARITHMETIC_OPS, COMPARISON_OPS,
    NUMERIC_COL_TYPES, DATE_COL_TYPES, STRING_COL_TYPES,
    getComparisonOpsForType, comparisonOpNeedsValue,
    buildExpressionFromSimpleRows,
    validateExpression,
} from "./formValidationConfig";

import "./App.css";

const monday = mondaySdk();

// ─── Constants ────────────────────────────────────────────────────────────────
const PLS_COL_TITLE_BOARDID      = PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID;
const PLS_COL_TITLE_SECTIONS     = PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS;
const PLS_COL_TITLE_CHILD_BOARDS = PAGELAYOUT_COL_TITLE_CHILD_BOARDS;
const PLS_COL_TITLE_VAL_RULES    = PAGELAYOUTSECTION_COLUMN_TITLE_VALIDATION_RULES;

// ─── Section rules UI constants ────────────────────────────────────────────────
const USER_PROFILE_FIELDS = [
    { id: "profile", label: "Profile", placeholder: "e.g. Sales" }
];

const RULE_OPERATORS = [
    { id: "equals",       label: "equals" },
    { id: "not_equals",   label: "not equals" },
    { id: "contains",     label: "contains" },
    { id: "not_contains", label: "not contains" },
];

// ─── Inline SVG Icons ─────────────────────────────────────────────────────────
const Icon = {
    Search: () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    Chevron: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Board: () => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.4" />
            <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
    ),
    Plus: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    Trash: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M2 3.5h10M4.5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5 6v4M9 6v4M2.5 3.5l.7 7a1 1 0 001 .9h3.6a1 1 0 001-.9l.7-7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Grip: () => (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="3.5" cy="3" r="1" fill="currentColor" />
            <circle cx="8.5" cy="3" r="1" fill="currentColor" />
            <circle cx="3.5" cy="6" r="1" fill="currentColor" />
            <circle cx="8.5" cy="6" r="1" fill="currentColor" />
            <circle cx="3.5" cy="9" r="1" fill="currentColor" />
            <circle cx="8.5" cy="9" r="1" fill="currentColor" />
        </svg>
    ),
    Save: () => (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 2h8.5L13 4.5V13a1 1 0 01-1 1H3a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="4.5" y="8.5" width="6" height="4.5" rx=".5" stroke="currentColor" strokeWidth="1.2" />
            <rect x="4.5" y="2" width="5" height="3.5" rx=".5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    Link: () => (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
                d="M5 8.5L8.5 5M7 3h3v3M6 10H3a1 1 0 01-1-1V3a1 1 0 011-1h3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Check: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Eye: () => (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 3C4.5 3 2 5.5 1 7.5c1 2 3.5 4.5 6.5 4.5s5.5-2.5 6.5-4.5c-1-2-3.5-4.5-6.5-4.5z"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
    ),
    EyeOff: () => (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M1 1l13 13M6.3 6.4a2 2 0 002.7 2.6M3.7 3.8C2.2 4.9 1 6.2 1 7.5c1 2 3.5 4.5 6.5 4.5 1.2 0 2.3-.3 3.3-.9M5.5 2.6C6.1 2.3 6.8 2 7.5 2c3 0 5.5 2.5 6.5 4.5-.5 1-1.3 2.1-2.3 3"
                stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Star: () => (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1l1.2 2.5H9l-1.8 1.4.7 2.6L5.5 6 3.1 7.5l.7-2.6L2 3.5h2.3z" fill="currentColor" />
        </svg>
    ),
    Gear: () => (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.3" />
            <path
                d="M12.1 9.2l.8.5a.5.5 0 010 .7l-1 1.7a.5.5 0 01-.7.1l-.9-.5a5 5 0 01-1.1.6l-.1 1a.5.5 0 01-.5.4H7a.5.5 0 01-.5-.4l-.1-1a5 5 0 01-1.1-.6l-.9.5a.5.5 0 01-.7-.1L2.7 10.4a.5.5 0 010-.7l.8-.5A5.1 5.1 0 013.4 8a5.1 5.1 0 01.1-1.2l-.8-.5a.5.5 0 010-.7l1-1.7a.5.5 0 01.7-.1l.9.5A5 5 0 016.4 3.8l.1-1A.5.5 0 017 2.3h1.9a.5.5 0 01.5.4l.1 1a5 5 0 011.1.6l.9-.5a.5.5 0 01.7.1l1 1.7a.5.5 0 010 .7l-.8.5c.1.4.1.8.1 1.2s0 .8-.1 1.2z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Close: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    ),

};

// ─── Column type metadata ─────────────────────────────────────────────────────
const COL_TYPE_META = {
    name:           { color: "#0073ea", label: "Name" },
    text:           { color: "#6c8ebf", label: "Text" },
    long_text:      { color: "#6c8ebf", label: "Long Text" },
    numbers:        { color: "#fdab3d", label: "Numbers" },
    status:         { color: "#00c875", label: "Status" },
    dropdown:       { color: "#9d99b9", label: "Dropdown" },
    date:           { color: "#7e3b8a", label: "Date" },
    people:         { color: "#ff7575", label: "People" },
    board_relation: { color: "#0073ea", label: "Connect Boards" },
    checkbox:       { color: "#00c875", label: "Checkbox" },
    email:          { color: "#fdab3d", label: "Email" },
    phone:          { color: "#fdab3d", label: "Phone" },
    formula:        { color: "#9d99b9", label: "Formula" },
    mirror:         { color: "#9d99b9", label: "Mirror" },
    doc:            { color: "#6c8ebf", label: "Doc" },
    link:           { color: "#0073ea", label: "Link" },
    rating:         { color: "#fdab3d", label: "Rating" },
    file:          { color: "#6c8ebf", label: "Files" },
    tags:           { color: "#333",    label: "Tags" },
    timeline:       { color: "#0073ea", label: "Timeline" },
    dependency:     { color: "#7e3b8a", label: "Dependency" },
};
const getTypeMeta = (type) => COL_TYPE_META[type] || { color: "#9d99b9", label: type };

// ─── Section / field helpers ──────────────────────────────────────────────────
let _sc = 1;
const makeSectionId = () => `s_${Date.now()}_${_sc++}`;

const makeSection = (title, order) => ({
    id:        makeSectionId(),
    title:     title || `Section ${_sc - 1}`,
    order:     order ?? _sc - 1,
    isDefault: "false",
    rows:      [[null, null]],
});

// Types that support maxValues (relation / people)
const MAX_VALUES_TYPES = new Set(["board_relation", "people"]);
// Types that support maxFiles
const MAX_FILES_TYPES  = new Set(["file"]);

/** Convert a section's rows + requiredSet → flat fields array (for JSON storage) */
const rowsToFields = (rows, requiredSet, fieldVisRules = {}, fieldConfigs = {}) =>
    rows.flatMap((row) =>
        row.filter(Boolean).map((col) => {
            const cfg = fieldConfigs[col.id] || {};
            const field = {
                id: `field_${col.id}`,
                columnId: col.id,
                type: col.type,
                isRequired: requiredSet.has(col.id) ? "true" : "false",
            };
            // maxValues — default 1000 for relation/people types
            if (MAX_VALUES_TYPES.has(col.type)) {
                field.maxValues = (cfg.maxValues !== undefined && cfg.maxValues !== "") ? Number(cfg.maxValues) : 1000;
            }
            // maxFiles — default 10 for file type
            if (MAX_FILES_TYPES.has(col.type)) {
                field.maxFiles = (cfg.maxFiles !== undefined && cfg.maxFiles !== "") ? Number(cfg.maxFiles) : 10;
            }
            // helptext
            if (cfg.helptext && cfg.helptext.trim()) {
                field.helptext = cfg.helptext.trim();
            }
            // Embed field-level visibility rules if any defined
            const vr = fieldVisRules[col.id];
            if (vr && Array.isArray(vr.conditions) && vr.conditions.length > 0) {
                field.visibilityRules = {
                    conditions: vr.conditions,
                    criteria: vr.criteria || "ALL",
                };
            }
            return field;
        }),
    );

/** Rebuild rows from a saved fields array using columnsMap */
const fieldsToRows = (fields, columnsMap) => {
    const rows = [];
    for (let i = 0; i < fields.length; i += 2) {
        const a = columnsMap[fields[i]?.columnId] || null;
        const b = columnsMap[fields[i + 1]?.columnId] || null;
        rows.push([a, b]);
    }
    if (rows.length === 0) rows.push([null, null]);
    return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON SERIALISATION / DESERIALISATION
// ─────────────────────────────────────────────────────────────────────────────

function serialiseSectionsJSON(sections, requiredFields, sectionRules, fieldVisRules = {}, fieldConfigs = {}) {
    const payload = sections.map((sec, idx) => {
        const fields = rowsToFields(sec.rows, requiredFields, fieldVisRules, fieldConfigs);

        const rawRules = sectionRules[sec.id] || { rules: [], criteria: "ALL" };
        const conditions = (rawRules.rules || []).map((r, i) => ({
            id: r.id || `rule_${sec.id}_${i}`,
            field: r.field,
            operator: r.operator,
            value: r.value,
        }));

        return {
            id: sec.id,
            title: sec.title,
            order: idx + 1,
            fields,
            rules: {
                conditions,
                criteria: rawRules.criteria || "ALL",
            },
        };
    });

    return JSON.stringify(payload);
}

function deserialiseSectionsJSON(raw, columnsMap) {
    if (!raw || !raw.trim()) return null;

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        console.warn("[PLB] Could not parse SECTIONS JSON:", e);
        return null;
    }

    const sectionsData = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.sections)
            ? parsed.sections
            : null;

    if (!sectionsData || sectionsData.length === 0) return null;

    const placed      = new Set();
    const required    = new Set();
    const rulesMap    = {};
    const visRulesMap = {};
    const fieldConfigsMap = {}; // { [columnId]: { helptext?, maxValues?, maxFiles? } }

    const sections = sectionsData
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((sec) => {
            const fields = Array.isArray(sec.fields) ? sec.fields : [];
            const rows   = fieldsToRows(fields, columnsMap);

            const lastRow = rows[rows.length - 1];
            if (lastRow && (lastRow[0] !== null || lastRow[1] !== null)) {
                rows.push([null, null]);
            }

            rows.forEach((row) =>
                row.forEach((col) => {
                    if (!col) return;
                    placed.add(col.id);
                    const fieldDef = fields.find((f) => f.columnId === col.id);
                    if (fieldDef?.isRequired === "true") required.add(col.id);
                    // Restore field config (helptext, maxValues, maxFiles)
                    const cfg = {};
                    if (fieldDef?.helptext)  cfg.helptext  = fieldDef.helptext;
                    if (fieldDef?.maxValues !== undefined) cfg.maxValues = fieldDef.maxValues;
                    if (fieldDef?.maxFiles  !== undefined) cfg.maxFiles  = fieldDef.maxFiles;
                    if (Object.keys(cfg).length > 0) fieldConfigsMap[col.id] = cfg;
                    // Restore visibility rules
                    if (fieldDef?.visibilityRules?.conditions?.length) {
                        visRulesMap[col.id] = {
                            conditions: fieldDef.visibilityRules.conditions,
                            criteria:   fieldDef.visibilityRules.criteria || "ALL",
                        };
                    }
                }),
            );

            const storedRules = sec.rules || {};
            const builderRules = {
                rules: (storedRules.conditions || []).map((c) => ({
                    id:       c.id,
                    field:    c.field,
                    operator: c.operator,
                    value:    c.value,
                })),
                criteria: storedRules.criteria || "ALL",
            };
            rulesMap[sec.id] = builderRules;

            return {
                id:        sec.id || makeSectionId(),
                title:     sec.title || "Untitled Section",
                order:     sec.order ?? 0,
                isDefault: "false",
                rows,
            };
        });

    return {
        sections,
        requiredFields: required,
        placedColIds:   placed,
        sectionRules:   rulesMap,
        fieldVisibilityRules: visRulesMap,
        fieldConfigs:         fieldConfigsMap,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION RULES MODAL (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function SectionRulesModal({ section, rulesData, onSave, onClose }) {
    const [rules, setRules] = useState(() =>
        (rulesData?.rules || []).map((r, i) => ({ ...r, id: r.id || `rule_${Date.now()}_${i}` }))
    );
    //const [criteria, setCriteria] = useState(rulesData?.criteria || "ALL");
    const initCriteria = () => {
        const saved = rulesData?.criteria || "";
        const count = (rulesData?.rules || []).length;
        if (saved === "ALL") return count >= 2 ? Array.from({length: count}, (_, i) => i + 1).join(" AND ") : "";
        if (saved === "ANY") return count >= 2 ? Array.from({length: count}, (_, i) => i + 1).join(" OR ") : "";
        return saved || "";
    };
    const [criteriaExpr, setCriteriaExpr] = useState(initCriteria);
    const [criteriaErr,  setCriteriaErr]  = useState("");
    const addRule = () =>
        setRules((prev) => [...prev, { id: `rule_${Date.now()}`, field: "title", operator: "equals", value: "" }]);

    const updateRule = (id, key, val) =>
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

    const removeRule = (id) =>
        setRules((prev) => prev.filter((r) => r.id !== id));

    const handleSave = () => {
        setCriteriaErr("");
        const validRules = rules.filter((r) => r.field.trim() !== "");
        if (validRules.length >= 2) {
            const expr = criteriaExpr.trim();
            if (!expr) { setCriteriaErr("Please enter a logic expression (e.g. 1 AND (2 OR 3))."); return; }
            if (!/^[\d\sANDOR()]+$/i.test(expr)) { setCriteriaErr("Use condition numbers, AND, OR, and parentheses only."); return; }
            const nums = expr.match(/\d+/g) || [];
            for (const n of nums) {
                const idx = parseInt(n, 10);
                if (idx < 1 || idx > validRules.length) { setCriteriaErr(`Condition ${n} doesn't exist. Use numbers 1–${validRules.length}.`); return; }
            }
            let depth = 0;
            for (const ch of expr) {
                if (ch === "(") depth++;
                if (ch === ")") depth--;
                if (depth < 0) { setCriteriaErr("Unbalanced parentheses."); return; }
            }
            if (depth !== 0) { setCriteriaErr("Unbalanced parentheses."); return; }
        }
        const finalCriteria = validRules.length >= 2 ? criteriaExpr.trim().toUpperCase() : (validRules.length === 1 ? "1" : "");
        onSave({ rules: validRules, criteria: finalCriteria });
    };

    
    return (
        <div className="srm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="srm-modal">
                <div className="srm-header">
                    <div className="srm-header-left">
                        <span className="srm-header-icon"><Icon.Gear /></span>
                        <div>
                            <h2 className="srm-title">Visibility Rules</h2>
                            <p className="srm-subtitle">Section: <strong>{section.title}</strong></p>
                        </div>
                    </div>
                    <button className="srm-close" onClick={onClose}><Icon.Close /></button>
                </div>

                <div className="srm-body">
                    <p className="srm-desc">Define who sees this section based on user profile fields.</p>

                    <div className="srm-rules-list">
                        {rules.length === 0 && (
                            <div className="srm-empty-rules">No rules defined — section is visible to all users.</div>
                        )}
                        {rules.map((rule, idx) => (
                            <div key={rule.id} className="srm-rule-row">
                                <span className="srm-rule-num">{idx + 1}</span>
                                <select className="srm-select" value={rule.field} onChange={(e) => updateRule(rule.id, "field", e.target.value)}>
                                    {USER_PROFILE_FIELDS.map((f) => (
                                        <option key={f.id} value={f.id}>{f.label}</option>
                                    ))}
                                </select>
                                <select className="srm-select srm-select-op" value={rule.operator} onChange={(e) => updateRule(rule.id, "operator", e.target.value)}>
                                    {RULE_OPERATORS.map((op) => (
                                        <option key={op.id} value={op.id}>{op.label}</option>
                                    ))}
                                </select>
                                <input
                                    className="srm-input"
                                    type="text"
                                    value={rule.value}
                                    placeholder={USER_PROFILE_FIELDS.find((f) => f.id === rule.field)?.placeholder || "Value"}
                                    onChange={(e) => updateRule(rule.id, "value", e.target.value)}
                                />
                                <button className="srm-rule-remove" onClick={() => removeRule(rule.id)} title="Remove rule">
                                    <Icon.Trash />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button className="srm-add-rule" onClick={addRule}><Icon.Plus /> Add Rule</button>

                    {rules.length >= 2 && (
                        <div className="srm-criteria">
                            <span className="srm-criteria-label">Logic:</span>
                            <div className="srm-criteria-toggle" style={{ marginBottom: "6px" }}>
                                <button
                                    className="srm-criteria-btn"
                                    onClick={() => { setCriteriaExpr(rules.map((_, i) => i + 1).join(" AND ")); setCriteriaErr(""); }}
                                >
                                    ALL (AND)
                                </button>
                                <button
                                    className="srm-criteria-btn"
                                    onClick={() => { setCriteriaExpr(rules.map((_, i) => i + 1).join(" OR ")); setCriteriaErr(""); }}
                                >
                                    ANY (OR)
                                </button>
                            </div>
                            <input
                                className="srm-input"
                                type="text"
                                value={criteriaExpr}
                                placeholder="e.g. 1 AND (2 OR 3)"
                                onChange={(e) => { setCriteriaExpr(e.target.value); setCriteriaErr(""); }}
                                style={{ fontFamily: "var(--mono)", fontSize: "13px" }}
                            />
                            <div style={{ fontSize: "11px", color: "#676879", marginTop: "4px" }}>
                                Available: <code style={{ background: "#fff", border: "1px solid #d0d4e4", borderRadius: "3px", padding: "1px 5px" }}>{rules.map((_, i) => i + 1).join(", ")}</code>
                            </div>
                            {criteriaErr && (
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "#fff4f6", border: "1px solid #fac0cb", borderRadius: "6px", color: "#b82020", fontSize: "12px", marginTop: "6px" }}>
                                    <span>⚠️</span><span>{criteriaErr}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="srm-footer">
                    <button className="srm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="srm-btn-primary" onClick={handleSave}>
                        <Icon.Save /> Save Rules
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOARD SELECTOR (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function BoardSelector({ boards, loading, error, onSelect, selectedBoard }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = boards.filter((b) => {
        const q = search.toLowerCase();
        return b.name.toLowerCase().includes(q) || (b.workspace?.name || "").toLowerCase().includes(q);
    });
    const grouped = filtered.reduce((acc, b) => {
        const ws = b.workspace?.name || "No Workspace";
        if (!acc[ws]) acc[ws] = [];
        acc[ws].push(b);
        return acc;
    }, {});

    if (error)
        return (
            <div className="plb-error-box">
                <span>⚠️</span>
                <div><strong>Could not load boards</strong><p>{error}</p></div>
            </div>
        );

    return (
        <div className="bsel-wrap" ref={ref}>
            <div className={`bsel-trigger ${isOpen ? "open" : ""} ${loading ? "disabled" : ""}`} onClick={() => !loading && setIsOpen((p) => !p)}>
                {loading ? (
                    <span className="bsel-placeholder"><span className="plb-spinner-sm" /> Loading boards…</span>
                ) : selectedBoard ? (
                    <span className="bsel-value">
                        <span className="bsel-dot" />
                        <span className="bsel-name">{selectedBoard.name}</span>
                        {selectedBoard.workspace?.name && <span className="bsel-ws">{selectedBoard.workspace.name}</span>}
                    </span>
                ) : (
                    <span className="bsel-placeholder">Choose a board…</span>
                )}
                <span className={`bsel-caret ${isOpen ? "open" : ""}`}><Icon.Chevron /></span>
            </div>

            {isOpen && (
                <div className="bsel-dropdown">
                    <div className="bsel-search">
                        <Icon.Search />
                        <input autoFocus placeholder="Search boards…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="bsel-list">
                        {Object.keys(grouped).length === 0 ? (
                            <div className="bsel-empty">No boards found</div>
                        ) : (
                            Object.entries(grouped).map(([ws, wsBds]) => (
                                <div key={ws}>
                                    <div className="bsel-group-label">{ws}</div>
                                    {wsBds.map((b) => (
                                        <div
                                            key={b.id}
                                            className={`bsel-option ${selectedBoard?.id === b.id ? "active" : ""}`}
                                            onClick={() => { setIsOpen(false); setSearch(""); onSelect(b); }}
                                        >
                                            <Icon.Board />
                                            <span className="bsel-opt-name">{b.name}</span>
                                            {selectedBoard?.id === b.id && <span className="bsel-check"><Icon.Check /></span>}
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN CHIP (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function ColumnChip({ col, onDragStart }) {
    const meta = getTypeMeta(col.type);
    return (
        <div className="col-chip" draggable onDragStart={(e) => onDragStart(e, col)} title={`${col.title} · ${meta.label}`}>
            <span className="col-chip-dot" style={{ background: meta.color }} />
            <span className="col-chip-name">{col.title}</span>
            <span className="col-chip-type">{meta.label}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT FIELD
// ─────────────────────────────────────────────────────────────────────────────
function LayoutField({ col, isRequired, hasVisRules, fieldConfig, onRemove, onDragStart, onToggleRequired, onOpenVisRules, onOpenConfig }) {
    const meta = getTypeMeta(col.type);
    const stopDrag = (e) => e.stopPropagation();
    const hasConfig = !!(fieldConfig?.helptext || fieldConfig?.maxValues !== undefined || fieldConfig?.maxFiles !== undefined);

    return (
        <div
            className={`lfield ${isRequired ? "required" : ""} ${hasVisRules ? "has-vis-rules" : ""} ${hasConfig ? "has-config" : ""}`}
            draggable
            onDragStart={(e) => onDragStart(e, col)}
        >
            <span className="lfield-grip"><Icon.Grip /></span>
            <span className="lfield-dot" style={{ background: meta.color }} />
            <span className="lfield-name">{col.title}</span>
            <span className="lfield-type">{meta.label}</span>
            <button
                className={`lfield-req ${isRequired ? "on" : ""}`}
                onMouseDown={stopDrag}
                onClick={() => onToggleRequired(col.id)}
                title={isRequired ? "Mark optional" : "Mark required"}
            >
                <Icon.Star />
                <span>{isRequired ? "Required" : "Optional"}</span>
            </button>
            {/* Field config gear — help text, maxValues, maxFiles */}
            <button
                className={`lfield-config ${hasConfig ? "active" : ""}`}
                onMouseDown={stopDrag}
                onClick={(e) => { e.stopPropagation(); onOpenConfig(col); }}
                title={hasConfig ? "Edit field settings" : "Field settings"}
            >
                <Icon.Gear />
                {hasConfig && <span className="lfield-config-badge" />}
            </button>
            <button
                className={`lfield-eye ${hasVisRules ? "active" : ""}`}
                onMouseDown={stopDrag}
                onClick={(e) => { e.stopPropagation(); onOpenVisRules(col); }}
                title={hasVisRules ? "Edit visibility rules" : "Add visibility rules"}
            >
                <Icon.Eye />
                {hasVisRules && <span className="lfield-eye-badge" />}
            </button>
            <button
                className="lfield-remove"
                onMouseDown={stopDrag}
                onClick={() => onRemove(col.id)}
                title="Remove field"
            >
                <Icon.Trash />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION ROW
// ─────────────────────────────────────────────────────────────────────────────
function SectionRow({
    row, rowIndex, sectionId,
    onRemoveField, onDragStartField, onDropInSlot,
    onToggleRequired, requiredFields,
    fieldVisibilityRules, onOpenVisRules,
    fieldConfigs, onOpenConfig,
}) {
    const [overSlot, setOverSlot] = useState(null); // null | 0 | 1

    return (
        <div className="ls-row">
            {[0, 1].map((slotIdx) => {
                const col = row[slotIdx];
                const isOver = overSlot === slotIdx;

                return (
                    <div
                        key={slotIdx}
                        className={`ls-slot ${!col ? "empty" : ""} ${isOver ? "drag-over" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setOverSlot(slotIdx); }}
                        onDragLeave={(e) => {
                            // Only clear if leaving the slot entirely
                            if (!e.currentTarget.contains(e.relatedTarget)) setOverSlot(null);
                        }}
                        onDrop={(e) => { setOverSlot(null); onDropInSlot(e, sectionId, rowIndex, slotIdx); }}
                    >
                        {isOver && <div className="ls-slot-insert-indicator" />}
                        {col ? (
                            <LayoutField
                                col={col}
                                isRequired={requiredFields.has(col.id)}
                                hasVisRules={!!(fieldVisibilityRules?.[col.id]?.conditions?.length)}
                                fieldConfig={fieldConfigs?.[col.id] || null}
                                onRemove={(id) => onRemoveField(sectionId, rowIndex, slotIdx, id)}
                                onDragStart={onDragStartField}
                                onToggleRequired={onToggleRequired}
                                onOpenVisRules={onOpenVisRules}
                                onOpenConfig={onOpenConfig}
                            />
                        ) : (
                            <div className="ls-slot-hint">Drop a field here</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION
// ─────────────────────────────────────────────────────────────────────────────
function Section({
    section, onAddRow, onRemoveField, onRemoveSection, onRenameSection,
    onDragStartField, onDropInSlot, onToggleRequired, requiredFields,
    onOpenRules, sectionRulesData,
    fieldVisibilityRules, onOpenVisRules,
    fieldConfigs, onOpenConfig,
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(section.title);
    const inputRef = useRef(null);

    useEffect(() => { setTitle(section.title); }, [section.title]);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commit = () => {
        setEditing(false);
        onRenameSection(section.id, title.trim() || section.title);
    };

    const hasRules = (sectionRulesData?.rules?.length ?? 0) > 0;

    return (
        <div className="layout-section">
            <div className="ls-header">
                <div className="ls-title-area">
                    {editing ? (
                        <input
                            ref={inputRef}
                            className="ls-title-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commit();
                                if (e.key === "Escape") { setEditing(false); setTitle(section.title); }
                            }}
                        />
                    ) : (
                        <h3 className="ls-title" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
                            {section.title}
                        </h3>
                    )}
                </div>
                <div className="ls-header-actions">
                    <button className={`ls-btn ${hasRules ? "rules-active" : ""}`} onClick={() => onOpenRules(section.id)} title="Visibility rules">
                        <Icon.Eye />
                        {hasRules && <span className="ls-rules-badge">{sectionRulesData.rules.length}</span>}
                    </button>
                    <button className="ls-btn" onClick={() => setEditing(true)} title="Rename">✏️</button>
                    <button className="ls-btn danger" onClick={() => onRemoveSection(section.id)} title="Delete section">
                        <Icon.Trash />
                    </button>
                </div>
            </div>

            <div className="ls-rows">
                {section.rows.map((row, rowIdx) => (
                    <SectionRow
                        key={rowIdx}
                        row={row}
                        rowIndex={rowIdx}
                        sectionId={section.id}
                        onRemoveField={onRemoveField}
                        onDragStartField={onDragStartField}
                        onDropInSlot={onDropInSlot}
                        onToggleRequired={onToggleRequired}
                        requiredFields={requiredFields}
                        fieldVisibilityRules={fieldVisibilityRules}
                        onOpenVisRules={onOpenVisRules}
                        fieldConfigs={fieldConfigs}
                        onOpenConfig={onOpenConfig}
                    />
                ))}
            </div>

            {!section.rows.some((row) => row[0] !== null || row[1] !== null) && (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "13px", color: "#adb5c3", fontStyle: "italic", borderTop: "1px solid #d0d4e4" }}>
                    Drag fields from above to get started
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD CONFIG MODAL
// Gear-icon popup: helptext + maxValues (board_relation/people) + maxFiles (files)
// ─────────────────────────────────────────────────────────────────────────────
function FieldConfigModal({ col, configData, onSave, onClose }) {
    const colMeta = getTypeMeta(col.type);
    const showMaxValues = MAX_VALUES_TYPES.has(col.type);
    const showMaxFiles  = MAX_FILES_TYPES.has(col.type);

    const [helptext,  setHelptext]  = useState(configData?.helptext  ?? "");
    const [maxValues, setMaxValues] = useState(
        configData?.maxValues !== undefined ? String(configData.maxValues) : "1000"
    );
    const [maxFiles,  setMaxFiles]  = useState(
        configData?.maxFiles  !== undefined ? String(configData.maxFiles)  : "10"
    );
    const [error, setError] = useState("");

    const handleSave = () => {
        setError("");
        if (showMaxValues) {
            const n = parseInt(maxValues, 10);
            if (!maxValues || isNaN(n) || n < 1 || n > 1000) {
                setError("Max values must be a whole number between 1 and 1000.");
                return;
            }
        }
        if (showMaxFiles) {
            const n = parseInt(maxFiles, 10);
            if (!maxFiles || isNaN(n) || n < 1 || n > 100) {
                setError("Max files must be a whole number between 1 and 100.");
                return;
            }
        }
        const cfg = {};
        if (helptext.trim()) cfg.helptext = helptext.trim();
        if (showMaxValues)   cfg.maxValues = parseInt(maxValues, 10);
        if (showMaxFiles)    cfg.maxFiles  = parseInt(maxFiles,  10);
        onSave(cfg);
    };

    return (
        <div className="fcm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="fcm-modal">
                {/* Header */}
                <div className="fcm-header">
                    <div className="fcm-header-left">
                        <div className="fcm-header-icon">
                            <Icon.Gear />
                        </div>
                        <div>
                            <h2 className="fcm-title">Field Settings</h2>
                            <span className="fcm-field-pill">
                                <span className="fcm-field-dot" style={{ background: colMeta.color }} />
                                {col.title}
                                <span className="fcm-field-type">{colMeta.label}</span>
                            </span>
                        </div>
                    </div>
                    <button className="fcm-close" onClick={onClose} title="Close"><Icon.Close /></button>
                </div>

                {/* Body */}
                <div className="fcm-body">
                    {/* Help text */}
                    <div className="fcm-field-group">
                        <label className="fcm-label">
                            <span className="fcm-label-icon">💬</span>
                            Help text
                            <span className="fcm-label-hint">optional — shown below the field in the form</span>
                        </label>
                        <input
                            className="fcm-input"
                            type="text"
                            value={helptext}
                            placeholder="e.g. Enter a value between 1 and 100"
                            onChange={(e) => setHelptext(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Max Values — board_relation / people */}
                    {showMaxValues && (
                        <div className="fcm-field-group">
                            <label className="fcm-label">
                                <span className="fcm-label-icon">🔢</span>
                                Max values
                                <span className="fcm-label-hint">max items user can select (1 – 1000)</span>
                            </label>
                            <input
                                className="fcm-input fcm-input-sm"
                                type="number"
                                min="1"
                                max="1000"
                                value={maxValues}
                                onChange={(e) => setMaxValues(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Max Files — files type */}
                    {showMaxFiles && (
                        <div className="fcm-field-group">
                            <label className="fcm-label">
                                <span className="fcm-label-icon">📎</span>
                                Max files
                                <span className="fcm-label-hint">max number of files user can attach (1 – 100)</span>
                            </label>
                            <input
                                className="fcm-input fcm-input-sm"
                                type="number"
                                min="1"
                                max="100"
                                value={maxFiles}
                                onChange={(e) => setMaxFiles(e.target.value)}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="fcm-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="fcm-footer">
                    <button className="srm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="srm-btn-primary" onClick={handleSave}>
                        <Icon.Check /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD VISIBILITY MODAL (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function FieldVisibilityModal({ col, allColumns, rulesData, onSave, onClose }) {
    const availableCols = allColumns.filter((c) => c.id !== col.id);

    const makeCondition = () => ({
        id:       `vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source:   "field",
        fieldId:  availableCols[0]?.id || "",
        operator: "equals",
        value:    "",
    });

    const [conditions, setConditions] = useState(() => {
        const saved = rulesData?.conditions || [];
        return saved.length > 0 ? saved.map((c) => ({ ...c })) : [];
    });
    const initCriteria = () => {
        const saved = rulesData?.criteria || "";
        const count = (rulesData?.conditions || []).length;
        if (saved === "ALL") return count >= 2 ? Array.from({length: count}, (_, i) => i + 1).join(" AND ") : "";
        if (saved === "ANY") return count >= 2 ? Array.from({length: count}, (_, i) => i + 1).join(" OR ") : "";
        return saved || "";
    };
    const [criteriaExpr, setCriteriaExpr] = useState(initCriteria);
    const [saveError, setSaveError] = useState("");

    const addCondition = () => { setSaveError(""); setConditions((prev) => [...prev, makeCondition()]); };
    const removeCondition = (id) => { setSaveError(""); setConditions((prev) => prev.filter((c) => c.id !== id)); };

    const updateCondition = (id, key, val) => {
        setConditions((prev) => prev.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, [key]: val };
            if (key === "fieldId") {
                const srcCol   = allColumns.find((ac) => ac.id === val);
                const ops      = srcCol ? getOperatorsForType(srcCol.type) : [];
                updated.operator = ops[0]?.id || "equals";
                updated.value    = "";
            }
            if (key === "operator" && !operatorNeedsValue(val)) {
                updated.value = "";
            }
            return updated;
        }));
    };

    const handleSave = () => {
        setSaveError("");
        for (let i = 0; i < conditions.length; i++) {
            const c = conditions[i];
            if (!c.fieldId) continue;
            if (operatorNeedsValue(c.operator) && !c.value.trim()) {
                setSaveError(`Condition ${i + 1} is incomplete — please enter a value or remove it.`);
                return;
            }
        }
        const validConditions = conditions.filter((c) => c.fieldId);
        if (validConditions.length >= 2) {
            const expr = criteriaExpr.trim();
            if (!expr) { setSaveError("Please enter a logic expression (e.g. 1 AND (2 OR 3))."); return; }
            if (!/^[\d\sANDOR()]+$/i.test(expr)) { setSaveError("Invalid expression. Use condition numbers, AND, OR, and parentheses only."); return; }
            const nums = expr.match(/\d+/g) || [];
            for (const n of nums) {
                const idx = parseInt(n, 10);
                if (idx < 1 || idx > validConditions.length) { setSaveError(`Condition ${n} doesn't exist. Use numbers 1–${validConditions.length}.`); return; }
            }
            let depth = 0;
            for (const ch of expr) {
                if (ch === "(") depth++;
                if (ch === ")") depth--;
                if (depth < 0) { setSaveError("Unbalanced parentheses in expression."); return; }
            }
            if (depth !== 0) { setSaveError("Unbalanced parentheses in expression."); return; }
        }
        const finalCriteria = validConditions.length >= 2 ? criteriaExpr.trim().toUpperCase() : (validConditions.length === 1 ? "1" : "");
        onSave(validConditions.length > 0 ? { conditions: validConditions, criteria: finalCriteria } : { conditions: [], criteria: "" });
    };

    const hasRules = conditions.length > 0;
    const colMeta  = getTypeMeta(col.type);

    return (
        <div className="fvm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="fvm-modal">
                <div className="fvm-header">
                    <div className="fvm-header-left">
                        <div className="fvm-header-icon"><Icon.Eye /></div>
                        <div>
                            <h2 className="fvm-title">Field Visibility Rules</h2>
                            <p className="fvm-subtitle">
                                <span className="fvm-field-pill">
                                    <span className="fvm-field-dot" style={{ background: colMeta.color }} />
                                    {col.title}
                                    <span className="fvm-field-type">{colMeta.label}</span>
                                </span>
                            </p>
                        </div>
                    </div>
                    <button className="fvm-close" onClick={onClose} title="Close"><Icon.Close /></button>
                </div>

                <div className="fvm-body">
                    <div className="fvm-explainer">
                        <span className="fvm-explainer-icon">👁</span>
                        <p>This field will be <strong>shown</strong> when the conditions below are met. Leave empty to always show the field.</p>
                    </div>

                    <div className="fvm-conditions-list">
                        {conditions.length === 0 && (
                            <div className="fvm-empty">No conditions defined — field is always visible.</div>
                        )}
                        {conditions.map((cond, idx) => {
                            const srcCol  = allColumns.find((c) => c.id === cond.fieldId);
                            const ops     = srcCol ? getOperatorsForType(srcCol.type) : [{ id: "equals", label: "equals", needsValue: true }];
                            const needVal = operatorNeedsValue(cond.operator);
                            const srcMeta = srcCol ? getTypeMeta(srcCol.type) : { color: "#9d99b9", label: "" };
                            let valInputType = "text";
                            if (srcCol?.type === "numbers" || srcCol?.type === "rating") valInputType = "number";
                            if (srcCol?.type === "date") valInputType = "date";
                            return (
                                <div key={cond.id} className="fvm-condition-row">
                                    <span className="fvm-cond-num">{idx + 1}</span>
                                    <div className="fvm-source-badge">Field</div>
                                    <select className="fvm-select fvm-select-field" value={cond.fieldId} onChange={(e) => updateCondition(cond.id, "fieldId", e.target.value)}>
                                        {availableCols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                        {availableCols.length === 0 && <option value="">No other fields</option>}
                                    </select>
                                    <span className="fvm-type-badge" style={{ background: srcMeta.color + "22", color: srcMeta.color }}>{srcMeta.label}</span>
                                    <select className="fvm-select fvm-select-op" value={cond.operator} onChange={(e) => updateCondition(cond.id, "operator", e.target.value)}>
                                        {ops.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
                                    </select>
                                    {needVal ? (
                                        <input className="fvm-input" type={valInputType} value={cond.value} placeholder="Value…" onChange={(e) => updateCondition(cond.id, "value", e.target.value)} />
                                    ) : (
                                        <div className="fvm-no-value">—</div>
                                    )}
                                    <button className="fvm-remove-btn" onClick={() => removeCondition(cond.id)} title="Remove condition"><Icon.Trash /></button>
                                </div>
                            );
                        })}
                    </div>

                    <button className="fvm-add-btn" onClick={addCondition} disabled={availableCols.length === 0}>
                        <Icon.Plus /> Add Condition
                    </button>

                    {conditions.length >= 2 && (
                        <div className="fvm-criteria">
                            <span className="fvm-criteria-label">Show when:</span>
                            <div className="fvm-criteria-preview" style={{ marginBottom: "6px" }}>
                                <span className="fvm-criteria-preview-label">Available:</span>
                                <code>{conditions.map((_, i) => i + 1).join(", ")}</code>
                            </div>
                            <input
                                className="fvm-input"
                                type="text"
                                value={criteriaExpr}
                                placeholder="e.g. 1 AND (2 OR 3)"
                                onChange={(e) => { setCriteriaExpr(e.target.value); setSaveError(""); }}
                                style={{ fontFamily: "var(--mono)", fontSize: "13px" }}
                            />
                            <div style={{ fontSize: "11px", color: "#676879", marginTop: "4px" }}>
                                Use condition numbers with AND, OR, and parentheses. Example: <code style={{ background: "#fff", border: "1px solid #d0d4e4", borderRadius: "3px", padding: "1px 5px" }}>1 AND (2 OR 3)</code>
                            </div>
                        </div>
                    )}

                    {saveError && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", background: "#fff4f6", border: "1px solid #fac0cb", borderRadius: "6px", color: "#b82020", fontSize: "13px" }}>
                            <span style={{ fontSize: "15px", flexShrink: 0 }}>⚠️</span>
                            <span>{saveError}</span>
                        </div>
                    )}
                </div>

                <div className="fvm-footer">
                    {hasRules && (
                        <button className="fvm-clear-btn" onClick={() => { setConditions([]); setCriteriaExpr(""); setSaveError(""); }}>
                            Clear All Rules
                        </button>
                    )}
                    <div className="fvm-footer-right">
                        <button className="srm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="srm-btn-primary" onClick={handleSave}><Icon.Check /> Save Rules</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
function ChildBoardColPicker({ boardName, boardColumns, selectedCols, onToggle, onClose }) {
    return (
        <div className="srm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="srm-modal">
                <div className="srm-header">
                    <div className="srm-header-left">
                        <span className="srm-header-icon"><Icon.Gear /></span>
                        <div>
                            <h2 className="srm-title">Columns to Display</h2>
                            <p className="srm-subtitle">Board: <strong>{boardName}</strong></p>
                        </div>
                    </div>
                    <button className="srm-close" onClick={onClose}><Icon.Close /></button>
                </div>
                <div className="srm-body">
                    <p className="srm-desc">
                        Choose which columns to show in the related list.
                        <strong> Name</strong> is always included and cannot be removed.
                    </p>
                    <div className="cbcp-cols">
                        {boardColumns.map((col) => {
                            const isName = col.id === "name";
                            const checked = isName || selectedCols.includes(col.id);
                            const meta = getTypeMeta(col.type);
                            return (
                                <label key={col.id} className={`cbcp-col-row${isName ? " cbcp-col-locked" : ""}`}>
                                    <input
                                        type="checkbox"
                                        className="cbcp-checkbox"
                                        checked={checked}
                                        disabled={isName}
                                        onChange={() => onToggle(col.id)}
                                    />
                                    <span className="cbcp-col-dot" style={{ background: meta.color }} />
                                    <span className="cbcp-col-name">{col.title}</span>
                                    <span className="cbcp-col-type">{meta.label}</span>
                                    {isName && <span className="cbcp-locked-badge">Always shown</span>}
                                </label>
                            );
                        })}
                        {boardColumns.length === 0 && (
                            <div className="srm-empty-rules">Loading columns…</div>
                        )}
                    </div>
                </div>
                <div className="srm-footer">
                    <button className="srm-btn-primary" onClick={onClose}><Icon.Check /> Done</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLACED CHILD BOARD CARD (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function PlacedChildBoardCard({ child, cardKey, pickerOpen, boardCols, onOpenColPicker, onToggleCol, onRemove, onRename }) {
    const [editing, setEditing] = React.useState(false);
    const [label, setLabel]     = React.useState(child.label);
    const inputRef              = React.useRef(null);
    const cols                  = child.columns || ["name"];
    const extraCols             = cols.filter((c) => c !== "name").length;

    React.useEffect(() => { setLabel(child.label); }, [child.label]);
    React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commit = () => {
        setEditing(false);
        const trimmed = label.trim();
        if (trimmed && trimmed !== child.label) onRename(trimmed);
        else setLabel(child.label);
    };

    const allCols = boardCols.length > 0
        ? [{ id: "name", title: "Name", type: "name" }, ...boardCols.filter((c) => c.id !== "name")]
        : [];

    return (
        <>
            <div className="cb-card">
                <div className="cb-card-left">
                    <span className="cb-card-grip"><Icon.Grip /></span>
                    <span className="cb-card-board-icon">🔗</span>
                    <div className="cb-card-info">
                        {editing ? (
                            <input
                                ref={inputRef}
                                className="cb-card-label-input"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onBlur={commit}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter")  commit();
                                    if (e.key === "Escape") { setEditing(false); setLabel(child.label); }
                                }}
                            />
                        ) : (
                            <span className="cb-card-label" title="Double-click to rename" onDoubleClick={() => setEditing(true)}>
                                {child.label}
                            </span>
                        )}
                        <span className="cb-card-meta">
                            {child.boardName} · via <em>{child.columnLabel}</em> · {cols.length} col{cols.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
                <div className="cb-card-actions">
                    <button className={`ls-btn${pickerOpen ? " rules-active" : ""}`} onClick={onOpenColPicker} title="Configure columns">
                        <Icon.Gear />
                        {extraCols > 0 && <span className="ls-rules-badge">{extraCols + 1}</span>}
                    </button>
                    <button className="ls-btn" onClick={() => setEditing(true)} title="Rename">✏️</button>
                    <button className="ls-btn danger" onClick={onRemove} title="Remove"><Icon.Trash /></button>
                </div>
            </div>
            {pickerOpen && (
                <ChildBoardColPicker
                    boardName={child.boardName}
                    boardColumns={allCols}
                    selectedCols={cols}
                    onToggle={onToggleCol}
                    onClose={onOpenColPicker}
                />
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULE MODAL
// Full editor for a single board-level validation rule.
// Simple mode: structured row builder (field / op / value|field, with arithmetic LHS).
// Formula mode: free-form expression string with {fieldId} references.
// ═══════════════════════════════════════════════════════════════════════════════
function ValidationRuleModal({ rule, allColumns, onSave, onClose }) {
    // ── Local state initialised from rule prop ──────────────────────────────
    const [name,        setName]        = useState(rule.name       || "");
    const [mode,        setMode]        = useState(rule.mode       || "simple");
    const [errorMsg,    setErrorMsg]    = useState(rule.error      || "");
    const [formula,     setFormula]     = useState(rule.expression || "");
    const [saveErr,     setSaveErr]     = useState("");
    const [isActive,    setIsActive]    = useState(rule.active !== false);
    const [syntaxResult,   setSyntaxResult]   = useState(null);  // null | { valid, message }
    const [syntaxChecked,  setSyntaxChecked]  = useState(
        // Pre-populate as checked if editing an existing rule with an expression
        !!(rule.expression && rule.expression.trim())
    );

    // Simple rows — each row is one condition line in the structured builder
    const makeEmptyRow = () => ({
        id:        makeRowId(),
        lhsType:   "field",
        lhsField:  allColumns[0]?.id || "",
        lhsOp:     "+",
        lhsField2: allColumns[1]?.id || allColumns[0]?.id || "",
        operator:  "==",
        rhsType:   "value",
        rhsValue:  "",
        rhsField:  allColumns[0]?.id || "",
    });

    const [rows,     setRows]     = useState(() => {
        if (rule.simpleRows?.length) return rule.simpleRows.map(r => ({ ...r }));
        return [makeEmptyRow()];
    });
    const [criteria, setCriteria] = useState(rule.simpleCriteria || "");

    // ── Row helpers ─────────────────────────────────────────────────────────
    const resetSyntax = () => { setSyntaxResult(null); setSyntaxChecked(false); };
    const addRow    = () => { setRows(prev => [...prev, makeEmptyRow()]); resetSyntax(); };
    const removeRow = (id) => { setRows(prev => prev.filter(r => r.id !== id)); resetSyntax(); };
    const updateRow = (id, patch) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
        resetSyntax();
    };

    // When lhsField changes on a row, reset the operator to a sensible default
    const handleLhsFieldChange = (rowId, newFieldId) => {
        const col = allColumns.find(c => c.id === newFieldId);
        const ops = col ? getComparisonOpsForType(col.type) : COMPARISON_OPS;
        updateRow(rowId, { lhsField: newFieldId, operator: ops[0]?.id || "==" });
    };

    // ── Collect all field IDs referenced in simple rows ─────────────────────
    const referencedFieldIds = (rowList) => {
        const ids = new Set();
        rowList.forEach(r => {
            if (r.lhsField)  ids.add(r.lhsField);
            if (r.lhsType === "arithmetic" && r.lhsField2) ids.add(r.lhsField2);
            if (r.rhsType === "field" && r.rhsField) ids.add(r.rhsField);
        });
        return [...ids];
    };

    // ── columnsMap for buildExpressionFromSimpleRows ────────────────────────
    const columnsMap = Object.fromEntries(allColumns.map(c => [c.id, c]));

    // ── Check syntax ────────────────────────────────────────────────────────
    const handleCheckSyntax = () => {
        let exprToCheck = "";
        if (mode === "formula") {
            exprToCheck = formula.trim();
            if (!exprToCheck) { setSyntaxResult({ valid: false, message: "Expression is empty." }); setSyntaxChecked(true); return; }
        } else {
            // Simple mode — build expression from rows first
            const validRows = rows.filter(r => r.lhsField);
            if (validRows.length === 0) { setSyntaxResult({ valid: false, message: "Add at least one condition row." }); setSyntaxChecked(true); return; }
            try {
                exprToCheck = buildExpressionFromSimpleRows(
                    validRows,
                    validRows.length === 1 ? "1" : criteria.trim().toUpperCase(),
                    columnsMap
                );
            } catch (e) {
                setSyntaxResult({ valid: false, message: "Could not build expression: " + e.message });
                setSyntaxChecked(true);
                return;
            }
        }
        const result = validateExpression(exprToCheck);
        setSyntaxResult(result);
        setSyntaxChecked(true);
    };

    // ── Validate and save ───────────────────────────────────────────────────
    const handleSave = () => {
        setSaveErr("");
        if (!name.trim()) { setSaveErr("Please enter a rule name."); return; }

        // Require syntax check before saving
        if (!syntaxChecked) {
            setSaveErr("Please check the expression syntax before saving.");
            return;
        }
        if (syntaxResult && !syntaxResult.valid) {
            setSaveErr("Fix the expression syntax error before saving.");
            return;
        }

        let expression = "";
        let fields = [];
        let simpleRows = undefined;
        let simpleCriteria = undefined;

        if (mode === "simple") {
            const validRows = rows.filter(r => r.lhsField);
            if (validRows.length === 0) { setSaveErr("Add at least one condition row."); return; }
            if (validRows.length >= 2) {
                const expr = criteria.trim();
                if (!expr) { setSaveErr("Enter a logic expression (e.g. 1 AND 2)."); return; }
                if (!/^[\d\sANDOR()]+$/i.test(expr)) { setSaveErr("Use condition numbers, AND, OR, and parentheses only."); return; }
                const nums = expr.match(/\d+/g) || [];
                for (const n of nums) {
                    const idx = parseInt(n, 10);
                    if (idx < 1 || idx > validRows.length) {
                        setSaveErr(`Condition ${n} doesn't exist. Use numbers 1–${validRows.length}.`);
                        return;
                    }
                }
            }
            try {
                expression = buildExpressionFromSimpleRows(
                    validRows,
                    validRows.length === 1 ? "1" : criteria.trim().toUpperCase(),
                    columnsMap
                );
            } catch(e) {
                setSaveErr("Could not build expression: " + e.message);
                return;
            }
            fields = referencedFieldIds(validRows);
            simpleRows = validRows;
            simpleCriteria = validRows.length >= 2 ? criteria.trim().toUpperCase() : "1";
        } else {
            // Formula mode
            if (!formula.trim()) { setSaveErr("Enter a formula expression."); return; }
            expression = formula.trim();
            // Extract {fieldId} references
            const matches = [...formula.matchAll(/\{([^}]+)\}/g)];
            fields = [...new Set(matches.map(m => m[1]))];
        }

        const saved = {
            ...rule,
            name:    name.trim(),
            active:  isActive,
            mode,
            expression,
            error:   errorMsg.trim(),
            fields,
            ...(mode === "simple" ? { simpleRows, simpleCriteria } : {}),
        };
        onSave(saved);
    };

    const colMeta = (colId) => {
        const col = allColumns.find(c => c.id === colId);
        return col ? getTypeMeta(col.type) : { color: "#9d99b9", label: "" };
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="vrm-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="vrm-modal">
                {/* Header */}
                <div className="vrm-header">
                    <div className="vrm-header-left">
                        <div className="vrm-header-icon"><Icon.Check /></div>
                        <div>
                            <h2 className="vrm-title">{rule.expression ? "Edit Validation Rule" : "New Validation Rule"}</h2>
                            <p className="vrm-subtitle">Board-level · evaluated at form submission</p>
                        </div>
                    </div>
                    <button className="vrm-close" onClick={onClose} title="Close"><Icon.Close /></button>
                </div>

                {/* Body */}
                <div className="vrm-body">
                    {/* Rule name */}
                    <div className="vrm-field-group">
                        <label className="vrm-label">Rule name</label>
                        <input
                            className="vrm-input"
                            type="text"
                            value={name}
                            placeholder="e.g. Amount cannot be blank."
                            onChange={e => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="vrm-field-group">
                        <label className="vrm-active-label" title="Uncheck to disable this rule without deleting it">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="vrm-active-checkbox"
                            />
                            <span>Active</span>
                        </label>
                    </div>

                    {/* Mode toggle */}
                    <div className="vrm-field-group">
                        <label className="vrm-label">Rule type</label>
                        <div className="vrm-toggle-row">
                            <button
                                className={`vrm-toggle-btn ${mode === "simple" ? "active" : ""}`}
                                onClick={() => setMode("simple")}
                            >Simple</button>
                            <button
                                className={`vrm-toggle-btn vrm-toggle-btn--formula ${mode === "formula" ? "active" : ""}`}
                                onClick={() => setMode("formula")}
                            >Formula</button>
                        </div>
                    </div>

                    {/* ── SIMPLE MODE ─── */}
                    {mode === "simple" && (
                        <div className="vrm-simple-builder">
                            <div className="vrm-rows-list">
                                {rows.map((row, idx) => {
                                    const lhsCol   = allColumns.find(c => c.id === row.lhsField);
                                    const compOps  = lhsCol ? getComparisonOpsForType(lhsCol.type) : COMPARISON_OPS;
                                    const needsVal = comparisonOpNeedsValue(row.operator);
                                    const isNumeric = lhsCol && (NUMERIC_COL_TYPES.has(lhsCol.type) || DATE_COL_TYPES.has(lhsCol.type));
                                    const lhsMeta  = colMeta(row.lhsField);
                                    const lhs2Meta = colMeta(row.lhsField2);

                                    return (
                                        <div key={row.id} className="vrm-row">
                                            <span className="vrm-row-num">{idx + 1}</span>

                                            {/* LHS — field selector with optional arithmetic */}
                                            <div className="vrm-lhs">
                                                <div className="vrm-lhs-field-wrap">
                                                    <span className="vrm-field-dot" style={{ background: lhsMeta.color }} />
                                                    <select
                                                        className="vrm-select vrm-select-field"
                                                        value={row.lhsField}
                                                        onChange={e => handleLhsFieldChange(row.id, e.target.value)}
                                                    >
                                                        {allColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                    </select>
                                                </div>

                                                {/* Arithmetic toggle */}
                                                <button
                                                    className={`vrm-arith-toggle ${row.lhsType === "arithmetic" ? "active" : ""}`}
                                                    onClick={() => updateRow(row.id, { lhsType: row.lhsType === "arithmetic" ? "field" : "arithmetic" })}
                                                    title={row.lhsType === "arithmetic" ? "Remove arithmetic" : "Add arithmetic (e.g. Field + Field)"}
                                                >
                                                    {row.lhsType === "arithmetic" ? "−" : "+field"}
                                                </button>

                                                {/* Second LHS field for arithmetic */}
                                                {row.lhsType === "arithmetic" && (
                                                    <div className="vrm-arith-ext">
                                                        <select
                                                            className="vrm-select vrm-select-op-sm"
                                                            value={row.lhsOp}
                                                            onChange={e => updateRow(row.id, { lhsOp: e.target.value })}
                                                        >
                                                            {ARITHMETIC_OPS.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}
                                                        </select>
                                                        <span className="vrm-field-dot" style={{ background: lhs2Meta.color }} />
                                                        <select
                                                            className="vrm-select vrm-select-field"
                                                            value={row.lhsField2}
                                                            onChange={e => updateRow(row.id, { lhsField2: e.target.value })}
                                                        >
                                                            {allColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Comparison operator */}
                                            <select
                                                className="vrm-select vrm-select-op"
                                                value={row.operator}
                                                onChange={e => updateRow(row.id, { operator: e.target.value })}
                                            >
                                                {compOps.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}
                                            </select>

                                            {/* RHS */}
                                            {needsVal && (
                                                <div className="vrm-rhs">
                                                    <div className="vrm-rhs-type-toggle">
                                                        <button
                                                            className={`vrm-rhs-btn ${row.rhsType === "value" ? "active" : ""}`}
                                                            onClick={() => updateRow(row.id, { rhsType: "value" })}
                                                        >Value</button>
                                                        <button
                                                            className={`vrm-rhs-btn ${row.rhsType === "field" ? "active" : ""}`}
                                                            onClick={() => updateRow(row.id, { rhsType: "field" })}
                                                        >Field</button>
                                                    </div>
                                                    {row.rhsType === "value" ? (
                                                        <input
                                                            className="vrm-input vrm-input-rhs"
                                                            type={isNumeric ? "number" : "text"}
                                                            value={row.rhsValue}
                                                            placeholder="value…"
                                                            onChange={e => updateRow(row.id, { rhsValue: e.target.value })}
                                                        />
                                                    ) : (
                                                        <div className="vrm-lhs-field-wrap">
                                                            <span className="vrm-field-dot" style={{ background: colMeta(row.rhsField).color }} />
                                                            <select
                                                                className="vrm-select vrm-select-field"
                                                                value={row.rhsField}
                                                                onChange={e => updateRow(row.id, { rhsField: e.target.value })}
                                                            >
                                                                {allColumns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button className="vrm-row-remove" onClick={() => removeRow(row.id)} title="Remove row">
                                                <Icon.Trash />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <button className="vrm-add-row-btn" onClick={addRow}>
                                <Icon.Plus /> Add condition
                            </button>

                            {/* Logic expression when 2+ rows */}
                            {rows.length >= 2 && (
                                <div className="vrm-criteria-box">
                                    <span className="vrm-criteria-label">Logic:</span>
                                    <input
                                        className="vrm-input vrm-input-mono"
                                        type="text"
                                        value={criteria}
                                        placeholder={`e.g. 1 AND 2`}
                                        onChange={e => { setCriteria(e.target.value); setSaveErr(""); resetSyntax(); }}
                                    />
                                    <span className="vrm-criteria-hint">Use: AND, OR, ( ) and numbers 1–{rows.length}</span>
                                </div>
                            )}

                            {/* Check Syntax — simple mode */}
                            <div className="vrm-syntax-row">
                                <button className="vrm-syntax-check-btn" onClick={handleCheckSyntax}>
                                    ⚡ Check Syntax
                                </button>
                                {syntaxResult && (
                                    <span className={`vrm-syntax-result ${syntaxResult.valid ? "valid" : "invalid"}`}>
                                        {syntaxResult.valid ? "✓ Expression is valid" : `✗ ${syntaxResult.message}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── FORMULA MODE ─── */}
                    {mode === "formula" && (
                        <div className="vrm-formula-builder">
                            <div className="vrm-formula-explainer">
                                Reference fields using <code>{"{fieldId}"}</code> syntax. Expression must return <code>true</code> to pass. Example:
                                <code className="vrm-formula-example">{"  {fabric1} + {fabric2} == 100  "}</code>
                            </div>
                            <textarea
                                className="vrm-formula-input"
                                value={formula}
                                placeholder="{field_id} + {other_field_id} == 100"
                                onChange={e => { setFormula(e.target.value); resetSyntax(); }}
                                rows={3}
                                spellCheck={false}
                            />
                            {/* Check Syntax — formula mode */}
                            <div className="vrm-syntax-row">
                                <button className="vrm-syntax-check-btn" onClick={handleCheckSyntax}>
                                    ⚡ Check Syntax
                                </button>
                                {syntaxResult && (
                                    <span className={`vrm-syntax-result ${syntaxResult.valid ? "valid" : "invalid"}`}>
                                        {syntaxResult.valid ? "✓ Expression is valid" : `✗ ${syntaxResult.message}`}
                                    </span>
                                )}
                            </div>
                            {/* Field reference panel */}
                            <div className="vrm-field-ref-panel">
                                <div className="vrm-field-ref-title">Available fields</div>
                                <div className="vrm-field-ref-chips">
                                    {allColumns.map(col => {
                                        const meta = getTypeMeta(col.type);
                                        return (
                                            <button
                                                key={col.id}
                                                className="vrm-field-ref-chip"
                                                title={`Click to insert {${col.id}}`}
                                                onClick={() => { setFormula(f => f + `{${col.id}}`); resetSyntax(); }}
                                            >
                                                <span className="vrm-field-dot" style={{ background: meta.color }} />
                                                <span className="vrm-field-ref-name">{col.title}</span>
                                                <code className="vrm-field-ref-id">{col.id}</code>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    <div className="vrm-field-group">
                        <label className="vrm-label">Error message <span className="vrm-label-hint">shown when validation fails</span></label>
                        <input
                            className="vrm-input vrm-input-error"
                            type="text"
                            value={errorMsg}
                            placeholder="e.g. Amount must be filled before submission."
                            onChange={e => setErrorMsg(e.target.value)}
                        />
                    </div>

                    {saveErr && (
                        <div className="vrm-save-error">
                            <span>⚠️</span> {saveErr}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="vrm-footer">
                    <button className="srm-btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="srm-btn-primary" onClick={handleSave}>
                        <Icon.Check /> Save Rule
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES ZONE
// Board-level validation rules panel — below Related Lists on the canvas.
// Simple list view: each rule shows name, trigger badge, error text, edit/delete.
// Full rule editor modal comes in a future phase.
// ═══════════════════════════════════════════════════════════════════════════════
function ValidationRulesZone({ rules, collapsed, onToggleCollapsed, onAddRule, onDeleteRule, onEditRule }) {
    return (
        <div className="vrz-zone">
            <div className="vrz-header" onClick={onToggleCollapsed}>
                <div className="vrz-header-left">
                    <span className="vrz-icon">
                        <Icon.Check />
                    </span>
                    <h3 className="vrz-title">Validation Rules</h3>
                    <span className="vrz-badge">{rules.length}</span>
                </div>
                <div className="vrz-header-right">
                    <span className="vrz-hint">Board-level rules evaluated at submit</span>
                    <span className={`vrz-caret ${collapsed ? "" : "open"}`}><Icon.Chevron /></span>
                </div>
            </div>

            {!collapsed && (
                <div className="vrz-body">
                    {rules.length === 0 ? (
                        <div className="vrz-empty">
                            <span className="vrz-empty-icon">✓</span>
                            <p>No validation rules defined. Add rules to enforce cross-field constraints at form submission.</p>
                        </div>
                    ) : (
                        <div className="vrz-cards">
                            {rules.map((rule) => (
                                <div key={rule.id} className="vrz-card">
                                    <div className="vrz-card-left">
                                        <div className="vrz-card-top">
                                            <span className="vrz-card-name">{rule.name || "Unnamed rule"}</span>
                                            <input
                                                type="checkbox"
                                                checked={rule.active !== false}
                                                readOnly
                                                title={rule.active !== false ? "Active" : "Inactive"}
                                                style={{ width: "14px", height: "14px", accentColor: "var(--blue)", cursor: "default", flexShrink: 0 }}
                                            />
                                        </div>
                                        <div className="vrz-card-error">⚠ {rule.error || "No error message set"}</div>
                                        {rule.expression && (
                                            <code className="vrz-card-expr">{rule.expression}</code>
                                        )}
                                    </div>
                                    <div className="vrz-card-actions">
                                        <button className="vrz-card-btn" onClick={() => onEditRule(rule)} title="Edit rule">✏️</button>
                                        <button className="vrz-card-btn danger" onClick={() => onDeleteRule(rule.id)} title="Delete rule">
                                            <Icon.Trash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <button className="vrz-add-btn" onClick={onAddRule}>
                        <Icon.Plus /> Add Validation Rule
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
    const [boards, setBoards]               = useState([]);
    const [boardsLoading, setBoardsLoading] = useState(true);
    const [boardsError, setBoardsError]     = useState(null);
    const [selectedBoard, setSelectedBoard] = useState(null);

    const [columns, setColumns]               = useState([]);
    const [columnsLoading, setColumnsLoading] = useState(false);
    const [columnsError, setColumnsError]     = useState(null);

    const [sections, setSections]               = useState([]);
    const [placedColIds, setPlacedColIds]       = useState(new Set());
    const [requiredFields, setRequiredFields]   = useState(new Set());
    const [layoutLoading, setLayoutLoading]     = useState(false);

    const [saving, setSaving]     = useState(false);
    const [saveMsg, setSaveMsg]   = useState(null);
    const [layoutRecordId, setLayoutRecordId] = useState(null);
    const [layoutItemName, setLayoutItemName] = useState("");

    const [sectionRules, setSectionRules]             = useState({});
    const [rulesModalSectionId, setRulesModalSectionId] = useState(null);

    // ── Field-level visibility rules ─────────────────────────────────────────
    const [fieldVisibilityRules, setFieldVisibilityRules] = useState({});
    const [visRulesModalColId, setVisRulesModalColId]     = useState(null);

    // ── Field configs (helptext, maxValues, maxFiles) ─────────────────────────
    const [fieldConfigs, setFieldConfigs]         = useState({});
    const [configModalColId, setConfigModalColId] = useState(null);

    // ── Board-level validation rules (Validation Rules column) ────────────────
    const [validationRules, setValidationRules]         = useState([]);
    const [valRulesCollapsed, setValRulesCollapsed]     = useState(false);
    const [valRuleModalData,  setValRuleModalData]      = useState(null); // null | rule object

    // ── Child boards ──────────────────────────────────────────────────────────
    const [allChildBoards,     setAllChildBoards]     = useState([]);
    const [childBoardsLoading, setChildBoardsLoading] = useState(false);
    const [placedChildBoards,  setPlacedChildBoards]  = useState([]);
    const [colPickerBoardKey,  setColPickerBoardKey]  = useState(null);
    const [colPickerData,      setColPickerData]      = useState({});
    const [childBoardsCollapsed, setChildBoardsCollapsed] = useState(false);
    const childDragRef = useRef(null);

    const dragRef    = useRef(null);
    const plsColsRef = useRef(null);

    // ── Load boards on mount
    useEffect(() => {
        getAllBoards().then((res) => {
            setBoardsLoading(false);
            if (res.success) setBoards(res.boards);
            else setBoardsError(res.error);
        });
    }, []);

    const ensurePLSCols = async () => {
        if (plsColsRef.current) return plsColsRef.current;
        const res = await getBoardColumns(String(PAGELAYOUTSECTION_BOARDID));
        if (!res.success) throw new Error("Cannot access PageLayoutSections board: " + res.error);
        const find = (title) => res.columns.find((c) => c.title === title);
        const boardIdCol  = find(PLS_COL_TITLE_BOARDID);
        const sectionsCol = find(PLS_COL_TITLE_SECTIONS);
        if (!boardIdCol || !sectionsCol) {
            throw new Error(
                `Missing required columns in PageLayoutSections board.\n` +
                `Expected: "${PLS_COL_TITLE_BOARDID}", "${PLS_COL_TITLE_SECTIONS}".\n` +
                `Found: ${res.columns.map((c) => `"${c.title}"`).join(", ")}`,
            );
        }
        const childBoardsCol     = find(PLS_COL_TITLE_CHILD_BOARDS);
        const validationRulesCol = find(PLS_COL_TITLE_VAL_RULES);
        plsColsRef.current = {
            boardIdColId:         boardIdCol.id,
            sectionsColId:        sectionsCol.id,
            childBoardsColId:     childBoardsCol?.id     || null,
            validationRulesColId: validationRulesCol?.id || null,
        };
        return plsColsRef.current;
    };

    const fetchExistingLayout = async (boardId, columnsMap, board) => {
        setLayoutLoading(true);
        try {
            const plsCols = await ensurePLSCols();
            const matchingRecords = await getPageLayoutSectionRecords(boardId);
            if (matchingRecords.length === 0) {
                setLayoutRecordId(null);
                setSections([makeSection(`${board?.name || "Board"} Information`, 1)]);
                setLayoutItemName("");
                setPlacedColIds(new Set());
                setRequiredFields(new Set());
                setSectionRules({});
                setFieldVisibilityRules({});
                setFieldConfigs({});
                setValidationRules([]);
                setPlacedChildBoards([]);
                return;
            }

            if (matchingRecords.length > 1) {
                console.warn(`[PLB] Found ${matchingRecords.length} records for board ${boardId} — using the first.`);
            }
            const record = matchingRecords[0];
            setLayoutRecordId(record.id);
            setLayoutItemName(record.name || "");

            const sectionsCV = record.column_values.find((cv) => cv.id === plsCols.sectionsColId);
            let rawJson = sectionsCV?.text?.trim() || "";
            if (!rawJson) {
                try {
                    const outer = JSON.parse(sectionsCV?.value || "");
                    if (typeof outer.text === "string") rawJson = outer.text.trim();
                } catch (_) {}
            }

            const parsed = deserialiseSectionsJSON(rawJson, columnsMap);

            if (!parsed) {
                setSections([makeSection(`${board?.name || "Board"} Information`, 1)]);
                setPlacedColIds(new Set());
                setRequiredFields(new Set());
                setSectionRules({});
                setFieldVisibilityRules({});
                setFieldConfigs({});
                setValidationRules([]);
                setPlacedChildBoards([]);
                return;
            }

            setSections(parsed.sections);
            setPlacedColIds(parsed.placedColIds);
            setRequiredFields(parsed.requiredFields);
            setSectionRules(parsed.sectionRules);
            setFieldVisibilityRules(parsed.fieldVisibilityRules || {});
            setFieldConfigs(parsed.fieldConfigs || {});

            // Load board-level validation rules
            if (plsCols.validationRulesColId) {
                const vrCV = record.column_values.find((cv) => cv.id === plsCols.validationRulesColId);
                let rawVr = vrCV?.text?.trim() || "";
                if (!rawVr) {
                    try { const o = JSON.parse(vrCV?.value || ""); if (typeof o.text === "string") rawVr = o.text.trim(); } catch (_) {}
                }
                if (rawVr) {
                    try {
                        const saved = JSON.parse(rawVr);
                        if (Array.isArray(saved)) {
                            // Edge case: expression may be corrupted by manual JSON edits.
                            // If a rule's expression fails syntax validation, default it to "true"
                            // so the rule never blocks submission until the author fixes it.
                            const sanitized = saved.map(rule => {
                                if (!rule.expression || !rule.expression.trim()) return rule;
                                const check = validateExpression(rule.expression);
                                if (!check.valid) {
                                    console.warn(`[PLB] Rule "${rule.id}" has invalid expression — defaulting to true. Reason: ${check.message}`);
                                    return { ...rule, expression: "true", _expressionFallback: true };
                                }
                                return rule;
                            });
                            setValidationRules(sanitized);
                        }
                    } catch (_) { console.warn("[PLB] Could not parse validation rules JSON"); }
                } else {
                    setValidationRules([]);
                }
            }

            if (plsCols.childBoardsColId) {
                const cbCV = record.column_values.find((cv) => cv.id === plsCols.childBoardsColId);
                let rawCb = cbCV?.text?.trim() || "";
                if (!rawCb) {
                    try { const o = JSON.parse(cbCV?.value || ""); if (typeof o.text === "string") rawCb = o.text.trim(); } catch (_) {}
                }
                if (rawCb) {
                    try {
                        const saved = JSON.parse(rawCb);
                        if (Array.isArray(saved)) setPlacedChildBoards(saved);
                    } catch (_) { console.warn("[PLB] Could not parse child boards JSON"); }
                }
            }

        } catch (err) {
            console.error("[PLB] fetchExistingLayout error:", err);
            //setSections([makeSection("Board Information", 1)]);
            setSections([makeSection(`${selectedBoard?.name || "Board"} Information`, 1)]);
            setSaveMsg({ type: "error", text: "Could not load existing layout: " + err.message });
        } finally {
            setLayoutLoading(false);
        }
    };

    const handleBoardSelect = async (board) => {
        setSelectedBoard(board);
        setColumnsLoading(true);
        setColumnsError(null);
        setColumns([]);
        setSections([]);
        setPlacedColIds(new Set());
        setRequiredFields(new Set());
        setSectionRules({});
        setFieldVisibilityRules({});
        setFieldConfigs({});
        setValidationRules([]);
        setVisRulesModalColId(null);
        setConfigModalColId(null);
        setLayoutRecordId(null);
        setSaveMsg(null);
        setLayoutItemName("");
        setPlacedChildBoards([]);
        setAllChildBoards([]);
        setColPickerBoardKey(null);
        setColPickerData({});

        const res = await getBoardColumns(board.id);
        setColumnsLoading(false);
        if (!res.success) { setColumnsError(res.error); return; }

        setColumns(res.columns);
        const columnsMap = Object.fromEntries(res.columns.map((c) => [c.id, c]));
        await fetchExistingLayout(board.id, columnsMap, board);

        setChildBoardsLoading(true);
        try {
            const cbResult = await getChildBoards(board.id);
            if (cbResult.success) setAllChildBoards(cbResult.children || []);
            else console.warn("[PLB] getChildBoards error:", cbResult.error);
        } catch (err) {
            console.warn("[PLB] getChildBoards exception:", err);
        } finally {
            setChildBoardsLoading(false);
        }
    };

    // ── Drag handlers (unchanged)
    const handlePaletteDragStart = (e, col) => {
        dragRef.current = { col, fromPalette: true };
        e.dataTransfer.effectAllowed = "copy";
    };
    const handleFieldDragStart = (e, col) => {
        dragRef.current = { col, fromPalette: false };
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropInSlot = (e, toSectionId, toRow, toSlot) => {
        e.preventDefault();
        if (!dragRef.current) return;
        const { col, fromPalette } = dragRef.current;
        dragRef.current = null;

        setSections((prev) => {
            const next = prev.map((s) => ({ ...s, rows: s.rows.map((r) => [...r]) }));
            const target = next.find((s) => s.id === toSectionId);
            if (!target) return prev;

            // Build a flat list of all placed columns in this section (nulls excluded)
            const flat = target.rows.flatMap((r) => r.filter(Boolean));

            // If dragging from palette and already placed, abort
            if (fromPalette && placedColIds.has(col.id)) return prev;

            // Remove the col from flat if it's already in this section (field move)
            const withoutCol = flat.filter((c) => c.id !== col.id);

            // Compute the insertion index from (toRow, toSlot)
            const insertIdx = toRow * 2 + toSlot;
            // Clamp to valid range
            const clampedIdx = Math.min(insertIdx, withoutCol.length);

            // Splice col in at the insertion point
            withoutCol.splice(clampedIdx, 0, col);

            // Rebuild rows from the new flat list
            const newRows = [];
            for (let i = 0; i < withoutCol.length; i += 2) {
                newRows.push([withoutCol[i] || null, withoutCol[i + 1] || null]);
            }
            // Always ensure a trailing empty row
            const last = newRows[newRows.length - 1];
            if (!last || last[0] !== null || last[1] !== null) {
                newRows.push([null, null]);
            }

            target.rows = newRows;

            // Update placedColIds if this was a palette drop
            if (fromPalette) {
                setPlacedColIds((p) => new Set([...p, col.id]));
            }

            return next;
        });
    };
    const handleRemoveField = (sectionId, rowIdx, slotIdx) => {
        setSections((prev) => {
            const next = prev.map((s) => ({ ...s, rows: s.rows.map((r) => [...r]) }));
            const sec  = next.find((s) => s.id === sectionId);
            if (!sec) return prev;
            const removed = sec.rows[rowIdx][slotIdx];
            sec.rows[rowIdx][slotIdx] = null;
            if (removed) {
                setPlacedColIds((p)       => { const n = new Set(p); n.delete(removed.id); return n; });
                setRequiredFields((p)     => { const n = new Set(p); n.delete(removed.id); return n; });
                setFieldVisibilityRules((p) => { const n = { ...p }; delete n[removed.id]; return n; });
                setFieldConfigs((p)         => { const n = { ...p }; delete n[removed.id]; return n; });
                setVisRulesModalColId((cur) => (cur === removed.id ? null : cur));
                setConfigModalColId((cur)   => (cur === removed.id ? null : cur));
            }
            while (sec.rows.length > 1) {
                const last       = sec.rows[sec.rows.length - 1];
                const secondLast = sec.rows[sec.rows.length - 2];
                if (last[0] === null && last[1] === null && secondLast[0] === null && secondLast[1] === null)
                    sec.rows.pop();
                else break;
            }
            return next;
        });
    };

    const handleToggleRequired = (colId) => {
        setRequiredFields((prev) => {
            const next = new Set(prev);
            next.has(colId) ? next.delete(colId) : next.add(colId);
            return next;
        });
    };

    const handleAddSection = () => {
        setSections((prev) => [...prev, makeSection(undefined, prev.length + 1)]);
    };

    const handleRemoveSection = (sectionId) => {
        setSections((prev) => {
            const sec = prev.find((s) => s.id === sectionId);
            if (sec) {
                const freed = sec.rows.flatMap((r) => r.filter(Boolean).map((c) => c.id));
                setPlacedColIds((p)     => { const n = new Set(p); freed.forEach((id) => n.delete(id)); return n; });
                setRequiredFields((p)   => { const n = new Set(p); freed.forEach((id) => n.delete(id)); return n; });
            }
            return prev.filter((s) => s.id !== sectionId);
        });
        setSectionRules((prev) => { const next = { ...prev }; delete next[sectionId]; return next; });
    };

    const handleRenameSection = (sectionId, newTitle) => {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s)));
    };

    // ── Child board handlers (unchanged) ─────────────────────────────────────
    const childKey = (cb) => `${cb.boardId}::${cb.columnId}`;

    const handleChildDragStart = (e, child) => {
        childDragRef.current = child;
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleChildDrop = (e) => {
        e.preventDefault();
        const child = childDragRef.current;
        childDragRef.current = null;
        if (!child) return;
        const key = childKey(child);
        if (placedChildBoards.some((p) => childKey(p) === key)) return;
        const defaultLabel = `${child.boardName} (${child.columnLabel})`;
        setPlacedChildBoards((prev) => [
            ...prev,
            { boardId: child.boardId, boardName: child.boardName, columnId: child.columnId, columnLabel: child.columnLabel, label: defaultLabel, columns: ["name"] },
        ]);
    };

    const handleChildDragOver = (e) => {
        if (!childDragRef.current) { e.dataTransfer.dropEffect = "none"; return; }
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleRemoveChildBoard = (key) => {
        setPlacedChildBoards((prev) => prev.filter((p) => childKey(p) !== key));
        if (colPickerBoardKey === key) setColPickerBoardKey(null);
    };

    const handleRenameChildBoard = (key, newLabel) => {
        setPlacedChildBoards((prev) => prev.map((p) => (childKey(p) === key ? { ...p, label: newLabel } : p)));
    };

    const handleOpenColPicker = async (child) => {
        const key = childKey(child);
        setColPickerBoardKey((cur) => (cur === key ? null : key));
        if (!colPickerData[child.boardId]) {
            try {
                const res = await getBoardColumns(child.boardId);
                if (res.success) setColPickerData((prev) => ({ ...prev, [child.boardId]: res.columns }));
            } catch (_) {}
        }
    };

    const handleToggleChildColumn = (key, colId) => {
        if (colId === "name") return;
        setPlacedChildBoards((prev) =>
            prev.map((p) => {
                if (childKey(p) !== key) return p;
                const cols = p.columns || ["name"];
                const next = cols.includes(colId) ? cols.filter((c) => c !== colId) : [...cols, colId];
                return { ...p, columns: next.includes("name") ? next : ["name", ...next] };
            })
        );
    };

    // ── Field visibility rule handlers (unchanged) ───────────────────────────
    const openVisRulesModal  = (col) => setVisRulesModalColId(col.id);
    const closeVisRulesModal = ()    => setVisRulesModalColId(null);

    const saveVisRulesForField = (colId, rulesData) => {
        setFieldVisibilityRules((prev) => {
            if (!rulesData || rulesData.conditions.length === 0) {
                const n = { ...prev }; delete n[colId]; return n;
            }
            return { ...prev, [colId]: rulesData };
        });
        setVisRulesModalColId(null);
    };

    // ── Field config handlers (helptext, maxValues, maxFiles) ─────────────────
    const openConfigModal  = (col) => setConfigModalColId(col.id);
    const closeConfigModal = ()    => setConfigModalColId(null);

    const saveFieldConfig = (colId, cfg) => {
        setFieldConfigs((prev) => {
            if (!cfg || Object.keys(cfg).length === 0) {
                const n = { ...prev }; delete n[colId]; return n;
            }
            return { ...prev, [colId]: cfg };
        });
        setConfigModalColId(null);
    };

    // ── Section rule handlers (unchanged) ────────────────────────────────────
    const openRulesModal  = (sectionId) => setRulesModalSectionId(sectionId);
    const closeRulesModal = () => setRulesModalSectionId(null);
    const saveRulesForSection = (sectionId, rulesData) => {
        setSectionRules((prev) => ({ ...prev, [sectionId]: rulesData }));
        setRulesModalSectionId(null);
    };

    // ── Board-level validation rule handlers ─────────────────────────────────
    const handleAddValidationRule = () => {
        // Open modal with a blank rule template
        setValRuleModalData({
            id:          makeRuleId(),
            name:        "",
            mode:        "simple",
            expression:  "",
            error:       "",
            fields:      [],
            simpleRows:  [],
            _isNew:      true,
        });
    };

    const handleDeleteValidationRule = (ruleId) => {
        setValidationRules((prev) => prev.filter((r) => r.id !== ruleId));
    };

    const handleEditValidationRule = (rule) => {
        setValRuleModalData({ ...rule });
    };

    const handleSaveValidationRule = (savedRule) => {
        const isNew = savedRule._isNew;
        const clean = { ...savedRule };
        delete clean._isNew;
        setValidationRules((prev) =>
            isNew ? [...prev, clean] : prev.map((r) => r.id === clean.id ? clean : r)
        );
        setValRuleModalData(null);
    };

    // ── SAVE ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedBoard) return;
        setSaving(true);
        setSaveMsg(null);

        try {
            const plsCols = await ensurePLSCols();

            const sectionsJson = serialiseSectionsJSON(
                sections, requiredFields, sectionRules, fieldVisibilityRules, fieldConfigs
            );
            
            const childBoardsJson = JSON.stringify(
                placedChildBoards.map(({ boardId, label, columnId, columns }) => ({
                    boardId, label, columnId, columns: columns || [],
                }))
            );

            const validationRulesJson = JSON.stringify(validationRules);

            const columnValues = {
                [plsCols.boardIdColId]:  String(selectedBoard.id),
                [plsCols.sectionsColId]: sectionsJson,
                ...(plsCols.childBoardsColId     ? { [plsCols.childBoardsColId]:     childBoardsJson      } : {}),
                ...(plsCols.validationRulesColId ? { [plsCols.validationRulesColId]: validationRulesJson  } : {}),
            };

            if (layoutRecordId) {
                const mutation = `
                    mutation($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
                        change_multiple_column_values(
                            board_id: $boardId
                            item_id: $itemId
                            column_values: $columnValues
                        ) { id }
                    }
                `;
                await monday.api(mutation, {
                    variables: {
                        boardId:      String(PAGELAYOUTSECTION_BOARDID),
                        itemId:       String(layoutRecordId),
                        columnValues: JSON.stringify(columnValues),
                    },
                });
                setSaveMsg({ type: "success", text: `Layout updated — ${sections.length} section(s) saved.` });
            } else {
                const mutation = `
                    mutation($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
                        create_item(
                            board_id: $boardId
                            item_name: $itemName
                            column_values: $columnValues
                        ) { id }
                    }
                `;
                const res = await monday.api(mutation, {
                    variables: {
                        boardId: String(PAGELAYOUTSECTION_BOARDID),
                        itemName: (layoutItemName.trim() || `${selectedBoard.name} Layout`),
                        columnValues: JSON.stringify(columnValues),
                    },
                });
                const newId = res?.data?.create_item?.id;
                if (newId) {
                    setLayoutRecordId(newId);
                    setSaveMsg({ type: "success", text: `Layout created — ${sections.length} section(s) saved.` });
                } else {
                    throw new Error("create_item returned no ID");
                }
            }
        } catch (err) {
            console.error("[PLB] Save error:", err);
            setSaveMsg({ type: "error", text: "Save failed: " + err.message });
        } finally {
            setSaving(false);
        }
    };

    // ── Derived
    const availableCols        = columns.filter((c) => !placedColIds.has(c.id));
    const connectedCols        = columns.filter((c) => c.type === "board_relation");
    const isLoading            = columnsLoading || layoutLoading;
    const placedChildKeys      = new Set(placedChildBoards.map((p) => `${p.boardId}::${p.columnId}`));
    const availableChildBoards = allChildBoards.filter((c) => !placedChildKeys.has(`${c.boardId}::${c.columnId}`));

    // ── Helper: find a column object across all sections by ID
    const findModalCol = (colId) => {
        for (const sec of sections)
            for (const row of sec.rows)
                for (const col of row)
                    if (col && col.id === colId) return col;
        return null;
    };

    return (
        <div className="plb-app">
            {/* Section Visibility Rules Modal */}
            {rulesModalSectionId && (() => {
                const modalSection = sections.find((s) => s.id === rulesModalSectionId);
                if (!modalSection) return null;
                return (
                    <SectionRulesModal
                        section={modalSection}
                        rulesData={sectionRules[rulesModalSectionId] || { rules: [], criteria: "ALL" }}
                        onSave={(rulesData) => saveRulesForSection(rulesModalSectionId, rulesData)}
                        onClose={closeRulesModal}
                    />
                );
            })()}

            {/* Field Visibility Rules Modal */}
            {visRulesModalColId && (() => {
                const modalCol = findModalCol(visRulesModalColId);
                if (!modalCol) return null;
                return (
                    <FieldVisibilityModal
                        col={modalCol}
                        allColumns={columns}
                        rulesData={fieldVisibilityRules[visRulesModalColId] || { conditions: [], criteria: "ALL" }}
                        onSave={(rulesData) => saveVisRulesForField(visRulesModalColId, rulesData)}
                        onClose={closeVisRulesModal}
                    />
                );
            })()}

            {/* Field Config Modal (gear icon) */}
            {configModalColId && (() => {
                const modalCol = findModalCol(configModalColId);
                if (!modalCol) return null;
                return (
                    <FieldConfigModal
                        col={modalCol}
                        configData={fieldConfigs[configModalColId] || null}
                        onSave={(cfg) => saveFieldConfig(configModalColId, cfg)}
                        onClose={closeConfigModal}
                    />
                );
            })()}

            {/* Validation Rule Editor Modal */}
            {valRuleModalData && (
                <ValidationRuleModal
                    rule={valRuleModalData}
                    allColumns={columns}
                    onSave={handleSaveValidationRule}
                    onClose={() => setValRuleModalData(null)}
                />
            )}

            {/* Topbar */}
            <header className="plb-topbar">
                <div className="plb-topbar-left">
                    <span className="plb-logo-icon"><Icon.Board /></span>
                    <h1 className="plb-app-title">Page Layout Builder</h1>
                </div>
                {selectedBoard && (
                    <div className="plb-topbar-right">
                        <span className="plb-board-pill">
                            <Icon.Board />
                            <span>{selectedBoard.name}</span>
                            <code>{selectedBoard.id}</code>
                        </span>
                        {layoutRecordId && (
                            <span className="plb-record-pill" title={`Layout record ID: ${layoutRecordId}`}>
                                ✓ Record #{layoutRecordId}
                            </span>
                        )}
                        <button
                            className={`plb-save-btn ${saving ? "loading" : ""}`}
                            onClick={handleSave}
                            disabled={saving || sections.length === 0 || isLoading}
                        >
                            {saving ? <span className="plb-spinner-sm" /> : <Icon.Save />}
                            {saving ? "Saving…" : layoutRecordId ? "Update Layout" : "Save Layout"}
                        </button>
                    </div>
                )}
            </header>

            <div className="plb-body">
                <div className="plb-selector-row">
                    <label className="plb-selector-label">Board</label>
                    <BoardSelector boards={boards} loading={boardsLoading} error={boardsError} onSelect={handleBoardSelect} selectedBoard={selectedBoard} />
                    {selectedBoard && !isLoading && (
                        <span className="plb-selector-meta">
                            {columns.length} columns · {placedColIds.size} placed
                        </span>
                    )}
                </div>

                {saveMsg && (
                    <div className={`plb-toast ${saveMsg.type}`}>
                        <span className="plb-toast-icon">{saveMsg.type === "success" ? "✓" : "⚠️"}</span>
                        <span className="plb-toast-text">{saveMsg.text}</span>
                        <button className="plb-toast-close" onClick={() => setSaveMsg(null)}>×</button>
                    </div>
                )}

                {!selectedBoard && !boardsLoading && !boardsError && (
                    <div className="plb-empty">
                        <div className="plb-empty-icon"><Icon.Board /></div>
                        <h2>Select a board to begin</h2>
                        <p>Choose a board from the dropdown. Its columns and any previously saved layout will load automatically.</p>
                    </div>
                )}

                {selectedBoard && isLoading && (
                    <div className="plb-loading">
                        <div className="plb-spinner-lg" />
                        <span>{columnsLoading ? "Loading board columns…" : "Loading existing layout…"}</span>
                    </div>
                )}

                {columnsError && (
                    <div className="plb-error-box">
                        <span>⚠️</span>
                        <div><strong>Could not load columns</strong><p>{columnsError}</p></div>
                    </div>
                )}

                {selectedBoard && !isLoading && !columnsError && (
                    <div className="plb-workspace">
                        {/* Palette */}
                        <div className="plb-palette">
                            <div className="palette-block">
                                <div className="palette-block-hdr">
                                    <Icon.Board />
                                    <span>Board Columns</span>
                                    <span className="palette-badge">{availableCols.length} available</span>
                                </div>
                                <div className="palette-chips">
                                    {availableCols.length === 0 ? (
                                        <p className="palette-empty">All columns are placed in the layout.</p>
                                    ) : (
                                        availableCols.map((col) => <ColumnChip key={col.id} col={col} onDragStart={handlePaletteDragStart} />)
                                    )}
                                </div>
                            </div>

                            {connectedCols.length > 0 && (
                                <div className="palette-block">
                                    <div className="palette-block-hdr">
                                        <Icon.Link />
                                        <span>Connected Boards</span>
                                        <span className="palette-badge">{connectedCols.length}</span>
                                    </div>
                                    <div className="palette-chips">
                                        {connectedCols.map((col) => {
                                            let info = col.title;
                                            try {
                                                const s = JSON.parse(col.settings_str || "{}");
                                                if (s.boardIds?.length) info += ` → ${s.boardIds.join(", ")}`;
                                            } catch (_) {}
                                            return (
                                                <div key={col.id} className="conn-chip">
                                                    <span className="col-chip-dot" style={{ background: "#0073ea" }} />
                                                    <span>{info}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="palette-block child-boards-palette-block">
                                <div className="palette-block-hdr">
                                    <Icon.Link />
                                    <span>Related Boards</span>
                                    {childBoardsLoading
                                        ? <span className="plb-spinner-sm" style={{marginLeft:"auto"}} />
                                        : <span className="palette-badge">{availableChildBoards.length} available</span>
                                    }
                                </div>
                                <div className="palette-chips">
                                    {!childBoardsLoading && availableChildBoards.length === 0 && allChildBoards.length === 0 && (
                                        <p className="palette-empty">No boards link to this board.</p>
                                    )}
                                    {!childBoardsLoading && availableChildBoards.length === 0 && allChildBoards.length > 0 && (
                                        <p className="palette-empty">All related boards are placed below.</p>
                                    )}
                                    {!childBoardsLoading && availableChildBoards.map((cb) => (
                                        <div
                                            key={`${cb.boardId}::${cb.columnId}`}
                                            className="col-chip child-chip"
                                            draggable
                                            onDragStart={(e) => handleChildDragStart(e, cb)}
                                            title={`Drag to add: ${cb.boardName} via "${cb.columnLabel}"`}
                                        >
                                            <span className="col-chip-dot" style={{ background: "#7e3b8a" }} />
                                            <span className="col-chip-name">{cb.boardName}</span>
                                            <span className="col-chip-type">{cb.columnLabel}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="plb-canvas">
                            <div className="canvas-hdr">
                                <div style={{ flex: 1 }}>
                                    {layoutRecordId ? (
                                        <h2 className="canvas-title">{layoutItemName || `${selectedBoard?.name} Layout`}</h2>
                                    ) : (
                                        <div className="canvas-title-edit-wrap">
                                            <input
                                                className="canvas-title-input"
                                                type="text"
                                                value={layoutItemName}
                                                placeholder={`${selectedBoard?.name} Layout`}
                                                onChange={(e) => setLayoutItemName(e.target.value)}
                                                maxLength={80}
                                            />
                                        </div>
                                    )}
                                    <p className="canvas-hint">Drag columns from above · Double-click section names to rename · ⭐ toggles required</p>
                                </div>
                            </div>

                            <div className="canvas-sections">
                                {sections.map((sec) => (
                                    <Section
                                        key={sec.id}
                                        section={sec}
                                        onRemoveField={handleRemoveField}
                                        onRemoveSection={handleRemoveSection}
                                        onRenameSection={handleRenameSection}
                                        onDragStartField={handleFieldDragStart}
                                        onDropInSlot={handleDropInSlot}
                                        onToggleRequired={handleToggleRequired}
                                        requiredFields={requiredFields}
                                        onOpenRules={openRulesModal}
                                        sectionRulesData={sectionRules[sec.id] || null}
                                        fieldVisibilityRules={fieldVisibilityRules}
                                        onOpenVisRules={openVisRulesModal}
                                        fieldConfigs={fieldConfigs}
                                        onOpenConfig={openConfigModal}
                                    />
                                ))}
                            </div>

                            <button className="canvas-new-section" onClick={handleAddSection}>
                                <Icon.Plus /> New Section
                            </button>

                            {/* Related Lists zone */}
                            <div
                                className={`rl-zone ${childDragRef.current ? "rl-zone-drag-active" : ""}`}
                                onDragOver={handleChildDragOver}
                                onDrop={handleChildDrop}
                                onDragEnter={(e) => { if (childDragRef.current) e.currentTarget.classList.add("rl-zone-over"); }}
                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove("rl-zone-over"); }}
                            >
                                <div className="rl-zone-header" onClick={() => setChildBoardsCollapsed(p => !p)}>
                                    <div className="rl-zone-header-left">
                                        <span className="rl-zone-icon"><Icon.Link /></span>
                                        <h3 className="rl-zone-title">Related Lists</h3>
                                        <span className="rl-zone-badge">{placedChildBoards.length}</span>
                                    </div>
                                    <div className="rl-zone-header-right">
                                        <span className="rl-zone-hint">Drag related boards here</span>
                                        <span className={`rl-zone-caret ${childBoardsCollapsed ? "" : "open"}`}><Icon.Chevron /></span>
                                    </div>
                                </div>

                                {!childBoardsCollapsed && (
                                    <div className="rl-zone-body">
                                        {placedChildBoards.length === 0 ? (
                                            <div className="rl-empty">
                                                <span className="rl-empty-icon">🔗</span>
                                                <p>Drag related boards from the palette above to add them here.</p>
                                            </div>
                                        ) : (
                                            <div className="rl-cards">
                                                {placedChildBoards.map((child) => {
                                                    const key = childKey(child);
                                                    const pickerOpen = colPickerBoardKey === key;
                                                    const boardCols  = colPickerData[child.boardId] || [];
                                                    return (
                                                        <PlacedChildBoardCard
                                                            key={key}
                                                            child={child}
                                                            cardKey={key}
                                                            pickerOpen={pickerOpen}
                                                            boardCols={boardCols}
                                                            onOpenColPicker={() => handleOpenColPicker(child)}
                                                            onToggleCol={(colId) => handleToggleChildColumn(key, colId)}
                                                            onRemove={() => handleRemoveChildBoard(key)}
                                                            onRename={(newLabel) => handleRenameChildBoard(key, newLabel)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Validation Rules zone */}
                            <ValidationRulesZone
                                rules={validationRules}
                                collapsed={valRulesCollapsed}
                                onToggleCollapsed={() => setValRulesCollapsed(p => !p)}
                                onAddRule={handleAddValidationRule}
                                onDeleteRule={handleDeleteValidationRule}
                                onEditRule={handleEditValidationRule}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
