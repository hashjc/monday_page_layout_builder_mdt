import React from "react";
import { useState, useEffect } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "@vibe/core/tokens";
import { Heading, Text, Loader, Box, Flex, TextField, IconButton, Button } from "@vibe/core";
import { Settings, CloseSmall } from "@vibe/icons";

const monday = mondaySdk();

const App = () => {
    console.log("App start");
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [context, setContext] = useState();
    const [boardId, setBoardId] = useState(null);
    const [columns, setColumns] = useState([]); // All board columns
    const [loading, setLoading] = useState(false);
    const [hoveredColumnId, setHoveredColumnId] = useState(null);
    const [childBoards, setChildBoards] = useState([]);
    const [loadingChildBoards, setLoadingChildBoards] = useState(false);
    const [hoveredChildBoardId, setHoveredChildBoardId] = useState(null);
    const [selectedSection, setSelectedSection] = useState("columns");
    const [searchColumnsQuery, setSearchColumnsQuery] = useState("");
    const [searchChildBoardsQuery, setSearchChildBoardsQuery] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [boardName, setBoardName] = useState("Board");
    const [instanceId, setInstanceId] = useState(null);

    // Layout configuration
    const [layoutFields, setLayoutFields] = useState([]); // Fields currently in layout
    const [savedLayoutFields, setSavedLayoutFields] = useState([]); // Last saved layout
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [hoveredFieldId, setHoveredFieldId] = useState(null); // Track hovered field in layout
    const [savingLayout, setSavingLayout] = useState(false);

    // Form data
    const [formData, setFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Drag and drop state
    const [draggedColumn, setDraggedColumn] = useState(null);

    // ============================================
    // FETCH CHILD BOARDS FUNCTION
    // ============================================
    const fetchChildBoards = async (currentBoardId) => {
        setLoadingChildBoards(true);
        try {
            const boardsQuery = `
            query {
              boards(limit: 500) {
                id
                name
                columns {
                  id
                  title
                  type
                  settings_str
                }
              }
            }
          `;

            const boardsResult = await monday.api(boardsQuery);
            const allBoards = boardsResult.data?.boards || [];
            const childBoardsList = [];

            for (const board of allBoards) {
                if (board.id === currentBoardId) continue;
                for (const column of board.columns || []) {
                    if (column.type === "board_relation") {
                        try {
                            const settings = JSON.parse(column.settings_str || "{}");
                            if (settings.boardIds && settings.boardIds.includes(parseInt(currentBoardId))) {
                                childBoardsList.push({
                                    id: `${board.id}-${column.id}`,
                                    boardId: board.id,
                                    boardName: board.name,
                                    columnId: column.id,
                                    columnLabel: column.title,
                                    label: `${board.name} - ${column.title}`,
                                });
                            }
                        } catch (e) {
                            console.warn("Could not parse column settings:", e);
                        }
                    }
                }
            }

            childBoardsList.sort((a, b) => a.label.localeCompare(b.label));
            setChildBoards(childBoardsList);
        } catch (error) {
            console.error("Error fetching child boards:", error);
        } finally {
            setLoadingChildBoards(false);
        }
    };

    // ============================================
    // LOAD SAVED LAYOUT FROM STORAGE
    // ============================================
    const loadSavedLayout = async (instance) => {
        try {
            const storageKey = `layout_${instance}`;
            const result = await monday.storage.instance.getItem(storageKey);

            if (result?.data?.value) {
                const savedLayout = JSON.parse(result.data.value);
                console.log("Loaded saved layout:", savedLayout);
                setLayoutFields(savedLayout);
                setSavedLayoutFields(savedLayout);
            } else {
                // Default: only Item Name
                const defaultLayout = [{
                    id: "name",
                    columnId: "name",
                    label: "Item Name",
                    type: "text",
                    isDefault: true // Cannot be removed
                }];
                setLayoutFields(defaultLayout);
                setSavedLayoutFields(defaultLayout);
            }
        } catch (error) {
            console.error("Error loading layout:", error);
            // Fallback to default
            const defaultLayout = [{
                id: "name",
                columnId: "name",
                label: "Item Name",
                type: "text",
                isDefault: true
            }];
            setLayoutFields(defaultLayout);
            setSavedLayoutFields(defaultLayout);
        }
    };

    // ============================================
    // SAVE LAYOUT TO STORAGE
    // ============================================
    const saveLayout = async () => {
        setSavingLayout(true);
        try {
            const storageKey = `layout_${instanceId}`;
            await monday.storage.instance.setItem(storageKey, JSON.stringify(layoutFields));

            setSavedLayoutFields([...layoutFields]);
            setHasUnsavedChanges(false);

            monday.execute("notice", {
                message: "Layout saved successfully!",
                type: "success",
                timeout: 3000
            });

            console.log("Layout saved:", layoutFields);
        } catch (error) {
            console.error("Error saving layout:", error);
            monday.execute("notice", {
                message: "Error saving layout",
                type: "error",
                timeout: 3000
            });
        } finally {
            setSavingLayout(false);
        }
    };

    // ============================================
    // CANCEL LAYOUT CHANGES
    // ============================================
    const cancelLayoutChanges = () => {
        setLayoutFields([...savedLayoutFields]);
        setHasUnsavedChanges(false);

        monday.execute("notice", {
            message: "Changes cancelled",
            type: "info",
            timeout: 2000
        });
    };

    // ============================================
    // INITIALIZE APP
    // ============================================
    useEffect(() => {
        monday.execute("valueCreatedForUser");

        monday.listen("context", async (res) => {
            setContext(res.data);

            // Get instance ID
            const instance = res.data?.instanceId || `instance_${Date.now()}`;
            setInstanceId(instance);

            // Check if user is admin
            if (res.data && res.data.user) {
                const userRole = res.data.user.role || res.data.user.account_owner;
                setIsAdmin(userRole === "owner" || userRole === "admin" || res.data.user.account_owner === true);
            }

            // Extract board ID
            if (res.data && res.data.boardId) {
                setBoardId(res.data.boardId);

                // Fetch columns
                setLoading(true);
                try {
                    const query = `
                    query {
                      boards(ids: [${res.data.boardId}]) {
                        name
                        columns {
                          id
                          title
                          type
                        }
                      }
                    }
                  `;

                    const result = await monday.api(query);
                    if (result.data && result.data.boards && result.data.boards.length > 0) {
                        const boardData = result.data.boards[0];
                        const unsortedColumns = boardData.columns || [];
                        const fetchedBoardName = boardData.name || "Board";

                        setBoardName(fetchedBoardName);

                        const sortedColumns = [...unsortedColumns].sort((a, b) => {
                            if (a.title.toLowerCase() === b.title.toLowerCase()) {
                                return a.id.localeCompare(b.id);
                            }
                            return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                        });

                        setColumns(sortedColumns);

                        // Load saved layout
                        await loadSavedLayout(instance);

                        // Fetch child boards
                        await fetchChildBoards(res.data.boardId);
                    }
                } catch (error) {
                    console.error("Error fetching columns:", error);
                } finally {
                    setLoading(false);
                }
            }
        });
    }, []);

    // Track unsaved changes
    useEffect(() => {
        if (savedLayoutFields.length > 0) {
            const hasChanges = JSON.stringify(layoutFields) !== JSON.stringify(savedLayoutFields);
            setHasUnsavedChanges(hasChanges);
        }
    }, [layoutFields, savedLayoutFields]);

    // ============================================
    // DRAG AND DROP HANDLERS
    // ============================================
    const handleColumnDragStart = (e, column) => {
        setDraggedColumn(column);
        e.dataTransfer.effectAllowed = "copy";
    };

    const handleLayoutDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const handleLayoutDrop = (e) => {
        e.preventDefault();

        if (!draggedColumn) return;

        // Check if column already exists in layout
        const exists = layoutFields.some(field => field.columnId === draggedColumn.id);
        if (exists) {
            monday.execute("notice", {
                message: "Column already added to layout",
                type: "error",
                timeout: 2000
            });
            setDraggedColumn(null);
            return;
        }

        // Add column to layout
        const newField = {
            id: draggedColumn.id,
            columnId: draggedColumn.id,
            label: draggedColumn.title,
            type: draggedColumn.type,
            isDefault: false
        };

        setLayoutFields([...layoutFields, newField]);
        setDraggedColumn(null);
    };

    // ============================================
    // REMOVE FIELD FROM LAYOUT
    // ============================================
    const removeFieldFromLayout = (fieldId) => {
        const field = layoutFields.find(f => f.id === fieldId);

        if (field?.isDefault) {
            monday.execute("notice", {
                message: "Item Name field cannot be removed",
                type: "error",
                timeout: 2000
            });
            return;
        }

        setLayoutFields(layoutFields.filter(f => f.id !== fieldId));
    };

    // ============================================
    // CHECK IF COLUMN IS IN LAYOUT
    // ============================================
    const isColumnInLayout = (columnId) => {
        return layoutFields.some(field => field.columnId === columnId);
    };

    // ============================================
    // FILTER FUNCTIONS
    // ============================================
    const filteredColumns = columns.filter(
        (column) =>
            column.title.toLowerCase().includes(searchColumnsQuery.toLowerCase()) ||
            column.type.toLowerCase().includes(searchColumnsQuery.toLowerCase())
    );

    const filteredChildBoards = childBoards.filter((item) =>
        item.label.toLowerCase().includes(searchChildBoardsQuery.toLowerCase())
    );

    // ============================================
    // FORM SUBMISSION
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate Item Name is filled
        if (!formData.name || !formData.name.trim()) {
            monday.execute("notice", {
                message: "Please enter an item name",
                type: "error",
                timeout: 3000
            });
            return;
        }

        setSubmitting(true);
        try {
            // Prepare column values
            const columnValues = {};

            layoutFields.forEach(field => {
                if (field.columnId !== "name" && formData[field.columnId]) {
                    columnValues[field.columnId] = formData[field.columnId];
                }
            });

            const mutation = `
                mutation {
                    create_item(
                        board_id: ${boardId},
                        item_name: "${formData.name.replace(/"/g, '\\"')}",
                        column_values: ${JSON.stringify(JSON.stringify(columnValues))}
                    ) {
                        id
                    }
                }
            `;

            await monday.api(mutation);

            monday.execute("notice", {
                message: "Item created successfully!",
                type: "success",
                timeout: 3000
            });

            // Clear form
            setFormData({});
        } catch (error) {
            console.error("Error creating item:", error);
            monday.execute("notice", {
                message: "Error creating item: " + error.message,
                type: "error",
                timeout: 5000
            });
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // RENDER FORM FIELD
    // ============================================
    const renderFormField = (field) => {
        const value = formData[field.columnId] || "";
        const onChange = (newValue) => {
            setFormData({ ...formData, [field.columnId]: newValue });
        };

        return (
            <TextField
                key={field.id}
                label={field.label}
                value={value}
                onChange={onChange}
                placeholder={`Enter ${field.label}`}
                required={field.isDefault} // Item Name is required
            />
        );
    };

    return (
        <Box className="App" backgroundColor="var(--primary-background-color)">
            {/* HEADER */}
            <Box marginBottom="large" padding="medium">
                <Flex align="center" justify="space-between" marginBottom="medium">
                    <Heading type="h1" weight="bold">
                        Monday Board Info
                    </Heading>
                    {isAdmin && (
                        <IconButton
                            kind="tertiary"
                            size="large"
                            icon={Settings}
                            onClick={() => setShowAdminPanel(!showAdminPanel)}
                            title="Customize form (Admin only)"
                        />
                    )}
                </Flex>

                {context && (
                    <Box marginBottom="medium">
                        <Text type="paragraph" color="var(--primary-text-color)">
                            <strong>User ID:</strong> {context.user?.id || "Loading..."}
                        </Text>
                    </Box>
                )}

                {boardId && (
                    <Box marginBottom="medium">
                        <Text type="paragraph" color="var(--primary-text-color)">
                            <strong>Here is the board id:</strong> {boardId}
                        </Text>
                    </Box>
                )}
            </Box>

            {/* ADMIN PANEL */}
            {showAdminPanel && isAdmin && (
                <Box
                    padding="medium"
                    marginBottom="medium"
                    style={{
                        backgroundColor: "rgba(0, 115, 234, 0.1)",
                        border: "1px solid var(--ui-border-color)",
                        borderRadius: "8px",
                    }}
                >
                    <Flex align="center" justify="space-between" marginBottom="medium">
                        <Heading type="h3" weight="bold">
                            Form Customization (Admin Panel)
                        </Heading>
                        <button
                            onClick={() => setShowAdminPanel(false)}
                            style={{
                                cursor: "pointer",
                                padding: "4px 12px",
                                border: "1px solid var(--ui-border-color)",
                                borderRadius: "4px",
                                backgroundColor: "transparent",
                            }}
                        >
                            Close
                        </button>
                    </Flex>
                    <Text type="paragraph" color="var(--secondary-text-color)">
                        Drag columns from below to add them to the layout. Hover over fields to remove them.
                    </Text>
                </Box>
            )}

            {/* MAIN LAYOUT */}
            <Flex className="metadata-layout" align="Start">
                {/* LEFT SIDEBAR */}
                <Box className="sidebar">
                    <div
                        className={`nav-item ${selectedSection === "columns" ? "active" : ""}`}
                        onClick={() => setSelectedSection("columns")}
                        style={{ cursor: "pointer" }}
                    >
                        <Text type="paragraph" weight="bold">
                            Board Columns
                        </Text>
                    </div>

                    <div
                        className={`nav-item ${selectedSection === "childBoards" ? "active" : ""}`}
                        onClick={() => setSelectedSection("childBoards")}
                        style={{ cursor: "pointer" }}
                    >
                        <Text type="paragraph" weight="bold">
                            Child Boards
                        </Text>
                    </div>
                </Box>

                {/* RIGHT CONTENT AREA */}
                <Box className="main-content metadata-section">
                    {/* COLUMNS VIEW */}
                    {selectedSection === "columns" && (
                        <Box>
                            <Heading type="h2" weight="bold" marginBottom="medium">
                                Board Columns
                            </Heading>

                            {columns && columns.length > 0 && (
                                <Box marginBottom="medium">
                                    <TextField
                                        placeholder="Search columns by name or type..."
                                        value={searchColumnsQuery}
                                        onChange={(value) => setSearchColumnsQuery(value)}
                                        onClear={() => setSearchColumnsQuery("")}
                                    />
                                </Box>
                            )}

                            {loading ? (
                                <Flex align="center" gap="small">
                                    <Loader />
                                    <Text type="paragraph" color="var(--primary-text-color)">
                                        Loading columns...
                                    </Text>
                                </Flex>
                            ) : columns && columns.length > 0 ? (
                                <Box className="columns-container">
                                    {filteredColumns.length > 0 ? (
                                        filteredColumns.map((column) => {
                                            const inLayout = isColumnInLayout(column.id);
                                            return (
                                                <div
                                                    key={column.id}
                                                    draggable={!inLayout}
                                                    onDragStart={(e) => !inLayout && handleColumnDragStart(e, column)}
                                                    onMouseEnter={() => setHoveredColumnId(column.id)}
                                                    onMouseLeave={() => setHoveredColumnId(null)}
                                                    className={`column-card ${inLayout ? 'disabled' : ''}`}
                                                    style={{
                                                        cursor: inLayout ? 'not-allowed' : 'grab',
                                                        opacity: inLayout ? 0.5 : 1
                                                    }}
                                                >
                                                    <Box
                                                        padding="small"
                                                        backgroundColor="var(--secondary-background-color)"
                                                        border="1px solid var(--ui-border-color)"
                                                        borderRadius="var(--border-radius-small)"
                                                    >
                                                        <Flex align="center" justify="space-between">
                                                            <Text type="paragraph" color="var(--primary-text-color)">
                                                                <strong>{column.title}</strong>
                                                                {inLayout && <span style={{ marginLeft: '8px', fontSize: '12px' }}>(Added)</span>}
                                                            </Text>
                                                            {hoveredColumnId === column.id && (
                                                                <Text type="paragraph" color="var(--secondary-text-color)">
                                                                    ID: {column.id}
                                                                </Text>
                                                            )}
                                                        </Flex>
                                                    </Box>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <Text type="paragraph" color="var(--secondary-text-color)">
                                            No columns match your search.
                                        </Text>
                                    )}
                                </Box>
                            ) : (
                                <Text type="paragraph" color="var(--secondary-text-color)">
                                    No columns found or board not yet loaded.
                                </Text>
                            )}
                        </Box>
                    )}

                    {/* CHILD BOARDS VIEW */}
                    {selectedSection === "childBoards" && (
                        <Box>
                            <Heading type="h2" weight="bold" marginBottom="medium">
                                Child Boards
                            </Heading>

                            {childBoards && childBoards.length > 0 && (
                                <Box marginBottom="medium">
                                    <TextField
                                        placeholder="Search child boards by label..."
                                        value={searchChildBoardsQuery}
                                        onChange={(value) => setSearchChildBoardsQuery(value)}
                                        onClear={() => setSearchChildBoardsQuery("")}
                                    />
                                </Box>
                            )}

                            {loadingChildBoards ? (
                                <Flex align="center" gap="small">
                                    <Loader />
                                    <Text type="paragraph" color="var(--primary-text-color)">
                                        Loading child boards...
                                    </Text>
                                </Flex>
                            ) : childBoards && childBoards.length > 0 ? (
                                <Box className="columns-container">
                                    {filteredChildBoards.length > 0 ? (
                                        filteredChildBoards.map((item) => (
                                            <div
                                                key={item.id}
                                                onMouseEnter={() => setHoveredChildBoardId(item.id)}
                                                onMouseLeave={() => setHoveredChildBoardId(null)}
                                                className="column-card"
                                            >
                                                <Box
                                                    padding="small"
                                                    backgroundColor="var(--secondary-background-color)"
                                                    border="1px solid var(--ui-border-color)"
                                                    borderRadius="var(--border-radius-small)"
                                                >
                                                    <Flex align="center" justify="space-between">
                                                        <Text type="paragraph" color="var(--primary-text-color)">
                                                            <strong>{item.label}</strong>
                                                        </Text>
                                                        {hoveredChildBoardId === item.id && (
                                                            <Text type="paragraph" color="var(--secondary-text-color)">
                                                                Board: {item.boardId}
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                </Box>
                                            </div>
                                        ))
                                    ) : (
                                        <Text type="paragraph" color="var(--secondary-text-color)">
                                            No child boards match your search.
                                        </Text>
                                    )}
                                </Box>
                            ) : (
                                <Text type="paragraph" color="var(--secondary-text-color)">
                                    No child boards found.
                                </Text>
                            )}
                        </Box>
                    )}
                </Box>
            </Flex>

            {/* LAYOUT SECTION */}
            <Box className="layout-section">
                <Box padding="medium" borderTop="1px solid var(--ui-border-color)">
                    <Flex align="center" justify="space-between" marginBottom="medium">
                        <Heading type="h2" weight="bold">
                            Layout
                        </Heading>

                        {hasUnsavedChanges && (
                            <Flex gap="small">
                                <Button
                                    kind="tertiary"
                                    onClick={cancelLayoutChanges}
                                    disabled={savingLayout}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    kind="primary"
                                    onClick={saveLayout}
                                    loading={savingLayout}
                                    disabled={savingLayout}
                                >
                                    Save Layout
                                </Button>
                            </Flex>
                        )}
                    </Flex>

                    <form onSubmit={handleSubmit}>
                        <Box className="form-container">
                            {/* Board Information Section */}
                            <Box marginBottom="large">
                                <Heading type="h3" weight="bold" marginBottom="medium">
                                    {boardName} Information
                                </Heading>

                                {/* Drop Zone */}
                                <Box
                                    className="form-fields layout-drop-zone"
                                    onDragOver={handleLayoutDragOver}
                                    onDrop={handleLayoutDrop}
                                >
                                    {layoutFields.map((field) => (
                                        <div
                                            key={field.id}
                                            className="form-field-wrapper layout-field"
                                            onMouseEnter={() => setHoveredFieldId(field.id)}
                                            onMouseLeave={() => setHoveredFieldId(null)}
                                        >
                                            <Box style={{ position: 'relative' }}>
                                                {renderFormField(field)}

                                                {/* Hover Actions */}
                                                {hoveredFieldId === field.id && !field.isDefault && (
                                                    <Box
                                                        style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            right: '8px',
                                                            display: 'flex',
                                                            gap: '4px',
                                                            zIndex: 10
                                                        }}
                                                    >
                                                        <IconButton
                                                            icon={CloseSmall}
                                                            size="small"
                                                            kind="tertiary"
                                                            onClick={() => removeFieldFromLayout(field.id)}
                                                            ariaLabel="Remove field"
                                                            style={{
                                                                backgroundColor: 'white',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                            }}
                                                        />
                                                    </Box>
                                                )}

                                                {/* Default field indicator */}
                                                {field.isDefault && hoveredFieldId === field.id && (
                                                    <Text
                                                        size="small"
                                                        color="var(--secondary-text-color)"
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: '-18px',
                                                            left: '0',
                                                            fontSize: '11px'
                                                        }}
                                                    >
                                                        Cannot be removed
                                                    </Text>
                                                )}
                                            </Box>
                                        </div>
                                    ))}

                                    {/* Drop zone hint */}
                                    {layoutFields.length === 1 && (
                                        <Box
                                            padding="large"
                                            style={{
                                                gridColumn: '1 / -1',
                                                border: '2px dashed var(--ui-border-color)',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                backgroundColor: 'rgba(0, 115, 234, 0.03)'
                                            }}
                                        >
                                            <Text color="var(--secondary-text-color)">
                                                Drag columns here to add them to the form
                                            </Text>
                                        </Box>
                                    )}
                                </Box>
                            </Box>

                            {/* Submit Buttons */}
                            <Flex gap="medium" marginTop="large">
                                <Button
                                    type="submit"
                                    kind="primary"
                                    disabled={submitting}
                                    loading={submitting}
                                >
                                    {submitting ? "Creating..." : "Submit Form"}
                                </Button>
                                <Button
                                    type="button"
                                    kind="secondary"
                                    onClick={() => setFormData({})}
                                    disabled={submitting}
                                >
                                    Clear Form
                                </Button>
                            </Flex>
                        </Box>
                    </form>
                </Box>
            </Box>
        </Box>
    );
};

export default App;