import React, { useState, useEffect } from "react";
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
} from "lucide-react";

// Enhanced file tree with nested structure and file contents
const initialFileTree = [
  {
    id: 1,
    name: "server.jar",
    fileType: "file",
    extension: "jar",
    size: "16.2 MB",
    modifiedAt: "2025-04-10",
    binary: true,
  },
  {
    id: 2,
    name: "plugins",
    fileType: "folder",
    children: [
      {
        id: 3,
        name: "geyser.jar",
        fileType: "file",
        extension: "jar",
        size: "8.4 MB",
        modifiedAt: "2025-04-12",
        binary: true,
      },
      {
        id: 4,
        name: "config.yml",
        fileType: "file",
        extension: "yml",
        size: "3.2 KB",
        modifiedAt: "2025-04-13",
        content: `# Geyser Configuration File

server:
  address: 0.0.0.0
  port: 19132
  name: "Geyser Server"
  motd: "Geyser Minecraft Server"
  compress-packets: true
  max-players: 100
  
remote:
  address: 127.0.0.1
  port: 25565
  auth-type: online
  
# Authentication settings
auth-type: floodgate`,
      },
      {
        id: 5,
        name: "data.db",
        fileType: "file",
        extension: "db",
        size: "2.7 MB",
        modifiedAt: "2025-04-10",
        binary: true,
      },
    ],
  },
  { id: 6, name: "world", fileType: "folder", children: [] },
  {
    id: 7,
    name: "server.properties",
    fileType: "file",
    extension: "properties",
    size: "1.8 KB",
    modifiedAt: "2025-04-11",
    content: `# Minecraft server properties
server-port=25565
gamemode=survival
difficulty=normal
max-players=20
view-distance=10
resource-pack=
spawn-protection=16
online-mode=true
allow-flight=false
motd=A Minecraft Server
enable-rcon=false
level-seed=
pvp=true
generate-structures=true
max-build-height=256`,
  },
  {
    id: 8,
    name: "logs",
    fileType: "folder",
    children: [
      {
        id: 9,
        name: "latest.log",
        fileType: "file",
        extension: "log",
        size: "356 KB",
        modifiedAt: "2025-04-14",
        content: `[14:25:12] [Server thread/INFO]: Starting minecraft server version 1.20.1
[14:25:12] [Server thread/INFO]: Loading properties
[14:25:12] [Server thread/INFO]: Default game type: SURVIVAL
[14:25:12] [Server thread/INFO]: Generating keypair
[14:25:13] [Server thread/INFO]: Starting Minecraft server on *:25565
[14:25:13] [Server thread/INFO]: Preparing level "world"
[14:25:14] [Server thread/INFO]: Preparing start region for dimension minecraft:overworld
[14:25:16] [Server thread/INFO]: Done (3.245s)! For help, type "help"`,
      },
    ],
  },
];

// Function to get icon based on file extension
const getFileIcon = (extension) => {
  switch (extension?.toLowerCase()) {
    case "jar":
      return <Coffee className="text-amber-600" size={16} />;
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
    case "java":
    case "html":
    case "css":
      return <Code className="text-yellow-500" size={16} />;
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
  isMobile,
  item,
}) => {
  if (!isVisible) return null;

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
                onClick={onEdit}
              >
                <Edit size={18} /> Edit
              </li>
            )}
            <li className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer">
              <FolderSymlink size={18} /> Move
            </li>
            <li className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer">
              <Download size={18} /> Download
            </li>
            <li className="px-4 py-3 hover:bg-gray-700 flex items-center gap-3 cursor-pointer text-red-400">
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
            onClick={onEdit}
          >
            <Edit size={14} /> Edit
          </li>
        )}
        <li className="px-4 py-2 hover:bg-gray-700 flex items-center gap-2 cursor-pointer">
          <Download size={14} /> Download
        </li>
        <li className="px-4 py-2 hover:bg-gray-700 flex items-center gap-2 cursor-pointer text-red-400">
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

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(file.id, content);
    setIsDirty(false);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Editor header */}
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2 border-b border-gray-300">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button onClick={onClose} className="mr-1">
              <ArrowLeft size={16} />
            </button>
          )}
          {getFileIcon(file.extension)}
          <span className="font-medium truncate max-w-32">{file.name}</span>
          {isDirty && <span className="text-xs text-gray-500">(modified)</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-blue-100 rounded flex items-center gap-1 text-xs text-blue-600"
            onClick={handleSave}
          >
            <Save size={14} />
            {!isMobile && <span>Save</span>}
          </button>
          {!isMobile && (
            <button
              className="p-1 hover:bg-gray-200 rounded flex items-center gap-1 text-xs"
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
        <div className="flex-grow flex items-center justify-center bg-gray-50 p-4 text-center text-gray-500">
          <div>
            <div className="mb-2">Binary file cannot be edited in browser</div>
            <div className="text-sm">
              File type: {file.extension.toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        <textarea
          className="flex-grow p-4 bg-white text-black border-0 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
          value={content}
          onChange={handleContentChange}
          spellCheck="false"
        />
      )}
    </div>
  );
};

