import React, { useState } from "react";
import {
  FolderClosed,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { getFileIcon } from "./icons";
import FileContextMenu from "./FileContextMenu";

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
        className={`flex items-center w-full cursor-pointer hover:bg-gray-700 ${
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

export default FileItem;
