import React, { useState } from "react";
import { useIsMobile } from "./hooks";
import { updateFileContent } from "./utils";
import { initialFileTree } from "./data";
import FileList from "./FileList";
import FileEditor from "./FileEditor";

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
    <div className="flex flex-col md:flex-row h-96 border border-gray-800 rounded shadow-lg overflow-hidden bg-gray-900 text-gray-100">
      {/* File Manager Panel */}
      <div
        className={`flex flex-col ${
          !isMobile && showEditor
            ? "md:w-1/3 border-r border-gray-700"
            : "w-full"
        }`}
      >
        <FileList
          fileTree={fileTree}
          onSelectFile={handleSelectFile}
          isMobile={isMobile}
        />
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