// FileItem component to handle both files and folders
const FileItem = ({ item, level = 0, onSelectFile, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [isHovered, setIsHovered] = useState(false);

  const toggleFolder = () => {
    if (item.fileType === "folder") {
      setIsOpen(!isOpen);
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: isMobile ? 0 : e.clientX,
      y: isMobile ? 0 : e.clientY,
      item: item,
    });

    if (!isMobile) {
      document.addEventListener("click", closeContextMenu);
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, item: null });
    document.removeEventListener("click", closeContextMenu);
  };

  const handleFileSelect = () => {
    if (item.fileType === "file") {
      onSelectFile(item);
    }
  };

  const handleClick = () => {
    if (isMobile) {
      if (item.fileType === "folder") {
        toggleFolder();
      } else {
        handleContextMenu({ preventDefault: () => {}, clientX: 0, clientY: 0 });
      }
    } else {
      if (item.fileType === "folder") {
        toggleFolder();
      } else {
        handleFileSelect();
      }
    }
  };

  return (
    <>
      <div
        className={`flex items-center w-full cursor-pointer hover:bg-gray-200 hover:text-white ${
          isHovered ? "bg-gray-700" : ""
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
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {isOpen ? (
                  <FolderOpen className="text-blue-400" size={16} />
                ) : (
                  <FolderClosed className="text-blue-400" size={16} />
                )}
              </span>
            ) : (
              <span className="ml-5 flex-shrink-0">
                {getFileIcon(item.extension)}
              </span>
            )}
            <span className="truncate">{item.name}</span>
          </div>
        </div>

        {/* Only show size and date on larger screens */}
        {item.fileType === "file" && !isMobile && (
          <div className="flex items-center gap-4 px-4 text-xs text-gray-400">
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
            />
          ))}
        </div>
      )}

      <FileContextMenu
        isVisible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={closeContextMenu}
        onEdit={() => {
          closeContextMenu();
          if (item.fileType === "file") {
            onSelectFile(item);
          }
        }}
        isMobile={isMobile}
        item={contextMenu.item || item}
      />
    </>
  );
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

const FileManager = () => {
  const [fileTree, setFileTree] = useState(initialFileTree);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const isMobile = useIsMobile();

  const handleSelectFile = (file) => {
    setSelectedFile(file);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedFile(null);
  };

  const handleSaveFile = (fileId, newContent) => {
    // Update the file tree with new content
    const updatedTree = updateFileContent(fileTree, fileId, newContent);
    setFileTree(updatedTree);

    // Also update the selected file if it's still open
    if (selectedFile && selectedFile.id === fileId) {
      setSelectedFile({ ...selectedFile, content: newContent });
    }
  };

  // Mobile view: show either file browser or editor, not both
  if (isMobile && showEditor && selectedFile) {
    return (
      <div className="flex flex-col h-96 border border-gray-800 rounded shadow-lg overflow-hidden bg-gray-900 text-gray-100">
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
    <div className="flex flex-col md:flex-row h-full w-full border border-blue-800 rounded shadow-lg overflow-hidden bg-gray-100 text-gray-900">
      {/* File Manager Panel */}
      <div
        className={`flex flex-col ${
          !isMobile && showEditor
            ? "md:border-r border-blue-700 w-full"
            : "w-full"
        }`}
      >
        {/* Column headers - hide detail columns on mobile */}
        <div className="flex items-center text-xs text-gray-100 py-2 px-3 bg-gray-800 border-b border-gray-700">
          <div className="flex-grow">Name</div>
          {!isMobile && (
            <>
              <div className="w-24 text-right">Size</div>
              <div className="w-24 text-right pr-4">Modified</div>
            </>
          )}
        </div>

        {/* File tree */}
        <div className="flex-grow overflow-auto">
          {fileTree.map((item) => (
            <FileItem
              key={item.id}
              item={item}
              onSelectFile={handleSelectFile}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* File Editor Panel - only show on desktop when a file is selected */}
      {!isMobile && showEditor && selectedFile && (
        <div className="w-2/3">
          <FileEditor
            file={selectedFile}
            onClose={handleCloseEditor}
            onSave={handleSaveFile}
            isMobile={false}
          />
        </div>
      )}
    </div>
  );
};

export default FileManager;
