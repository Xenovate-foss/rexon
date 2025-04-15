import React from "react";
import FileItem from "./FileItem";

const FileList = ({ fileTree, onSelectFile, isMobile }) => {
  return (
    <>
      {/* Column headers - hide detail columns on mobile */}
      <div className="flex items-center text-xs text-gray-400 py-2 px-3 bg-gray-800 border-b border-gray-700">
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
            onSelectFile={onSelectFile}
            isMobile={isMobile}
          />
        ))}
      </div>
    </>
  );
};

export default FileList;
