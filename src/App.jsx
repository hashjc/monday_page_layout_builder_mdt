import React, { useState, useEffect, useRef } from "react";
import mondaySdk from "monday-sdk-js";
import { getAllBoards } from "./hooks/boards";
import { getBoardColumns } from "./hooks/boardMetadata";
import { PAGELAYOUTSECTION_BOARDID } from "./config_constants";
import {   PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER,
    PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS,
} from "./config_constants";
import { deleteItems } from "./hooks/items";
//const PLS_BOARDID =
import { getPageLayoutSectionRecords, parseLongTextJSON } from "./hooks/pageLayoutBuilderUtils";

import "./App.css";

const monday = mondaySdk();

// ─── Constants ───────────────────────────────────────────────────────────────
const PLS_COL_TITLE_BOARDID = PAGELAYOUTSECTION_COLUMN_TITLE_BOARDID;
const PLS_COL_TITLE_SECTIONS_JSON = PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONS;
const PLS_COL_TITLE_SECTIONS_ORDER = PAGELAYOUTSECTION_COLUMN_TITLE_SECTIONORDER;

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
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
    Star: () => (
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1l1.2 2.5H9l-1.8 1.4.7 2.6L5.5 6 3.1 7.5l.7-2.6L2 3.5h2.3z" fill="currentColor" />
        </svg>
    ),
};

// ─── Column type metadata ─────────────────────────────────────────────────────
const COL_TYPE_META = {
    name: { color: "#0073ea", label: "Name" },
    text: { color: "#6c8ebf", label: "Text" },
    long_text: { color: "#6c8ebf", label: "Long Text" },
    numbers: { color: "#fdab3d", label: "Numbers" },
    status: { color: "#00c875", label: "Status" },
    dropdown: { color: "#9d99b9", label: "Dropdown" },
    date: { color: "#7e3b8a", label: "Date" },
    people: { color: "#ff7575", label: "People" },
    board_relation: { color: "#0073ea", label: "Connect Boards" },
    checkbox: { color: "#00c875", label: "Checkbox" },
    email: { color: "#fdab3d", label: "Email" },
    phone: { color: "#fdab3d", label: "Phone" },
    formula: { color: "#9d99b9", label: "Formula" },
    mirror: { color: "#9d99b9", label: "Mirror" },
    doc: { color: "#6c8ebf", label: "Doc" },
    link: { color: "#0073ea", label: "Link" },
    rating: { color: "#fdab3d", label: "Rating" },
    files: { color: "#6c8ebf", label: "Files" },
    tags: { color: "#333", label: "Tags" },
    timeline: { color: "#0073ea", label: "Timeline" },
    dependency: { color: "#7e3b8a", label: "Dependency" },
};
const getTypeMeta = (type) => COL_TYPE_META[type] || { color: "#9d99b9", label: type };

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _sc = 1;
const makeSectionId = () => `s_${Date.now()}_${_sc++}`;

const makeSection = (title, order) => ({
    id: makeSectionId(),
    title: title || `Section ${_sc - 1}`,
    order: order ?? _sc - 1,
    isDefault: "false",
    recordId: null,
    rows: [[null, null]],
});

// Build flat fields array from rows (for save)
const rowsToFields = (rows, requiredSet) =>
    rows.flatMap((row) =>
        row.filter(Boolean).map((col) => ({
            id: `field_${col.id}`,
            columnId: col.id,
            label: col.title,
            type: col.type,
            isDefault: requiredSet.has(col.id) ? "true" : "false",
        })),
    );

// Rebuild rows from saved fields using columnsMap
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

