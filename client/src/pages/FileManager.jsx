import React, { useState, useEffect, useRef } from "react";
import {
  FolderClosed,
  FolderOpen,
  FilePlus,
  File,
  ChevronRight,
  ChevronDown,
  Coffee,
  Code,
  FileText,
  Download,
  Trash2,
  Edit,
  Save,
  X,
  Copy,
  Menu,
  ArrowLeft,
  FolderSymlink,
  Plus,
  Loader,
} from "lucide-react";

import axios from "axios";

// Function to get icon based on file extension
const getFileIcon = (extension) => {
  switch (extension?.toLowerCase()) {
    case "jar":
      return <Coffee className="text-amber-600" size={16} />;
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return <Code className="text-yellow-500" size={16} />;
    case "py":
      return <Code className="text-green-500" size={16} />;
    case "java":
      return <Code className="text-orange-500" size={16} />;
    case "html":
      return <Code className="text-red-500" size={16} />;
    case "css":
      return <Code className="text-blue-500" size={16} />;
    case "json":
      return <FileText className="text-yellow-400" size={16} />;
    case "properties":
    case "yml":
    case "yaml":
    case "log":
      return <FileText className="text-blue-400" size={16} />;
    default:
      return <File className="text-gray-400" size={16} />;
  }
};

// File context menu - now with mobile support
const FileContextMenu = ({
  isVisible,
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onDownload,
  isMobile,
  item,
}) => {
  if (!isVisible || !item) return null;

  if (isMobile) {
    // Mobile context menu - full width at bottom
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex flex-col justify-end">
        <div className="bg-gray-800 text-white rounded-t-lg shadow-lg w-full overflow-hidden border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {item.fileType === "file" ? (
                getFileIcon(item.extension)
              ) : (
                <FolderClosed className="text-blue-400" size={16} />
              )}
              <span className="font-medium truncate">{item.name}</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
              <X size={16} />
            </button>
          </div>
          <ul className="py-2">
            {item.fileType === "file" && !item.binary && (
              <li
                className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  onEdit(item);
                  onClose();
                }}
              >
                <Edit size={18} /> Edit
              </li>
            )}
            <li className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer">
              <FolderSymlink size={18} /> Move
            </li>
            <li
              className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer"
              onClick={() => {
                onDownload(item);
                onClose();
              }}
            >
              <Download size={18} /> Download
            </li>
            <li
              className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer text-red-400"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
            >
              <Trash2 size={18} /> Delete
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Desktop context menu
  return (
    <div
      className="absolute bg-gray-800 text-white rounded shadow-lg z-10 overflow-hidden border border-gray-700"
      style={{ top: y, left: x }}
    >
      <ul className="py-1">
        {item.fileType === "file" && !item.binary && (
          <li
            className="px-4 py-2 hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
            onClick={() => {
              onEdit(item);
              onClose();
            }}
          >
            <Edit size={14} /> Edit
          </li>
        )}
        <li
          className="px-4 py-2 hover:bg-gray-700 flex items-center gap-2 cursor-pointer"
          onClick={() => {
            onDownload(item);
            onClose();
          }}
        >
          <Download size={14} /> Download
        </li>
        <li
          className="px-4 py-2 hover:bg-gray-700 flex items-center gap-2 cursor-pointer text-red-400"
          onClick={() => {
            onDelete(item);
            onClose();
          }}
        >
          <Trash2 size={14} /> Delete
        </li>
      </ul>
    </div>
  );
};

