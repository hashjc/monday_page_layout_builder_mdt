import React, { useState, useEffect, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { getAllBoards } from "./hooks/boards";
import { getBoardColumns, getChildBoards } from "./hooks/boardMetadata";
import { PAGELAYOUTSECTION_BOARDID } from "./config_constants";
import {
    PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS,
    PAGELAYOUT_COL_TITLE_CHILD_BOARDS,
} from "./config_constants";
import { getPageLayoutSectionRecords } from "./hooks/pageLayoutBuilderUtils";
import { getOperatorsForType, operatorNeedsValue } from "./fieldVisibilityConfig";
import {
    getValidityOperatorsForType,
    getValidityValueInputType,
    supportsValidityRules,
} from "./fieldValidityConfig";

import "./App.css";

const monday = mondaySdk();

// ─── Constants ────────────────────────────────────────────────────────────────
const PLS_COL_TITLE_BOARDID      = PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID;
const PLS_COL_TITLE_SECTIONS     = PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS;
const PLS_COL_TITLE_CHILD_BOARDS = PAGELAYOUT_COL_TITLE_CHILD_BOARDS;

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
    // ── NEW: CheckShield — distinct coloured icon for validity rules ──────────
    // Rendered in green (#00c875) via CSS class lfield-validity[.active]
    CheckShield: () => (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
                d="M7 1.5L2 3.5v3.75C2 10.1 4.24 12.6 7 13.5c2.76-.9 5-3.4 5-6.25V3.5L7 1.5z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
            />
            <path
                d="M4.5 7l1.75 1.75L9.5 5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
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
    files:          { color: "#6c8ebf", label: "Files" },
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

const RULES_FIELD_TYPES = new Set(["people", "board_relation"]);

/** Convert a section's rows + requiredSet → flat fields array (for JSON storage) */
const rowsToFields = (rows, requiredSet, fieldVisRules = {}, fieldValRules = {}, fieldHelpTexts = {}) =>
    rows.flatMap((row) =>
        row.filter(Boolean).map((col) => {
            const field = {
                id: `field_${col.id}`,
                columnId: col.id,
                type: col.type,
                isRequired: requiredSet.has(col.id) ? "true" : "false",
            };
            if (RULES_FIELD_TYPES.has(col.type)) {
                field.maxValues = 1000;
            }
            // Embed help text if defined
            const ht = fieldHelpTexts[col.id];
            if (ht && ht.trim()) {
                field.helptext = ht.trim();
            }
            // Embed field-level visibility rules if any defined
            const vr = fieldVisRules[col.id];
            if (vr && Array.isArray(vr.conditions) && vr.conditions.length > 0) {
                field.visibilityRules = {
                    conditions: vr.conditions,
                    criteria: vr.criteria || "ALL",
                };
            }
            // Embed field-level validity rules if any defined
            const vl = fieldValRules[col.id];
            if (vl && Array.isArray(vl.conditions) && vl.conditions.length > 0) {
                field.validityRules = {
                    conditions: vl.conditions,
                    criteria: vl.criteria || "ALL",
                    ...(vl.error ? { error: vl.error } : {}),
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

function serialiseSectionsJSON(sections, requiredFields, sectionRules, fieldVisRules = {}, fieldValRules = {}, fieldHelpTexts = {}) {
    const payload = sections.map((sec, idx) => {
        const fields = rowsToFields(sec.rows, requiredFields, fieldVisRules, fieldValRules, fieldHelpTexts);

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
    const valRulesMap = {}; // { [columnId]: { conditions, criteria, error? } }
    const helpTextMap = {}; // { [columnId]: string }

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
                    // Restore help text
                    if (fieldDef?.helptext) {
                        helpTextMap[col.id] = fieldDef.helptext;
                    }
                    // Restore visibility rules
                    if (fieldDef?.visibilityRules?.conditions?.length) {
                        visRulesMap[col.id] = {
                            conditions: fieldDef.visibilityRules.conditions,
                            criteria:   fieldDef.visibilityRules.criteria || "ALL",
                        };
                    }
                    // Restore validity rules (including error message)
                    if (fieldDef?.validityRules?.conditions?.length) {
                        valRulesMap[col.id] = {
                            conditions: fieldDef.validityRules.conditions,
                            criteria:   fieldDef.validityRules.criteria || "ALL",
                            ...(fieldDef.validityRules.error ? { error: fieldDef.validityRules.error } : {}),
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
        fieldValidityRules:   valRulesMap,
        fieldHelpTexts:       helpTextMap,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION RULES MODAL (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function SectionRulesModal({ section, rulesData, onSave, onClose }) {
    const [rules, setRules] = useState(() =>
        (rulesData?.rules || []).map((r, i) => ({ ...r, id: r.id || `rule_${Date.now()}_${i}` }))
    );
    const [criteria, setCriteria] = useState(rulesData?.criteria || "ALL");

    const addRule = () =>
        setRules((prev) => [...prev, { id: `rule_${Date.now()}`, field: "title", operator: "equals", value: "" }]);

    const updateRule = (id, key, val) =>
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

    const removeRule = (id) =>
        setRules((prev) => prev.filter((r) => r.id !== id));

    const handleSave = () => {
        const validRules = rules.filter((r) => r.value.trim() !== "");
        onSave({ rules: validRules, criteria });
    };

    const criteriaLabel =
        rules.length < 2 ? null : rules.map((_, i) => i + 1).join(criteria === "ALL" ? " AND " : " OR ");

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
                            <span className="srm-criteria-label">Match:</span>
                            <div className="srm-criteria-toggle">
                                <button className={`srm-criteria-btn ${criteria === "ALL" ? "active" : ""}`} onClick={() => setCriteria("ALL")}>
                                    ALL rules (AND)
                                </button>
                                <button className={`srm-criteria-btn ${criteria === "ANY" ? "active" : ""}`} onClick={() => setCriteria("ANY")}>
                                    ANY rule (OR)
                                </button>
                            </div>
                            <div className="srm-criteria-preview">
                                <span className="srm-criteria-preview-label">Logic:</span>
                                <code>{criteriaLabel}</code>
                            </div>
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
// Changes: added hasValRules prop + CheckShield validity button + helpText
// ─────────────────────────────────────────────────────────────────────────────
function LayoutField({ col, isRequired, hasVisRules, hasValRules, helpText, onRemove, onDragStart, onToggleRequired, onOpenVisRules, onOpenValRules, onHelpTextChange }) {
    const meta = getTypeMeta(col.type);
    const stopDrag = (e) => e.stopPropagation();
    const showValidity = supportsValidityRules(col.type);
    const [helpFocused, setHelpFocused] = useState(false);

    return (
        <div
            className={`lfield ${isRequired ? "required" : ""} ${hasVisRules ? "has-vis-rules" : ""} ${hasValRules ? "has-val-rules" : ""} ${helpText ? "has-helptext" : ""}`}
            draggable
            onDragStart={(e) => onDragStart(e, col)}
        >
            <div className="lfield-main-row">
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
                <button
                    className={`lfield-eye ${hasVisRules ? "active" : ""}`}
                    onMouseDown={stopDrag}
                    onClick={(e) => { e.stopPropagation(); onOpenVisRules(col); }}
                    title={hasVisRules ? "Edit visibility rules" : "Add visibility rules"}
                >
                    <Icon.Eye />
                    {hasVisRules && <span className="lfield-eye-badge" />}
                </button>
                {/* Validity button — only shown for supported column types */}
                {showValidity && (
                    <button
                        className={`lfield-validity ${hasValRules ? "active" : ""}`}
                        onMouseDown={stopDrag}
                        onClick={(e) => { e.stopPropagation(); onOpenValRules(col); }}
                        title={hasValRules ? "Edit validity rules" : "Add validity rules"}
                    >
                        <Icon.CheckShield />
                        {hasValRules && <span className="lfield-validity-badge" />}
                    </button>
                )}
                <button
                    className="lfield-remove"
                    onMouseDown={stopDrag}
                    onClick={() => onRemove(col.id)}
                    title="Remove field"
                >
                    <Icon.Trash />
                </button>
            </div>
            {/* Help text row — revealed on hover/focus */}
            <div className={`lfield-helptext-row ${helpText || helpFocused ? "visible" : ""}`}>
                <span className="lfield-helptext-icon">💬</span>
                <input
                    className="lfield-helptext-input"
                    type="text"
                    value={helpText || ""}
                    placeholder="Add help text (optional)…"
                    onMouseDown={stopDrag}
                    onFocus={() => setHelpFocused(true)}
                    onBlur={() => setHelpFocused(false)}
                    onChange={(e) => onHelpTextChange(col.id, e.target.value)}
                />
            </div>
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
    fieldValidityRules, onOpenValRules,
    fieldHelpTexts, onHelpTextChange,
}) {
    const [overSlot, setOverSlot] = useState(null);
    return (
        <div className="ls-row">
            {[0, 1].map((slotIdx) => {
                const col = row[slotIdx];
                return (
                    <div
                        key={slotIdx}
                        className={`ls-slot ${!col ? "empty" : ""} ${overSlot === slotIdx ? "drag-over" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setOverSlot(slotIdx); }}
                        onDragLeave={() => setOverSlot(null)}
                        onDrop={(e) => { setOverSlot(null); onDropInSlot(e, sectionId, rowIndex, slotIdx); }}
                    >
                        {col ? (
                            <LayoutField
                                col={col}
                                isRequired={requiredFields.has(col.id)}
                                hasVisRules={!!(fieldVisibilityRules?.[col.id]?.conditions?.length)}
                                hasValRules={!!(fieldValidityRules?.[col.id]?.conditions?.length)}
                                helpText={fieldHelpTexts?.[col.id] || ""}
                                onRemove={(id) => onRemoveField(sectionId, rowIndex, slotIdx, id)}
                                onDragStart={onDragStartField}
                                onToggleRequired={onToggleRequired}
                                onOpenVisRules={onOpenVisRules}
                                onOpenValRules={onOpenValRules}
                                onHelpTextChange={onHelpTextChange}
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
    fieldValidityRules, onOpenValRules,
    fieldHelpTexts, onHelpTextChange,
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
                        <Icon.Gear />
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
                        fieldValidityRules={fieldValidityRules}
                        onOpenValRules={onOpenValRules}
                        fieldHelpTexts={fieldHelpTexts}
                        onHelpTextChange={onHelpTextChange}
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
// FIELD VALIDITY MODAL  ← NEW
//
// Mirrors FieldVisibilityModal in structure. Key differences:
//   • Uses getValidityOperatorsForType instead of getOperatorsForType
//   • fieldId picklist includes the field itself (self-referencing is common)
//   • Header icon is CheckShield (green), explainer explains "must pass" semantics
//   • Same free-form criteria expression as visibility
// ─────────────────────────────────────────────────────────────────────────────
function FieldValidityModal({ col, allColumns, rulesData, onSave, onClose }) {
    // Unlike visibility, we include the field itself in the picklist (self-referencing)
    const availableCols = allColumns;

    const makeCondition = () => ({
        id:       `val_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        source:   "field",
        fieldId:  col.id,
        operator: getValidityOperatorsForType(col.type)[0]?.id || "not_equals",
        value:    null,
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
    const [saveError, setSaveError]       = useState("");
    const [errorMsg, setErrorMsg]         = useState(rulesData?.error ?? `${col.title} has an error`);

    const addCondition    = () => { setSaveError(""); setConditions((prev) => [...prev, makeCondition()]); };
    const removeCondition = (id) => { setSaveError(""); setConditions((prev) => prev.filter((c) => c.id !== id)); };

    const updateCondition = (id, key, val) => {
        setConditions((prev) => prev.map((c) => {
            if (c.id !== id) return c;
            const updated = { ...c, [key]: val };
            if (key === "fieldId") {
                const srcCol     = allColumns.find((ac) => ac.id === val);
                const ops        = srcCol ? getValidityOperatorsForType(srcCol.type) : [];
                updated.operator = ops[0]?.id || "not_equals";
                updated.value    = null;
            }
            // All validity operators take a value (blank = null is valid),
            // so we never auto-clear the value when the operator changes.
            return updated;
        }));
    };

    const validateExpression = (expr, condCount) => {
        if (!expr) return "Please enter a logic expression (e.g. 1 AND 2).";
        if (!/^[\d\sANDOR()]+$/i.test(expr)) return "Invalid expression. Use condition numbers, AND, OR, and parentheses only.";
        const nums = expr.match(/\d+/g) || [];
        for (const n of nums) {
            const idx = parseInt(n, 10);
            if (idx < 1 || idx > condCount) return `Condition ${n} doesn't exist. Use numbers 1–${condCount}.`;
        }
        let depth = 0;
        for (const ch of expr) {
            if (ch === "(") depth++;
            if (ch === ")") depth--;
            if (depth < 0) return "Unbalanced parentheses in expression.";
        }
        if (depth !== 0) return "Unbalanced parentheses in expression.";
        return null; // valid
    };

    const handleSave = () => {
        setSaveError("");

        // Allow blank values — null means "blank" (e.g. not_equals+null = must not be empty).
        // Only reject conditions that have no fieldId at all.
        const validConditions = conditions
            .filter((c) => c.fieldId)
            .map((c) => ({
                ...c,
                // Normalise empty string → null so the JSON is consistent with the spec
                value: (c.value === "" || c.value === undefined) ? null : c.value,
            }));

        if (validConditions.length >= 2) {
            const err = validateExpression(criteriaExpr.trim(), validConditions.length);
            if (err) { setSaveError(err); return; }
        }
        const finalCriteria = validConditions.length >= 2
            ? criteriaExpr.trim().toUpperCase()
            : validConditions.length === 1 ? "1" : "";
        onSave(validConditions.length > 0
            ? { conditions: validConditions, criteria: finalCriteria, error: errorMsg.trim() || `${col.title} has an error` }
            : { conditions: [], criteria: "" });
    };

    const hasRules = conditions.length > 0;
    const colMeta  = getTypeMeta(col.type);

    return (
        <div className="fvm-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="fvm-modal fvm-modal--validity">
                {/* ── Header ── */}
                <div className="fvm-header">
                    <div className="fvm-header-left">
                        <div className="fvm-header-icon fvm-header-icon--validity">
                            <Icon.CheckShield />
                        </div>
                        <div>
                            <h2 className="fvm-title">Field Validity Rules</h2>
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

                {/* ── Body ── */}
                <div className="fvm-body">
                    <div className="fvm-explainer fvm-explainer--validity">
                        <span className="fvm-explainer-icon">✅</span>
                        <p>
                            This field's value must <strong>pass all conditions</strong> before the form can be submitted.
                            Leave empty for no validation.
                        </p>
                    </div>

                    <div className="fvm-conditions-list">
                        {conditions.length === 0 && (
                            <div className="fvm-empty">No conditions defined — field accepts any value.</div>
                        )}

                        {conditions.map((cond, idx) => {
                            const srcCol  = allColumns.find((c) => c.id === cond.fieldId);
                            const ops     = srcCol ? getValidityOperatorsForType(srcCol.type) : [{ id: "not_equals", label: "not equals", needsValue: true }];
                            const srcMeta = srcCol ? getTypeMeta(srcCol.type) : { color: "#9d99b9", label: "" };
                            const valInputType = getValidityValueInputType(srcCol?.type || "text");

                            return (
                                <div key={cond.id} className="fvm-condition-row">
                                    <span className="fvm-cond-num">{idx + 1}</span>
                                    <div className="fvm-source-badge">Field</div>

                                    {/* Field picklist — includes the field itself */}
                                    <select
                                        className="fvm-select fvm-select-field"
                                        value={cond.fieldId}
                                        onChange={(e) => updateCondition(cond.id, "fieldId", e.target.value)}
                                    >
                                        {availableCols.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.id === col.id ? `${c.title} (this field)` : c.title}
                                            </option>
                                        ))}
                                    </select>

                                    <span className="fvm-type-badge" style={{ background: srcMeta.color + "22", color: srcMeta.color }}>
                                        {srcMeta.label}
                                    </span>

                                    <select
                                        className="fvm-select fvm-select-op"
                                        value={cond.operator}
                                        onChange={(e) => updateCondition(cond.id, "operator", e.target.value)}
                                    >
                                        {ops.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
                                    </select>

                                    {/* Value input — always shown; leave blank to mean null/empty */}
                                    <input
                                        className="fvm-input"
                                        type={valInputType}
                                        value={cond.value === null || cond.value === undefined ? "" : cond.value}
                                        placeholder="blank"
                                        onChange={(e) => updateCondition(cond.id, "value", e.target.value)}
                                    />

                                    <button className="fvm-remove-btn" onClick={() => removeCondition(cond.id)} title="Remove condition">
                                        <Icon.Trash />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <button className="fvm-add-btn" onClick={addCondition}>
                        <Icon.Plus /> Add Condition
                    </button>

                    {conditions.length >= 2 && (
                        <div className="fvm-criteria">
                            <span className="fvm-criteria-label">Valid when:</span>
                            <div className="fvm-criteria-preview" style={{ marginBottom: "6px" }}>
                                <span className="fvm-criteria-preview-label">Available:</span>
                                <code>{conditions.map((_, i) => i + 1).join(", ")}</code>
                            </div>
                            <input
                                className="fvm-input"
                                type="text"
                                value={criteriaExpr}
                                placeholder="e.g. 1 AND 2 AND 3"
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

                    {/* ── Error message input ── always visible so user can customise it ── */}
                    <div className="fvm-error-msg-section">
                        <label className="fvm-error-msg-label">
                            <span className="fvm-error-msg-label-text">⚠️ Error message</span>
                            <span className="fvm-error-msg-required">shown to user on failed validation</span>
                        </label>
                        <input
                            className="fvm-input fvm-error-msg-input"
                            type="text"
                            value={errorMsg}
                            placeholder={`${col.title} has an error`}
                            onChange={(e) => setErrorMsg(e.target.value)}
                        />
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="fvm-footer">
                    {hasRules && (
                        <button className="fvm-clear-btn" onClick={() => { setConditions([]); setCriteriaExpr(""); setSaveError(""); }}>
                            Clear All Rules
                        </button>
                    )}
                    <div className="fvm-footer-right">
                        <button className="srm-btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="srm-btn-primary srm-btn-primary--validity" onClick={handleSave}>
                            <Icon.Check /> Save Rules
                        </button>
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

    const [sectionRules, setSectionRules]             = useState({});
    const [rulesModalSectionId, setRulesModalSectionId] = useState(null);

    // ── Field-level visibility rules ─────────────────────────────────────────
    const [fieldVisibilityRules, setFieldVisibilityRules] = useState({});
    const [visRulesModalColId, setVisRulesModalColId]     = useState(null);

    // ── Field-level validity rules ────────────────────────────────────────────
    const [fieldValidityRules, setFieldValidityRules]   = useState({});
    const [valRulesModalColId, setValRulesModalColId]   = useState(null);

    // ── Field help texts ──────────────────────────────────────────────────────
    const [fieldHelpTexts, setFieldHelpTexts] = useState({});

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
        const childBoardsCol = find(PLS_COL_TITLE_CHILD_BOARDS);
        plsColsRef.current = {
            boardIdColId:     boardIdCol.id,
            sectionsColId:    sectionsCol.id,
            childBoardsColId: childBoardsCol?.id || null,
        };
        return plsColsRef.current;
    };

    const fetchExistingLayout = async (boardId, columnsMap) => {
        setLayoutLoading(true);
        try {
            const plsCols = await ensurePLSCols();
            const matchingRecords = await getPageLayoutSectionRecords(boardId);

            if (matchingRecords.length === 0) {
                setLayoutRecordId(null);
                setSections([makeSection("Board Information", 1)]);
                setPlacedColIds(new Set());
                setRequiredFields(new Set());
                setSectionRules({});
                setFieldVisibilityRules({});
                setFieldValidityRules({});
                setFieldHelpTexts({});
                setPlacedChildBoards([]);
                return;
            }

            if (matchingRecords.length > 1) {
                console.warn(`[PLB] Found ${matchingRecords.length} records for board ${boardId} — using the first.`);
            }
            const record = matchingRecords[0];
            setLayoutRecordId(record.id);

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
                setSections([makeSection("Board Information", 1)]);
                setPlacedColIds(new Set());
                setRequiredFields(new Set());
                setSectionRules({});
                setFieldVisibilityRules({});
                setFieldValidityRules({});
                setFieldHelpTexts({});
                setPlacedChildBoards([]);
                return;
            }

            setSections(parsed.sections);
            setPlacedColIds(parsed.placedColIds);
            setRequiredFields(parsed.requiredFields);
            setSectionRules(parsed.sectionRules);
            setFieldVisibilityRules(parsed.fieldVisibilityRules || {});
            setFieldValidityRules(parsed.fieldValidityRules || {});
            setFieldHelpTexts(parsed.fieldHelpTexts || {});

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
            setSections([makeSection("Board Information", 1)]);
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
        setFieldValidityRules({});   // NEW
        setFieldHelpTexts({});
        setVisRulesModalColId(null);
        setValRulesModalColId(null); // NEW
        setLayoutRecordId(null);
        setSaveMsg(null);
        setPlacedChildBoards([]);
        setAllChildBoards([]);
        setColPickerBoardKey(null);
        setColPickerData({});

        const res = await getBoardColumns(board.id);
        setColumnsLoading(false);
        if (!res.success) { setColumnsError(res.error); return; }

        setColumns(res.columns);
        const columnsMap = Object.fromEntries(res.columns.map((c) => [c.id, c]));
        await fetchExistingLayout(board.id, columnsMap);

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
            const next   = prev.map((s) => ({ ...s, rows: s.rows.map((r) => [...r]) }));
            const target = next.find((s) => s.id === toSectionId);
            if (!target) return prev;
            const destCol = target.rows[toRow][toSlot];
            if (!fromPalette) {
                let src = null;
                for (const s of next)
                    for (let ri = 0; ri < s.rows.length; ri++)
                        for (let si = 0; si < 2; si++)
                            if (s.rows[ri][si]?.id === col.id) src = { s, ri, si };
                if (!src) return prev;
                src.s.rows[src.ri][src.si] = destCol;
                target.rows[toRow][toSlot] = col;
            } else {
                if (placedColIds.has(col.id)) return prev;
                if (destCol) return prev;
                target.rows[toRow][toSlot] = col;
                setPlacedColIds((p) => new Set([...p, col.id]));
            }
            const thisRow = target.rows[toRow];
            const rowFull = thisRow[0] !== null && thisRow[1] !== null;
            const isLast  = toRow === target.rows.length - 1;
            if (rowFull && isLast) target.rows.push([null, null]);
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
                setFieldValidityRules((p)   => { const n = { ...p }; delete n[removed.id]; return n; }); // NEW
                setFieldHelpTexts((p)       => { const n = { ...p }; delete n[removed.id]; return n; });
                setVisRulesModalColId((cur) => (cur === removed.id ? null : cur));
                setValRulesModalColId((cur) => (cur === removed.id ? null : cur));                        // NEW
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

    // ── Field validity rule handlers ─────────────────────────────────────────
    const openValRulesModal  = (col) => setValRulesModalColId(col.id);
    const closeValRulesModal = ()    => setValRulesModalColId(null);

    const saveValRulesForField = (colId, rulesData) => {
        setFieldValidityRules((prev) => {
            if (!rulesData || rulesData.conditions.length === 0) {
                const n = { ...prev }; delete n[colId]; return n;
            }
            return { ...prev, [colId]: rulesData };
        });
        setValRulesModalColId(null);
    };

    // ── Field help text handler ──────────────────────────────────────────────
    const handleHelpTextChange = (colId, value) => {
        setFieldHelpTexts((prev) =>
            value.trim() ? { ...prev, [colId]: value } : (() => { const n = { ...prev }; delete n[colId]; return n; })()
        );
    };

    // ── Section rule handlers (unchanged) ────────────────────────────────────
    const openRulesModal  = (sectionId) => setRulesModalSectionId(sectionId);
    const closeRulesModal = () => setRulesModalSectionId(null);
    const saveRulesForSection = (sectionId, rulesData) => {
        setSectionRules((prev) => ({ ...prev, [sectionId]: rulesData }));
        setRulesModalSectionId(null);
    };

    // ── SAVE ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedBoard) return;
        setSaving(true);
        setSaveMsg(null);

        try {
            const plsCols = await ensurePLSCols();

            // Pass fieldValidityRules as 5th arg to serialiser
            const sectionsJson = serialiseSectionsJSON(
                sections, requiredFields, sectionRules, fieldVisibilityRules, fieldValidityRules, fieldHelpTexts
            );
            console.log("[PLB] Saving sections JSON:", sectionsJson);

            const childBoardsJson = JSON.stringify(
                placedChildBoards.map(({ boardId, label, columnId, columns }) => ({
                    boardId, label, columnId, columns: columns || [],
                }))
            );

            const columnValues = {
                [plsCols.boardIdColId]:  String(selectedBoard.id),
                [plsCols.sectionsColId]: sectionsJson,
                ...(plsCols.childBoardsColId ? { [plsCols.childBoardsColId]: childBoardsJson } : {}),
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
                        boardId:      String(PAGELAYOUTSECTION_BOARDID),
                        itemName:     selectedBoard.name,
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

            {/* Field Validity Rules Modal ← NEW */}
            {valRulesModalColId && (() => {
                const modalCol = findModalCol(valRulesModalColId);
                if (!modalCol) return null;
                return (
                    <FieldValidityModal
                        col={modalCol}
                        allColumns={columns}
                        rulesData={fieldValidityRules[valRulesModalColId] || { conditions: [], criteria: "" }}
                        onSave={(rulesData) => saveValRulesForField(valRulesModalColId, rulesData)}
                        onClose={closeValRulesModal}
                    />
                );
            })()}

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
                                <div>
                                    <h2 className="canvas-title">Layout</h2>
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
                                        fieldValidityRules={fieldValidityRules}
                                        onOpenValRules={openValRulesModal}
                                        fieldHelpTexts={fieldHelpTexts}
                                        onHelpTextChange={handleHelpTextChange}
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
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