// ═══════════════════════════════════════════════════════════════════════════════
// BOARD SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════
function BoardSelector({ boards, loading, error, onSelect, selectedBoard }) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
        };
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
                <div>
                    <strong>Could not load boards</strong>
                    <p>{error}</p>
                </div>
            </div>
        );

    return (
        <div className="bsel-wrap" ref={ref}>
            <div className={`bsel-trigger ${isOpen ? "open" : ""} ${loading ? "disabled" : ""}`} onClick={() => !loading && setIsOpen((p) => !p)}>
                {loading ? (
                    <span className="bsel-placeholder">
                        <span className="plb-spinner-sm" /> Loading boards…
                    </span>
                ) : selectedBoard ? (
                    <span className="bsel-value">
                        <span className="bsel-dot" />
                        <span className="bsel-name">{selectedBoard.name}</span>
                        {selectedBoard.workspace?.name && <span className="bsel-ws">{selectedBoard.workspace.name}</span>}
                    </span>
                ) : (
                    <span className="bsel-placeholder">Choose a board…</span>
                )}
                <span className={`bsel-caret ${isOpen ? "open" : ""}`}>
                    <Icon.Chevron />
                </span>
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
                                            onClick={() => {
                                                setIsOpen(false);
                                                setSearch("");
                                                onSelect(b);
                                            }}
                                        >
                                            <Icon.Board />
                                            <span className="bsel-opt-name">{b.name}</span>
                                            {selectedBoard?.id === b.id && (
                                                <span className="bsel-check">
                                                    <Icon.Check />
                                                </span>
                                            )}
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

// ═══════════════════════════════════════════════════════════════════════════════
// COLUMN CHIP
// ═══════════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT FIELD (inside a slot)
// ═══════════════════════════════════════════════════════════════════════════════
function LayoutField({ col, isRequired, onRemove, onDragStart, onToggleRequired }) {
    const meta = getTypeMeta(col.type);
    return (
        <div className={`lfield ${isRequired ? "required" : ""}`} draggable onDragStart={(e) => onDragStart(e, col)}>
            <span className="lfield-grip">
                <Icon.Grip />
            </span>
            <span className="lfield-dot" style={{ background: meta.color }} />
            <span className="lfield-name">{col.title}</span>
            <span className="lfield-type">{meta.label}</span>
            <button
                className={`lfield-req ${isRequired ? "on" : ""}`}
                onClick={() => onToggleRequired(col.id)}
                title={isRequired ? "Mark optional" : "Mark required"}
            >
                <Icon.Star />
                <span>{isRequired ? "Required" : "Optional"}</span>
            </button>
            <button className="lfield-remove" onClick={() => onRemove(col.id)} title="Remove field">
                <Icon.Trash />
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION ROW
// ═══════════════════════════════════════════════════════════════════════════════
function SectionRow({ row, rowIndex, sectionId, onRemoveField, onDragStartField, onDropInSlot, onToggleRequired, requiredFields }) {
    const [overSlot, setOverSlot] = useState(null);
    return (
        <div className="ls-row">
            {[0, 1].map((slotIdx) => {
                const col = row[slotIdx];
                return (
                    <div
                        key={slotIdx}
                        className={`ls-slot ${!col ? "empty" : ""} ${overSlot === slotIdx ? "drag-over" : ""}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setOverSlot(slotIdx);
                        }}
                        onDragLeave={() => setOverSlot(null)}
                        onDrop={(e) => {
                            setOverSlot(null);
                            onDropInSlot(e, sectionId, rowIndex, slotIdx);
                        }}
                    >
                        {col ? (
                            <LayoutField
                                col={col}
                                isRequired={requiredFields.has(col.id)}
                                onRemove={(id) => onRemoveField(sectionId, rowIndex, slotIdx, id)}
                                onDragStart={onDragStartField}
                                onToggleRequired={onToggleRequired}
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function Section({ section, onAddRow, onRemoveField, onRemoveSection, onRenameSection, onDragStartField, onDropInSlot, onToggleRequired, requiredFields }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(section.title);
    const inputRef = useRef(null);

    useEffect(() => {
        setTitle(section.title);
    }, [section.title]);
    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const commit = () => {
        setEditing(false);
        onRenameSection(section.id, title.trim() || section.title);
    };

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
                                if (e.key === "Escape") {
                                    setEditing(false);
                                    setTitle(section.title);
                                }
                            }}
                        />
                    ) : (
                        <h3 className="ls-title" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
                            {section.title}
                        </h3>
                    )}
                    {section.recordId && <span className="ls-saved-tag">✓ Saved</span>}
                </div>
                <div className="ls-header-actions">
                    <button className="ls-btn" onClick={() => setEditing(true)} title="Rename">
                        ✏️
                    </button>
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
                    />
                ))}
            </div>

            <button className="ls-add-row" onClick={() => onAddRow(section.id)}>
                <Icon.Plus /> Add Row
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
    console.log("App start 1802");
    const [boards, setBoards] = useState([]);
    const [boardsLoading, setBoardsLoading] = useState(true);
    const [boardsError, setBoardsError] = useState(null);
    const [selectedBoard, setSelectedBoard] = useState(null);

    const [columns, setColumns] = useState([]);
    const [columnsLoading, setColumnsLoading] = useState(false);
    const [columnsError, setColumnsError] = useState(null);

    const [sections, setSections] = useState([]);
    const [placedColIds, setPlacedColIds] = useState(new Set());
    const [requiredFields, setRequiredFields] = useState(new Set());
    const [layoutLoading, setLayoutLoading] = useState(false);

    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState(null); // { type, text }

    const dragRef = useRef(null);
    const plsColsRef = useRef(null); // cached PLS board column IDs
    const deletedRecordIds = useRef([]); // record IDs pending deletion on next Save

    // ── Load boards on mount
    useEffect(() => {
        getAllBoards().then((res) => {
            setBoardsLoading(false);
            if (res.success) setBoards(res.boards);
            else setBoardsError(res.error);
        });
    }, []);

    // ── Ensure we have PageLayoutSections board column IDs
    const ensurePLSCols = async () => {
        if (plsColsRef.current) return plsColsRef.current;
        const res = await getBoardColumns(String(PAGELAYOUTSECTION_BOARDID));
        if (!res.success) throw new Error("Cannot access PageLayoutSections board: " + res.error);
        const find = (title) => res.columns.find((c) => c.title === title);
        const boardIdCol = find(PLS_COL_TITLE_BOARDID);
        const sectionsCol = find(PLS_COL_TITLE_SECTIONS_JSON);
        const orderCol = find(PLS_COL_TITLE_SECTIONS_ORDER);
        if (!boardIdCol || !sectionsCol || !orderCol)
            throw new Error(
                `Missing required columns in PageLayoutSections board.\n` +
                    `Expected: "${PLS_COL_TITLE_BOARDID}", "${PLS_COL_TITLE_SECTIONS_JSON}", "${PLS_COL_TITLE_SECTIONS_ORDER}".\n` +
                    `Found: ${res.columns.map((c) => `"${c.title}"`).join(", ")}`,
            );
        plsColsRef.current = {
            boardIdColId: boardIdCol.id,
            sectionsColId: sectionsCol.id,
            orderColId: orderCol.id,
        };
        return plsColsRef.current;
    };

    // ── Fetch existing layout for a board
    const fetchExistingLayout = async (boardId, columnsMap) => {
        setLayoutLoading(true);
        try {
            const plsCols = await ensurePLSCols();
            const matchingRecords = await getPageLayoutSectionRecords(boardId, plsCols.boardIdColId);

            // Debug: log what we got back and whether sections parse correctly
            console.log("[PLB] fetchExistingLayout - matched", matchingRecords.length, "records for board", boardId);
            matchingRecords.forEach((item) => {
                const sv = item.column_values.find((c) => c.id === plsCols.sectionsColId);
                console.log(`[PLB] "${item.name}" sectionsCV.text:`, sv?.text?.slice(0, 150));
                console.log(`[PLB] "${item.name}" sectionsCV.value:`, sv?.value?.slice(0, 150));
                const parsed = parseLongTextJSON(sv);
                console.log(`[PLB] "${item.name}" parsed:`, parsed ? `OK - ${parsed.fields?.length ?? 0} fields` : "FAILED");
            });

            if (matchingRecords.length === 0) {
                setSections([makeSection("Board Information", 1)]);
                setPlacedColIds(new Set());
                setRequiredFields(new Set());
                return;
            }

            const placed = new Set();
            const required = new Set();

            const built = matchingRecords
                .map((item) => {
                    const sectionsCV = item.column_values.find((c) => c.id === plsCols.sectionsColId);
                    const orderCV = item.column_values.find((c) => c.id === plsCols.orderColId);
                    const order = parseInt(orderCV?.text || "0") || 0;

                    // KEY FIX: use parseLongTextJSON instead of safeParseSectionJSON
                    const sectionData = parseLongTextJSON(sectionsCV);

                    if (!sectionData) {
                        console.warn("[PLB] Skipping item - could not parse sectionData for:", item.name, item.id);
                        return null;
                    }

                    const rows = fieldsToRows(sectionData.fields || [], columnsMap);

                    rows.forEach((row) =>
                        row.forEach((col) => {
                            if (col) {
                                placed.add(col.id);
                                const field = (sectionData.fields || []).find((f) => f.columnId === col.id);
                                if (field?.isDefault === "true") required.add(col.id);
                            }
                        }),
                    );

                    return {
                        id: sectionData.id || makeSectionId(),
                        title: sectionData.title || item.name,
                        order,
                        isDefault: sectionData.isDefault || "false",
                        recordId: item.id,
                        rows,
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.order - b.order);

            setSections(built.length > 0 ? built : [makeSection("Board Information", 1)]);
            setPlacedColIds(placed);
            setRequiredFields(required);
        } catch (err) {
            console.error("[PLB] fetchExistingLayout error:", err);
            setSections([makeSection("Board Information", 1)]);
            setSaveMsg({ type: "error", text: "Could not load existing layout: " + err.message });
        } finally {
            setLayoutLoading(false);
        }
    };

    // ── Board selected
    const handleBoardSelect = async (board) => {
        setSelectedBoard(board);
        setColumnsLoading(true);
        setColumnsError(null);
        setColumns([]);
        setSections([]);
        setPlacedColIds(new Set());
        setRequiredFields(new Set());
        setSaveMsg(null);

        const res = await getBoardColumns(board.id);
        setColumnsLoading(false);
        if (!res.success) {
            setColumnsError(res.error);
            return;
        }
        setColumns(res.columns);

        const columnsMap = {};
        res.columns.forEach((c) => {
            columnsMap[c.id] = c;
        });
        await fetchExistingLayout(board.id, columnsMap);
    };

    // ── Drag handlers
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

            const destCol = target.rows[toRow][toSlot];

            if (!fromPalette) {
                // Reorder within layout — find source
                let src = null;
                for (const s of next) {
                    for (let ri = 0; ri < s.rows.length; ri++) {
                        for (let si = 0; si < 2; si++) {
                            if (s.rows[ri][si]?.id === col.id) src = { s, ri, si };
                        }
                    }
                }
                if (!src) return prev;
                src.s.rows[src.ri][src.si] = destCol; // swap
                target.rows[toRow][toSlot] = col;
            } else {
                // From palette
                if (placedColIds.has(col.id)) return prev;
                if (destCol) return prev; // occupied
                target.rows[toRow][toSlot] = col;
                setPlacedColIds((p) => new Set([...p, col.id]));
            }
            return next;
        });
    };

    const handleRemoveField = (sectionId, rowIdx, slotIdx) => {
        setSections((prev) => {
            const next = prev.map((s) => ({ ...s, rows: s.rows.map((r) => [...r]) }));
            const sec = next.find((s) => s.id === sectionId);
            if (!sec) return prev;
            const removed = sec.rows[rowIdx][slotIdx];
            sec.rows[rowIdx][slotIdx] = null;
            if (removed) {
                setPlacedColIds((p) => {
                    const n = new Set(p);
                    n.delete(removed.id);
                    return n;
                });
                setRequiredFields((p) => {
                    const n = new Set(p);
                    n.delete(removed.id);
                    return n;
                });
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

    const handleAddRow = (sectionId) => {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, rows: [...s.rows, [null, null]] } : s)));
    };

    const handleAddSection = () => {
        setSections((prev) => [...prev, makeSection(undefined, prev.length + 1)]);
    };

    const handleRemoveSection = (sectionId) => {
        setSections((prev) => {
            const sec = prev.find((s) => s.id === sectionId);
            if (sec) {
                // If this section was already saved to monday, queue its record for deletion on next Save
                if (sec.recordId) {
                    deletedRecordIds.current = [...deletedRecordIds.current, sec.recordId];
                }
                const freed = sec.rows.flatMap((r) => r.filter(Boolean).map((c) => c.id));
                setPlacedColIds((p) => {
                    const n = new Set(p);
                    freed.forEach((id) => n.delete(id));
                    return n;
                });
                setRequiredFields((p) => {
                    const n = new Set(p);
                    freed.forEach((id) => n.delete(id));
                    return n;
                });
            }
            return prev.filter((s) => s.id !== sectionId);
        });
    };

    const handleRenameSection = (sectionId, newTitle) => {
        setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s)));
    };

    // ── SAVE
    const handleSave = async () => {
        if (!selectedBoard) return;
        setSaving(true);
        setSaveMsg(null);

        let ok = 0,
            fail = 0;

        try {
            const plsCols = await ensurePLSCols();

            // ── Step 1: Delete any section records removed since last save ──────────
            if (deletedRecordIds.current.length > 0) {
                const toDelete = [...deletedRecordIds.current];
                console.log("[PLB] Deleting removed section records:", toDelete);
                const delResult = await deleteItems(toDelete);
                if (delResult.success) {
                    deletedRecordIds.current = []; // clear the queue on success
                    console.log("[PLB] Deleted", toDelete.length, "section record(s) successfully");
                } else {
                    // Don't block the rest of the save, but surface the error
                    console.error("[PLB] Failed to delete section records:", delResult.error);
                    fail += toDelete.length;
                }
            }

            // ── Step 2: Create / update each remaining section ──────────────────────
            for (let i = 0; i < sections.length; i++) {
                const sec = sections[i];
                const fields = rowsToFields(sec.rows, requiredFields);

                const sectionPayload = {
                    id: sec.id,
                    title: sec.title,
                    isDefault: sec.isDefault,
                    fields,
                };

                const columnValues = {
                    [plsCols.boardIdColId]: String(selectedBoard.id),
                    [plsCols.sectionsColId]: JSON.stringify(sectionPayload),
                    [plsCols.orderColId]: i + 1,
                };

                try {
                    if (sec.recordId) {
                        // UPDATE existing record
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
                                boardId: String(PAGELAYOUTSECTION_BOARDID),
                                itemId: String(sec.recordId),
                                columnValues: JSON.stringify(columnValues),
                            },
                        });
                        ok++;
                    } else {
                        // CREATE new record
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
                                itemName: sec.title,
                                columnValues: JSON.stringify(columnValues),
                            },
                        });
                        const newId = res?.data?.create_item?.id;
                        if (newId) {
                            // Patch state so next save updates rather than creates
                            setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, recordId: newId } : s)));
                        }
                        ok++;
                    }
                } catch (err) {
                    console.error(`[PLB] Error saving section "${sec.title}":`, err);
                    fail++;
                }
            }

            setSaveMsg(
                fail === 0
                    ? { type: "success", text: `Layout saved — ${ok} section${ok !== 1 ? "s" : ""} stored successfully.` }
                    : { type: "error", text: `Saved ${ok} section(s), but ${fail} failed. Check console for details.` },
            );
        } catch (err) {
            setSaveMsg({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    // ── Derived
    const availableCols = columns.filter((c) => !placedColIds.has(c.id));
    const connectedCols = columns.filter((c) => c.type === "board_relation");
    const isLoading = columnsLoading || layoutLoading;

    // ════════════════════════════════════════════════════════════════════════════
    return (
        <div className="plb-app">
            {/* Topbar */}
            <header className="plb-topbar">
                <div className="plb-topbar-left">
                    <span className="plb-logo-icon">
                        <Icon.Board />
                    </span>
                    <h1 className="plb-app-title">Page Layout Builder</h1>
                </div>
                {selectedBoard && (
                    <div className="plb-topbar-right">
                        <span className="plb-board-pill">
                            <Icon.Board />
                            <span>{selectedBoard.name}</span>
                            <code>{selectedBoard.id}</code>
                        </span>
                        <button
                            className={`plb-save-btn ${saving ? "loading" : ""}`}
                            onClick={handleSave}
                            disabled={saving || sections.length === 0 || isLoading}
                        >
                            {saving ? <span className="plb-spinner-sm" /> : <Icon.Save />}
                            {saving ? "Saving…" : "Save Layout"}
                        </button>
                    </div>
                )}
            </header>

            <div className="plb-body">
                {/* Board selector */}
                <div className="plb-selector-row">
                    <label className="plb-selector-label">Board</label>
                    <BoardSelector boards={boards} loading={boardsLoading} error={boardsError} onSelect={handleBoardSelect} selectedBoard={selectedBoard} />
                    {selectedBoard && !isLoading && (
                        <span className="plb-selector-meta">
                            {columns.length} columns · {placedColIds.size} placed
                        </span>
                    )}
                </div>

                {/* Save notification */}
                {saveMsg && (
                    <div className={`plb-toast ${saveMsg.type}`}>
                        <span className="plb-toast-icon">{saveMsg.type === "success" ? "✓" : "⚠️"}</span>
                        <span className="plb-toast-text">{saveMsg.text}</span>
                        <button className="plb-toast-close" onClick={() => setSaveMsg(null)}>
                            ×
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!selectedBoard && !boardsLoading && !boardsError && (
                    <div className="plb-empty">
                        <div className="plb-empty-icon">
                            <Icon.Board />
                        </div>
                        <h2>Select a board to begin</h2>
                        <p>Choose a board from the dropdown. Its columns and any previously saved layout will load automatically.</p>
                    </div>
                )}

                {/* Loading state */}
                {selectedBoard && isLoading && (
                    <div className="plb-loading">
                        <div className="plb-spinner-lg" />
                        <span>{columnsLoading ? "Loading board columns…" : "Loading existing layout…"}</span>
                    </div>
                )}

                {/* Column error */}
                {columnsError && (
                    <div className="plb-error-box">
                        <span>⚠️</span>
                        <div>
                            <strong>Could not load columns</strong>
                            <p>{columnsError}</p>
                        </div>
                    </div>
                )}

                {/* Main workspace */}
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
                                        onAddRow={handleAddRow}
                                        onRemoveField={handleRemoveField}
                                        onRemoveSection={handleRemoveSection}
                                        onRenameSection={handleRenameSection}
                                        onDragStartField={handleFieldDragStart}
                                        onDropInSlot={handleDropInSlot}
                                        onToggleRequired={handleToggleRequired}
                                        requiredFields={requiredFields}
                                    />
                                ))}
                            </div>

                            <button className="canvas-new-section" onClick={handleAddSection}>
                                <Icon.Plus /> New Section
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
