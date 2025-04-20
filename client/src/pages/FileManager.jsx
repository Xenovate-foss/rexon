import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Upload,
  FolderPlus,
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
                handleDelete(item);
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
      className="fixed bg-gray-800 text-white rounded shadow-lg z-10 overflow-hidden border border-gray-700"
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
          
        >
          <button onClick={() => {
                      console.log(item + " deleting")
                                  handleDelete(item);
                                              onClose();
                                                        }}><Trash2 size={14} /> Delete
                                                        </button>
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

  useEffect(() => {
    // Update content if file changes
    setContent(file.content || "");
    setIsDirty(false);
  }, [file.id, file.content]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = async (filePath, newContent) => {
    try {
      setIsSaving(true);
  
      // Send the updated content to the server
      await axios.post(`/api/updatefile?path=${filePath}`, {
        content: newContent,
      });
  
      // If the selected file is still open, update its content
      if (selectedFile && selectedFile.path === filePath) {
        setSelectedFile({ ...selectedFile, content: newContent });
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
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
  onSelectFile,
  isMobile,
  onContextMenu,
  onNavigateToFolder,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const itemRef = useRef(null);

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
    e.preventDefault();
    e.stopPropagation();
    if (item.fileType === "file") {
      onSelectFile(item);
    }
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (isMobile) {
      if (item.fileType === "folder") {
        onNavigateToFolder(item.path);
      } else {
        handleContextMenu(e);
      }
    } else {
      if (item.fileType === "folder") {
        onNavigateToFolder(item.path);
      } else {
        handleFileSelect(e);
      }
    }
  };

  return (
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
      <div className="flex items-center flex-grow px-3 py-2 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          {item.fileType === "folder" ? (
            <span className="flex items-center gap-1 flex-shrink-0">
              <ChevronRight size={14} className="text-gray-500" />
              <FolderClosed className="text-blue-500" size={16} />
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
          <span className="w-24 text-right">{item.size || "N/A"}</span>
          <span className="w-24 text-right">{item.modifiedAt || "N/A"}</span>
        </div>
      )}
    </div>
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

// Modal component for creating files/folders and uploading
const ActionModal = ({ isOpen, onClose, type, currentPath, onSuccess }) => {
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Reset form when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setName("");
      setFile(null);
      setIsSubmitting(false);
    }
  }, [isOpen, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (type === "upload") {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", currentPath);

        await axios.post("/api/files/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      } else if (type === "newFolder") {
        await axios.post("/api/files/folder", {
          name,
          path: currentPath,
        });
      } else if (type === "newFile") {
        await axios.post("/api/files/file", {
          name,
          path: currentPath,
          content: "",
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Operation failed:", error);
      alert("Operation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium">
            {type === "upload"
              ? "Upload File"
              : type === "newFolder"
              ? "New Folder"
              : "New File"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {type === "upload" ? (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>
                <span className="text-sm text-gray-500 truncate">
                  {file ? file.name : "No file selected"}
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {type === "newFolder" ? "Folder Name" : "File Name"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={
                  type === "newFolder" ? "Enter folder name" : "Enter file name"
                }
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (type === "upload" && !file) ||
                (type !== "upload" && !name)
              }
              className={`px-4 py-2 rounded ${
                isSubmitting ||
                (type === "upload" && !file) ||
                (type !== "upload" && !name)
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <Loader size={14} className="animate-spin mr-2" />
                  <span>
                    {type === "upload"
                      ? "Uploading..."
                      : type === "newFolder"
                      ? "Creating..."
                      : "Creating..."}
                  </span>
                </div>
              ) : (
                <span>
                  {type === "upload"
                    ? "Upload"
                    : type === "newFolder"
                    ? "Create Folder"
                    : "Create File"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FileManager = () => {
  const [files, setFiles] = useState([]);
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
  const [modal, setModal] = useState({
    isOpen: false,
    type: null,
  });

  const isMobile = useIsMobile();
  const fileManagerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse the current path from URL query parameters
  const getPathFromSearch = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("path")) {
      return params.get("path");
    } else {
      return "/";
    }
  };

  // Get current path from URL or use default
  const currentPath = getPathFromSearch() || "/";

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

  // Load files for the current path
  useEffect(() => {
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(
          `/api/files?path=${encodeURIComponent(currentPath)}`
        );
        setFiles(response.data);
      } catch (error) {
        console.error("Failed to fetch files:", error);
        // If the path doesn't exist, fallback to root
        if (
          error.response &&
          error.response.status === 404 &&
          currentPath !== "/"
        ) {
          navigate("?path=/");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [currentPath, navigate]);

  const handleNavigateToFolder = (path) => {
    // Update URL with the new path
    navigate(`?path=${encodeURIComponent(path)}`);
  };

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedFile(null);
  };

  const handleSaveFile = async (filePath, newContent) => {
    try {
      setIsSaving(true);

      // Send the updated content to the server
      await axios.post(`/api/files/?path=${filePath}`, {
        content: newContent,
      });

      // If the selected file is still open, update its content
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile({ ...selectedFile, content: newContent });
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
    } finally {
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
      console.log(item);
      // Send delete request to the server
      await axios.delete(`/api/file?path=${item.path}`);

      // Refresh the file list
      const response = await axios.get(
        `/api/files?path=${encodeURIComponent(currentPath)}`
      );
      setFiles(response.data);

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

  const refreshFiles = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/files?path=${encodeURIComponent(currentPath)}`
      );
      setFiles(response.data);
    } catch (error) {
      console.error("Failed to refresh files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (type) => {
    setModal({
      isOpen: true,
      type,
    });
  };

  const closeModal = () => {
    setModal({
      isOpen: false,
      type: null,
    });
  };

  // Generate breadcrumbs from current path
  const generateBreadcrumbs = () => {
    const parts = currentPath.split("/").filter(Boolean);
    const breadcrumbs = [{ name: "Root", path: "/" }];

    let currentBuildPath = "";
    parts.forEach((part) => {
      currentBuildPath += `/${part}`;
      breadcrumbs.push({
        name: part,
        path: currentBuildPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

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
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-gray-200 rounded"
              title="Upload"
              onClick={() => openModal("upload")}
            >
              <Upload size={16} />
            </button>
            <button
              className="p-1 hover:bg-gray-200 rounded"
              title="New File"
              onClick={() => openModal("newFile")}
            >
              <FilePlus size={16} />
            </button>
            <button
              className="p-1 hover:bg-gray-200 rounded"
              title="New Folder"
              onClick={() => openModal("newFolder")}
            >
              <FolderPlus size={16} />
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center text-xs text-gray-600 py-2 px-3 bg-gray-50 border-b border-gray-200 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && <span className="mx-1">/</span>}
                <button
                  className="hover:text-blue-500 truncate"
                  onClick={() => handleNavigateToFolder(crumb.path)}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
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

        {/* File list - Main scrollable container */}
        <div className="flex-grow overflow-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <Loader size={24} className="animate-spin mr-2" />
              <span>Loading files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              This folder is empty
            </div>
          ) : (
            files.map((item) => (
              <FileItem
                key={item.id}
                item={item}
                onSelectFile={handleSelectFile}
                isMobile={isMobile}
                onContextMenu={handleContextMenu}
                onNavigateToFolder={handleNavigateToFolder}
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

      {/* Action Modals */}
      <ActionModal
        isOpen={modal.isOpen}
        type={modal.type}
        onClose={closeModal}
        currentPath={currentPath}
        onSuccess={refreshFiles}
      />
    </div>
  );
};

export default FileManager;
