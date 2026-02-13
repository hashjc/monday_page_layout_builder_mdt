import React from "react";
import { useState, useEffect, useCallback } from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "@vibe/core/tokens";
//Explore more Monday React Components here: https://vibe.monday.com/
import { Heading, Text, Loader, Box, Flex, TextField, IconButton, Button } from "@vibe/core";
import { Settings } from "@vibe/icons";

// Usage of mondaySDK example, for more information visit here: https://developer.monday.com/apps/docs/introduction-to-the-sdk/
const monday = mondaySdk();

const App = () => {
    console.log("App start");
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    const [context, setContext] = useState(); // Board context from monday
    const [boardId, setBoardId] = useState(null); // Current board ID
    const [columns, setColumns] = useState([]); // List of columns in current board
    const [loading, setLoading] = useState(false); // Loading state for columns
    const [hoveredColumnId, setHoveredColumnId] = useState(null); // Track hovered column for ID display
    const [childBoards, setChildBoards] = useState([]); // Boards that link to current board
    const [loadingChildBoards, setLoadingChildBoards] = useState(false); // Loading state for child boards
    const [hoveredChildBoardId, setHoveredChildBoardId] = useState(null); // Track hovered child board
    const [selectedSection, setSelectedSection] = useState("columns"); // Track which sidebar section is active (columns or childBoards only)
    const [searchColumnsQuery, setSearchColumnsQuery] = useState(""); // Search query for columns
    const [searchChildBoardsQuery, setSearchChildBoardsQuery] = useState(""); // Search query for child boards
    const [isAdmin, setIsAdmin] = useState(false); // Is current user board admin/owner
    const [showAdminPanel, setShowAdminPanel] = useState(false); // Show/hide admin customization panel
    const [boardName, setBoardName] = useState("Board"); // Board name for display

    // Layout - Item Name only
    const [itemName, setItemName] = useState(""); // Item name input
    const [submitting, setSubmitting] = useState(false); // Form submission state

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
    // INITIALIZE APP - FETCH BOARD DATA
    // ============================================
    useEffect(() => {
        monday.execute("valueCreatedForUser");

        monday.listen("context", async (res) => {
            setContext(res.data);

            // Check if user is admin
            console.log("User information ", res);
            if (res.data && res.data.user) {
                const userRole = res.data.user.role || res.data.user.account_owner;
                setIsAdmin(userRole === "owner" || userRole === "admin" || res.data.user.account_owner === true);
            }

            // Extract board ID from context
            if (res.data && res.data.boardId) {
                setBoardId(res.data.boardId);

                // Fetch columns for this board
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

                        // Set board name
                        setBoardName(fetchedBoardName);

                        // Sort columns alphabetically
                        const sortedColumns = [...unsortedColumns].sort((a, b) => {
                            if (a.title.toLowerCase() === b.title.toLowerCase()) {
                                return a.id.localeCompare(b.id);
                            }
                            return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                        });

                        setColumns(sortedColumns);

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

    // ============================================
    // HELPER FUNCTIONS - FILTERING
    // ============================================
    const filteredColumns = columns.filter(
        (column) =>
            column.title.toLowerCase().includes(searchColumnsQuery.toLowerCase()) || column.type.toLowerCase().includes(searchColumnsQuery.toLowerCase()),
    );

    const filteredChildBoards = childBoards.filter((item) => item.label.toLowerCase().includes(searchChildBoardsQuery.toLowerCase()));

    // ============================================
    // FORM SUBMISSION - Create Item with Name
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!itemName.trim()) {
            monday.execute("notice", {
                message: "Please enter an item name",
                type: "error",
                timeout: 3000,
            });
            return;
        }

        setSubmitting(true);
        try {
            const mutation = `
                mutation {
                    create_item(
                        board_id: ${boardId},
                        item_name: "${itemName.replace(/"/g, '\\"')}"
                    ) {
                        id
                    }
                }
            `;

            await monday.api(mutation);

            monday.execute("notice", {
                message: "Item created successfully!",
                type: "success",
                timeout: 3000,
            });

            // Clear form
            setItemName("");
        } catch (error) {
            console.error("Error creating item:", error);
            monday.execute("notice", {
                message: "Error creating item: " + error.message,
                type: "error",
                timeout: 5000,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box className="App" backgroundColor="var(--primary-background-color)">
            {/* HEADER - Display board info and user */}
            <Box marginBottom="large" padding="medium">
                <Flex align="center" justify="space-between" marginBottom="medium">
                    <Heading type="h1" weight="bold">
                        Monday Board Info
                    </Heading>
                    {/* Admin Gear Icon - Only visible to admins */}
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

            {/* ADMIN PANEL - Shows when admin clicks gear icon */}
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
                        Admin panel will appear here. You can customize the form by adding/removing fields.
                    </Text>
                </Box>
            )}

            {/* MAIN LAYOUT - Sidebar + Content Area */}
            <Flex className="metadata-layout" align="Start">
                {/* LEFT SIDEBAR - Navigation (NO SECTIONS OPTION) */}
                <Box className="sidebar">
                    {/* Columns Navigation Item */}
                    <div
                        className={`nav-item ${selectedSection === "columns" ? "active" : ""}`}
                        onClick={() => setSelectedSection("columns")}
                        style={{ cursor: "pointer" }}
                    >
                        <Text type="paragraph" weight="bold">
                            Board Columns
                        </Text>
                    </div>

                    {/* Child Boards Navigation Item */}
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

                {/* RIGHT CONTENT AREA - Metadata Section */}
                <Box className="main-content metadata-section">
                    {/* COLUMNS VIEW */}
                    {selectedSection === "columns" && (
                        <Box>
                            <Heading type="h2" weight="bold" marginBottom="medium">
                                Board Columns
                            </Heading>

                            {/* Search input for columns */}
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

                            {/* Loading state while fetching columns */}
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
                                        filteredColumns.map((column) => (
                                            <div
                                                key={column.id}
                                                onMouseEnter={() => setHoveredColumnId(column.id)}
                                                onMouseLeave={() => setHoveredColumnId(null)}
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
                                                            <strong>{column.title}</strong>
                                                        </Text>
                                                        {hoveredColumnId === column.id && (
                                                            <Text type="paragraph" color="var(--secondary-text-color)">
                                                                ID: {column.id}
                                                            </Text>
                                                        )}
                                                    </Flex>
                                                </Box>
                                            </div>
                                        ))
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

                            {/* Search input for child boards */}
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

                            {/* Loading state while fetching child boards */}
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

            {/* LAYOUT SECTION - Only Item Name Field */}
            <Box className="layout-section">
                <Box padding="medium" borderTop="1px solid var(--ui-border-color)">
                    <Heading type="h2" weight="bold" marginBottom="medium">
                        Layout
                    </Heading>

                    <form onSubmit={handleSubmit}>
                        <Box className="form-container">
                            {/* Default Section - Board Information */}
                            <Box marginBottom="large">
                                <Heading type="h3" weight="bold" marginBottom="medium">
                                    {boardName} Information
                                </Heading>

                                {/* Single Field: Item Name */}
                                <Box className="form-fields">
                                    <Box className="form-field-wrapper">
                                        <TextField
                                            label="Item Name"
                                            value={itemName}
                                            onChange={(value) => setItemName(value)}
                                            placeholder="Enter item name"
                                            required
                                        />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Submit button */}
                            <Flex gap="medium" marginTop="large">
                                <Button type="submit" kind="primary" disabled={submitting} loading={submitting}>
                                    {submitting ? "Creating..." : "Submit Form"}
                                </Button>
                                <Button type="button" kind="secondary" onClick={() => setItemName("")} disabled={submitting}>
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
