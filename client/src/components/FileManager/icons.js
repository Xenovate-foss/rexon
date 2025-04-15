import {
  FolderClosed,
  FolderOpen,
  Coffee,
  Code,
  FileText,
  File,
} from "lucide-react";
import React from "react";

export const getFileIcon = (extension) => {
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
