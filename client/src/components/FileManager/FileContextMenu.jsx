import React from "react";
import { Edit, Download, Trash2, X, FolderClosed } from "lucide-react";
import { getFileIcon } from "./icons";

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
      <div className="fixed inset-0 bg-gray-100 bg-opacity-50 z-50 flex flex-col justify-end">
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

export default FileContextMenu;
