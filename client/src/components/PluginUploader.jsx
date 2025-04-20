import { useState, useRef } from "react";
import axios from "axios";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  FileIcon,
} from "lucide-react";

const PluginUploader = ({ onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter((file) =>
        file.name.endsWith(".jar")
      );

      if (newFiles.length !== e.target.files.length) {
        setUploadStatus({
          success: false,
          message:
            "Only JAR files are supported. Non-JAR files were filtered out.",
        });
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setUploadStatus(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
        file.name.endsWith(".jar")
      );

      if (droppedFiles.length !== e.dataTransfer.files.length) {
        setUploadStatus({
          success: false,
          message:
            "Only JAR files are supported. Non-JAR files were filtered out.",
        });
      }

      if (droppedFiles.length > 0) {
        setFiles((prev) => [...prev, ...droppedFiles]);
        setUploadStatus(null);
      }
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setUploadStatus(null);
    setUploadProgress({});
  };

  const uploadPlugins = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus(null);
    setUploadProgress({});

    const successfulUploads = [];
    const failedUploads = [];

    // Upload files one by one to track progress properly
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("plugin", file);

      try {
        const response = await axios.post("/api/plugin", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress((prev) => ({
              ...prev,
              [i]: percentCompleted,
            }));
          },
        });

        successfulUploads.push({
          name: file.name,
          ...response.data.plugin,
        });
      } catch (error) {
        failedUploads.push({
          name: file.name,
          error: error.response?.data?.message || "Upload failed",
        });
      }
    }

    // Summarize results
    if (successfulUploads.length > 0 && failedUploads.length === 0) {
      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${successfulUploads.length} plugin${
          successfulUploads.length > 1 ? "s" : ""
        }`,
      });
    } else if (successfulUploads.length > 0 && failedUploads.length > 0) {
      setUploadStatus({
        success: true,
        warning: `${failedUploads.length} upload${
          failedUploads.length > 1 ? "s" : ""
        } failed`,
        message: `Successfully uploaded ${successfulUploads.length} plugin${
          successfulUploads.length > 1 ? "s" : ""
        }`,
      });
    } else {
      setUploadStatus({
        success: false,
        message: `Failed to upload ${failedUploads.length} plugin${
          failedUploads.length > 1 ? "s" : ""
        }`,
      });
    }

    // Clear files and notify parent
    if (successfulUploads.length > 0) {
      setFiles([]);
      if (onUploadComplete) {
        onUploadComplete(successfulUploads);
      }
    } else {
      // Keep failed files in case user wants to retry
      setFiles(
        failedUploads
          .map((fail) => files.find((f) => f.name === fail.name))
          .filter(Boolean)
      );
    }

    setUploading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      {!files.length ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto text-gray-400 mb-3" size={28} />
          <p className="text-gray-600 mb-3">
            Drag and drop plugin JAR files here
          </p>
          <p className="text-gray-500 text-sm mb-4">- or -</p>
          <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer transition-colors">
            Browse Files
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jar"
              multiple
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Selected Plugins ({files.length})</h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b pb-3"
              >
                <div className="flex items-center flex-1 mr-3">
                  <div className="bg-blue-50 p-2 rounded">
                    <FileIcon className="text-blue-600" size={16} />
                  </div>
                  <div className="ml-3 flex-1 truncate">
                    <p className="font-medium text-gray-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                {uploading && uploadProgress[index] !== undefined ? (
                  <div className="flex-1 mr-3">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${uploadProgress[index]}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1 text-gray-600">
                      {uploadProgress[index]}%
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Remove file"
                    disabled={uploading}
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              disabled={uploading}
              className="px-4 py-2 mr-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              Add More
            </button>
            <button
              onClick={uploadPlugins}
              disabled={uploading}
              className={`px-4 py-2 rounded ${
                uploading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {uploading ? "Uploading..." : "Upload All"}
            </button>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div
          className={`mt-4 p-3 rounded flex items-start ${
            uploadStatus.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {uploadStatus.success ? (
            <CheckCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
          ) : (
            <AlertCircle className="flex-shrink-0 mr-2 mt-0.5" size={16} />
          )}
          <div>
            <p>{uploadStatus.message}</p>
            {uploadStatus.warning && (
              <p className="text-sm text-amber-600 mt-1">
                {uploadStatus.warning}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginUploader;