// File Editor component
const FileEditor = ({ file, onClose, onSave, isMobile }) => {
  const [content, setContent] = useState(file.content || "");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(file.id, content);
      setIsDirty(false);
    } catch (error) {
      console.error("Error in handleSave:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 text-gray-900">
      {/* Editor header */}
      <div className="flex items-center justify-between bg-gray-200 px-4 py-2 border-b border-gray-300">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={onClose}
              className="mr-1 p-1 hover:bg-gray-300 rounded"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          {getFileIcon(file.extension)}
          <span className="font-medium truncate max-w-32">{file.name}</span>
          {isDirty && <span className="text-xs text-gray-500">(modified)</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`p-1 rounded flex items-center gap-1 text-xs ${
              isDirty
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "text-gray-400 bg-gray-300 cursor-not-allowed"
            }`}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <Loader size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {!isMobile && <span>{isSaving ? "Saving..." : "Save"}</span>}
          </button>
          {!isMobile && (
            <button
              className="p-1 hover:bg-gray-300 rounded flex items-center gap-1 text-xs"
              onClick={onClose}
            >
              <X size={14} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor content */}
      {file.binary ? (
        <div className="flex-grow flex items-center justify-center bg-gray-50 p-4 text-center text-gray-500 overflow-auto">
          <div>
            <div className="mb-2">Binary file cannot be edited in browser</div>
            <div className="text-sm">
              File type: {file.extension?.toUpperCase() || "Unknown"}
            </div>
          </div>
        </div>
      ) : (
        <textarea
          className="flex-grow p-4 bg-white text-gray-900 border-0 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 w-full overflow-auto"
          value={content}
          onChange={handleContentChange}
          spellCheck="false"
        />
      )}
    </div>
  );
};

// FileItem component to handle both files and folders
const FileItem = ({
  item,
  level = 0,
  onSelectFile,
  isMobile,
  onContextMenu,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const itemRef = useRef(null);

  const toggleFolder = (e) => {
    e.stopPropagation();
    if (item.fileType === "folder") {
      setIsOpen(!isOpen);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = itemRef.current.getBoundingClientRect();

    onContextMenu({
      item,
      x: isMobile ? 0 : e.clientX,
      y: isMobile ? 0 : e.clientY,
      rect,
    });
  };

  const handleFileSelect = (e) => {
    e.stopPropagation();
    if (item.fileType === "file") {
      onSelectFile(item);
    }
  };

  const handleClick = (e) => {
    if (isMobile) {
      if (item.fileType === "folder") {
        toggleFolder(e);
      } else {
        handleContextMenu(e);
      }
    } else {
      if (item.fileType === "folder") {
        toggleFolder(e);
      } else {
        handleFileSelect(e);
      }
    }
  };

  return (
    <>
      <div
        ref={itemRef}
        className={`flex items-center w-full cursor-pointer ${
          isHovered ? "bg-gray-200" : ""
        }`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex items-center flex-grow px-3 py-2 overflow-hidden"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {item.fileType === "folder" ? (
              <span className="flex items-center gap-1 flex-shrink-0">
                {isOpen ? (
                  <ChevronDown size={14} className="text-gray-500" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500" />
                )}
                {isOpen ? (
                  <FolderOpen className="text-blue-500" size={16} />
                ) : (
                  <FolderClosed className="text-blue-500" size={16} />
                )}
              </span>
            ) : (
              <span className="ml-5 flex-shrink-0">
                {getFileIcon(item.extension)}
              </span>
            )}
            <span className="truncate text-gray-900">{item.name}</span>
          </div>
        </div>

        {/* Only show size and date on larger screens */}
        {item.fileType === "file" && !isMobile && (
          <div className="flex items-center gap-4 px-4 text-xs text-gray-500">
            <span className="w-24 text-right">{item.size}</span>
            <span className="w-24 text-right">{item.modifiedAt}</span>
          </div>
        )}
      </div>

      {/* Render children if folder is open */}
      {item.fileType === "folder" && isOpen && item.children && (
        <div className="w-full">
          {item.children.map((child) => (
            <FileItem
              key={child.id}
              item={child}
              level={level + 1}
              onSelectFile={onSelectFile}
              isMobile={isMobile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </>
  );
};

// Hook to detect mobile viewport
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  return isMobile;
};

// Find a file by id in the file tree
const findFileById = (tree, id) => {
  for (const item of tree) {
    if (item.id === id) {
      return item;
    }
    if (item.fileType === "folder" && item.children) {
      const found = findFileById(item.children, id);
      if (found) return found;
    }
  }
  return null;
};

// Update a file's content in the file tree
const updateFileContent = (tree, id, newContent) => {
  return tree.map((item) => {
    if (item.id === id) {
      return { ...item, content: newContent };
    }
    if (item.fileType === "folder" && item.children) {
      return {
        ...item,
        children: updateFileContent(item.children, id, newContent),
      };
    }
    return item;
  });
};

// Remove an item from the file tree
const removeItemById = (tree, id) => {
  return tree
    .filter((item) => item.id !== id)
    .map((item) => {
      if (item.fileType === "folder" && item.children) {
        return {
          ...item,
          children: removeItemById(item.children, id),
        };
      }
      return item;
    });
};

const FileManager = () => {
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });
  const isMobile = useIsMobile();
  const fileManagerRef = useRef(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, item: null });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu.visible]);

  // Load file tree data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get("/api/files");
        setFileTree(response.data);
      } catch (error) {
        console.error("Failed to fetch file tree:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedFile(null);
  };

  const handleSaveFile = async (fileId, newContent) => {
    try {
      // For use in FileEditor component
      setIsSaving(true);

      // Send the updated content to the server
      await axios.post(`/api/files/${fileId}`, {
        content: newContent,
      });

      // Update the file tree with new content
      const updatedTree = updateFileContent(fileTree, fileId, newContent);
      setFileTree(updatedTree);

      // Also update the selected file if it's still open
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile({ ...selectedFile, content: newContent });
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
    } finally {
      // For use in FileEditor component
      setIsSaving(false);
    }
  };

  const handleContextMenu = ({ item, x, y }) => {
    setContextMenu({
      visible: true,
      x,
      y,
      item,
    });
  };

  const handleDelete = async (item) => {
    try {
      // Send delete request to the server
      await axios.delete(`/api/files/${item.id}`);

      // Remove the item from the file tree
      const updatedTree = removeItemById(fileTree, item.id);
      setFileTree(updatedTree);

      // Close the editor if the deleted file was open
      if (selectedFile && selectedFile.id === item.id) {
        setShowEditor(false);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  const handleDownload = async (item) => {
    try {
      // Request the file from the server
      const response = await axios.get(`/api/files/${item.id}/download`, {
        responseType: "blob",
      });

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", item.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  // Mobile view: show either file browser or editor, not both
  if (isMobile && showEditor && selectedFile) {
    return (
      <div className="flex flex-col h-96 rounded shadow-lg overflow-hidden bg-gray-100 text-gray-900">
        <FileEditor
          file={selectedFile}
          onClose={handleCloseEditor}
          onSave={handleSaveFile}
          isMobile={true}
        />
      </div>
    );
  }

  return (
    <div
      ref={fileManagerRef}
      className="flex flex-col md:flex-row h-96 w-full border border-gray-300 rounded shadow-lg overflow-hidden bg-white text-gray-900"
    >
      {/* File Manager Panel */}
      <div
        className={`flex flex-col ${
          !isMobile && showEditor
            ? "md:w-1/3 md:border-r border-gray-300"
            : "w-full"
        } h-full overflow-hidden`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between text-sm py-2 px-3 bg-gray-100 border-b border-gray-300 flex-shrink-0">
          <div className="font-medium">Files</div>
          <button className="p-1 hover:bg-gray-200 rounded">
            <Plus size={16} />
          </button>
        </div>

        {/* Column headers - hide detail columns on mobile */}
        <div className="flex items-center text-xs text-gray-600 py-2 px-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex-grow">Name</div>
          {!isMobile && (
            <>
              <div className="w-24 text-right">Size</div>
              <div className="w-24 text-right pr-4">Modified</div>
            </>
          )}
        </div>

        {/* File tree - THIS IS THE MAIN SCROLLABLE CONTAINER */}
        <div className="flex-grow overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <Loader size={24} className="animate-spin mr-2" />
              <span>Loading files...</span>
            </div>
          ) : fileTree.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No files found
            </div>
          ) : (
            fileTree.map((item) => (
              <FileItem
                key={item.id}
                item={item}
                onSelectFile={handleSelectFile}
                isMobile={isMobile}
                onContextMenu={handleContextMenu}
              />
            ))
          )}
        </div>
      </div>

      {/* File Editor Panel - only show on desktop when a file is selected */}
      {!isMobile && showEditor && selectedFile && (
        <div className="w-2/3 overflow-hidden">
          <FileEditor
            file={selectedFile}
            onClose={handleCloseEditor}
            onSave={handleSaveFile}
            isMobile={false}
          />
        </div>
      )}

      {/* Context Menu */}
      <FileContextMenu
        isVisible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() =>
          setContextMenu({ visible: false, x: 0, y: 0, item: null })
        }
        onEdit={handleSelectFile}
        onDelete={handleDelete}
        onDownload={handleDownload}
        isMobile={isMobile}
        item={contextMenu.item}
      />
    </div>
  );
};

export default FileManager;
