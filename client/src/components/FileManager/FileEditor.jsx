import React, { useState } from "react";
import { Save, X, ArrowLeft } from "lucide-react";
import { getFileIcon } from "./icons";

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
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Editor header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button onClick={onClose} className="mr-1">
              <ArrowLeft size={16} />
            </button>
          )}
          {getFileIcon(file.extension)}
          <span className="font-medium truncate max-w-32">{file.name}</span>
          {isDirty && <span className="text-xs text-gray-400">(modified)</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-gray-700 rounded flex items-center gap-1 text-xs"
            onClick={handleSave}
          >
            <Save size={14} />
            {!isMobile && <span>Save</span>}
          </button>
          {!isMobile && (
            <button
              className="p-1 hover:bg-gray-700 rounded flex items-center gap-1 text-xs"
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
        <div className="flex-grow flex items-center justify-center bg-gray-950 p-4 text-center text-gray-400">
          <div>
            <div className="mb-2">Binary file cannot be edited in browser</div>
            <div className="text-sm">
              File type: {file.extension.toUpperCase()}
            </div>
          </div>
        </div>
      ) : (
        <textarea
          className="flex-grow p-4 bg-gray-950 text-gray-200 font-mono text-sm resize-none focus:outline-none w-full"
          value={content}
          onChange={handleContentChange}
          spellCheck="false"
        />
      )}
    </div>
  );
};

export default FileEditor;
