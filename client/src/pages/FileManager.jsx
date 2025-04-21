import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import AceEditor from "react-ace";
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileCode,
  FilePlus,
  FileDigit,
  FileAudio,
  FileVideo,
  Home,
  ArrowLeft,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader,
  CloudDownload,
  FolderPlus,
  FileArchive,
  X,
} from "lucide-react";

// Import Ace Editor modes and themes
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-css";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-php";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/ext-language_tools";

const FileBrowser = () => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState("/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [showFileContent, setShowFileContent] = useState(false);
  const [fileContent, setFileContent] = useState("");
  const [showFileOptions, setShowFileOptions] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editorTheme, setEditorTheme] = useState("github");
  const [editorMode, setEditorMode] = useState("text");
  const [uploadProgress, setUploadProgress] = useState({});
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Fetch files on component mount and when path changes
  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  // Fetch files from the server
  const fetchFiles = async (path) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/files?path=${encodeURIComponent(path)}`
      );
      setFiles(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch files");
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine Ace Editor mode based on file extension
  const getEditorMode = (filename) => {
    if (!filename) return "text";
    const extension = filename.split(".").pop().toLowerCase();

    const modeMap = {
      js: "javascript",
      jsx: "javascript",
      ts: "javascript",
      tsx: "javascript",
      html: "html",
      css: "css",
      py: "python",
      java: "java",
      php: "php",
      md: "markdown",
      json: "json",
      txt: "text",
    };

    return modeMap[extension] || "text";
  };

  // Get file icon based on extension
  const getFileIcon = (file) => {
    if (file.fileType === "folder")
      return <Folder className="text-yellow-500" size={20} />;

    const extension = file.extension?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <FileText className="text-red-500" size={20} />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "svg":
        return <FileImage className="text-green-500" size={20} />;
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "html":
      case "css":
      case "php":
        return <FileCode className="text-blue-500" size={20} />;
      case "txt":
      case "md":
        return <FileText className="text-gray-500" size={20} />;
      case "zip":
      case "rar":
      case "tar":
      case "gz":
        return <FileArchive className="text-purple-500" size={20} />;
      case "mp3":
      case "wav":
      case "ogg":
        return <FileAudio className="text-pink-500" size={20} />;
      case "mp4":
      case "avi":
      case "mov":
        return <FileVideo className="text-indigo-500" size={20} />;
      case "csv":
      case "xls":
      case "xlsx":
        return <FileDigit className="text-green-700" size={20} />;
      default:
        return <File className="text-gray-500" size={20} />;
    }
  };

  // Handle navigation
  const navigateTo = (path) => {
    setSelectedFile(null);
    setCurrentPath(path);
  };

  // Handle folder click
  const handleFolderClick = (folder) => {
    navigateTo(folder.path);
  };

  // Handle file click
  const handleFileClick = async (file) => {
    if (file.fileType === "folder") {
      handleFolderClick(file);
      return;
    }

    setSelectedFile(file);

    if (!file.binary) {
      setLoading(true);
      try {
        const response = await axios.get(
          `/api/fileinfo?path=${encodeURIComponent(file.path)}`
        );
        setFileContent(response.data.content);
        setEditContent(response.data.content);
        setShowFileContent(true);
        setEditorMode(getEditorMode(file.name));
      } catch (err) {
        setError(err.response?.data?.error || "Failed to fetch file content");
      } finally {
        setLoading(false);
      }
    }
  };

  // Download file
  const downloadFile = async (file) => {
    window.open(
      `/api/file/download?path=${encodeURIComponent(file.path)}`,
      "_blank"
    );
  };

  // Delete file or folder
  const deleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`))
      return;

    try {
      await axios.delete(`/api/file?path=${encodeURIComponent(item.path)}`);
      fetchFiles(currentPath);
      if (selectedFile?.id === item.id) {
        setSelectedFile(null);
        setShowFileContent(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete item");
    }
  };

  // Handle file selection for upload
  const handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    setUploadFiles(files);

    // Initialize progress tracking for each file
    const progressObj = {};
    files.forEach((file) => {
      progressObj[file.name] = 0;
    });
    setUploadProgress(progressObj);
  };

  // Remove file from upload list
  const removeFileFromUpload = (filename) => {
    setUploadFiles(uploadFiles.filter((file) => file.name !== filename));
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[filename];
      return newProgress;
    });
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;

    let completed = 0;
    const totalFiles = uploadFiles.length;

    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", currentPath);

      try {
        await axios.post("/api/file/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );

            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: percentCompleted,
            }));

            // Update overall progress
            const totalProgress =
              Object.values(uploadProgress).reduce(
                (acc, curr) => acc + curr,
                0
              ) + percentCompleted;
            setOverallProgress(
              Math.round((totalProgress / (totalFiles * 100)) * 100)
            );
          },
        });

        completed++;
        setOverallProgress(Math.round((completed / totalFiles) * 100));
      } catch (err) {
        setError(
          `Failed to upload ${file.name}: ${
            err.response?.data?.error || err.message
          }`
        );
      }
    }

    // Reset after all uploads are complete
    setShowUploadModal(false);
    setUploadFiles([]);
    setUploadProgress({});
    setOverallProgress(0);
    fetchFiles(currentPath);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Create a new folder
  const createFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await axios.post("/api/folder/create", {
        name: newFolderName,
        path: currentPath,
      });
      setNewFolderName("");
      setShowCreateFolderModal(false);
      fetchFiles(currentPath);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create folder");
    }
  };

  // Create a new file
  const createFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      await axios.post("/api/file/create", {
        name: newFileName,
        path: currentPath,
        content: newFileContent,
      });
      setNewFileName("");
      setNewFileContent("");
      setShowCreateFileModal(false);
      fetchFiles(currentPath);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create file");
    }
  };

  // Update file content
  const updateFileContent = async () => {
    if (!selectedFile) return;

    try {
      await axios.post(
        `/api/updatefile?path=${encodeURIComponent(selectedFile.path)}`,
        {
          content: editContent,
        }
      );
      setFileContent(editContent);
      setIsEditing(false);
      fetchFiles(currentPath);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update file");
    }
  };

  // Generate breadcrumb navigation
  const renderBreadcrumbs = () => {
    const paths = currentPath.split("/").filter(Boolean);
    let fullPath = "";

    const breadcrumbs = [
      <li key="home" className="flex items-center">
        <button
          onClick={() => navigateTo("/")}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <Home size={16} className="mr-1" />
          <span>Home</span>
        </button>
      </li>,
    ];

    paths.forEach((path, index) => {
      fullPath += `/${path}`;
      breadcrumbs.push(
        <li key={fullPath} className="flex items-center">
          <span className="mx-2 text-gray-500">/</span>
          <button
            onClick={() => navigateTo(fullPath)}
            className={`hover:text-blue-800 ${
              index === paths.length - 1
                ? "font-semibold text-blue-700"
                : "text-blue-600"
            }`}
          >
            {path}
          </button>
        </li>
      );
    });

    return (
      <nav className="flex items-center bg-white px-4 py-2 rounded-lg shadow mb-4 overflow-x-auto">
        <ol className="flex flex-wrap items-center">{breadcrumbs}</ol>
      </nav>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">File Browser</h1>

        {/* Error alert */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
            <p>{error}</p>
            <button
              className="underline text-red-700 mt-1"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Breadcrumb navigation */}
        {renderBreadcrumbs()}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() =>
              navigateTo(currentPath.split("/").slice(0, -1).join("/") || "/")
            }
            disabled={currentPath === "/"}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
              currentPath === "/"
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
            }`}
          >
            <ArrowLeft className="mr-2" />
            Back
          </button>

          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="mr-2" />
            Create New
          </button>

          {showCreateMenu && (
            <div className="absolute mt-12 bg-white shadow-lg rounded-md border border-gray-200 z-10">
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  setShowCreateFolderModal(true);
                }}
                className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                <FolderPlus className="mr-2 text-yellow-500" />
                New Folder
              </button>
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  setShowCreateFileModal(true);
                }}
                className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                <FilePlus className="mr-2 text-blue-500" />
                New File
              </button>
              <button
                onClick={() => {
                  setShowCreateMenu(false);
                  setShowUploadModal(true);
                }}
                className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                <Upload className="mr-2 text-green-500" />
                Upload File
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Files list */}
          <div className="bg-white rounded-lg shadow p-4 lg:w-1/2 w-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Files</h2>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-blue-600" size={40} />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No files or folders found</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {files.map((file) => (
                  <li key={file.id} className="relative">
                    <div
                      className={`flex items-center justify-between p-3 ${
                        selectedFile?.id === file.id
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => handleFileClick(file)}
                    >
                      <div className="flex items-center min-w-0">
                        <span className="mr-3 flex-shrink-0">
                          {getFileIcon(file)}
                        </span>
                        <div className="truncate">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          {file.fileType !== "folder" && (
                            <p className="text-xs text-gray-500 truncate">
                              {file.size} • {file.modifiedAt}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFileOptions(
                            showFileOptions === file.id ? null : file.id
                          );
                        }}
                        className="ml-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {showFileOptions === file.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          {file.fileType !== "folder" && !file.binary && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFileClick(file);
                                setShowFileOptions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            >
                              <Edit className="mr-2 text-blue-500" />
                              Edit
                            </button>
                          )}
                          {file.fileType !== "folder" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadFile(file);
                                setShowFileOptions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            >
                              <Download className="mr-2 text-green-500" />
                              Download
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(file);
                              setShowFileOptions(null);
                            }}
                            className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600"
                          >
                            <Trash2 className="mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File preview */}
          {selectedFile && (
            <div className="bg-white rounded-lg shadow p-4 lg:w-1/2 w-full">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Preview
              </h2>

              {selectedFile ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <span className="mr-3">{getFileIcon(selectedFile)}</span>
                      <h3 className="text-lg font-medium">
                        {selectedFile.name}
                      </h3>
                    </div>
                    <div className="flex space-x-2">
                      {!selectedFile.binary && !isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                        >
                          <Edit className="mr-1" /> Edit
                        </button>
                      )}
                      {!selectedFile.binary && isEditing && (
                        <button
                          onClick={updateFileContent}
                          className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                        >
                          Save
                        </button>
                      )}
                      {!selectedFile.binary && isEditing && (
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditContent(fileContent);
                          }}
                          className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                      {selectedFile.fileType !== "folder" && (
                        <button
                          onClick={() => downloadFile(selectedFile)}
                          className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
                        >
                          <Download className="mr-1" /> Download
                        </button>
                      )}
                    </div>
                  </div>

                  {showFileContent &&
                    !selectedFile.binary &&
                    (isEditing ? (
                      <div className="h-96">
                        <div className="mb-2 flex justify-end">
                          <select
                            value={editorTheme}
                            onChange={(e) => setEditorTheme(e.target.value)}
                            className="px-2 py-1 bg-gray-100 rounded-md text-sm mr-2"
                          >
                            <option value="github">GitHub Theme</option>
                            <option value="monokai">Monokai Theme</option>
                          </select>
                        </div>
                        <AceEditor
                          mode={editorMode}
                          theme={editorTheme}
                          onChange={setEditContent}
                          value={editContent}
                          name="file-editor"
                          editorProps={{ $blockScrolling: true }}
                          setOptions={{
                            enableBasicAutocompletion: true,
                            enableLiveAutocompletion: true,
                            enableSnippets: true,
                            showLineNumbers: true,
                            tabSize: 2,
                          }}
                          width="100%"
                          height="100%"
                          fontSize={14}
                          showPrintMargin={false}
                          style={{
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-96">
                        <AceEditor
                          mode={editorMode}
                          theme={editorTheme}
                          value={fileContent}
                          name="file-viewer"
                          editorProps={{ $blockScrolling: true }}
                          width="100%"
                          height="100%"
                          fontSize={14}
                          showPrintMargin={false}
                          readOnly={true}
                          style={{
                            borderRadius: "4px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </div>
                    ))}

                  {selectedFile.binary && (
                    <div className="text-center p-10 bg-gray-50 rounded-md border border-gray-200">
                      <CloudDownload
                        className="mx-auto text-gray-400"
                        size={48}
                      />
                      <p className="mt-4 text-gray-600">
                        Binary file - Cannot preview. Click download to save the
                        file.
                      </p>
                      <button
                        onClick={() => downloadFile(selectedFile)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 hidden">
                  <File className="mb-2" size={40} />
                  <p>Select a file to preview</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New Folder</h3>
            <form onSubmit={createFolder}>
              <div className="mb-4">
                <label
                  htmlFor="folderName"
                  className="block text-gray-700 mb-2"
                >
                  Folder Name
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create File Modal */}
      {showCreateFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Create New File</h3>
            <form onSubmit={createFile}>
              <div className="mb-4">
                <label htmlFor="fileName" className="block text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="fileContent"
                  className="block text-gray-700 mb-2"
                >
                  Content (optional)
                </label>
                <textarea
                  id="fileContent"
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="w-full h-32 p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFileModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Upload Files</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Select Files</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelection}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  multiple
                  required
                />
              </div>

              {uploadFiles.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Files to upload:
                  </div>
                  <ul className="max-h-40 overflow-y-auto border border-gray-200 rounded-md divide-y">
                    {uploadFiles.map((file) => (
                      <li
                        key={file.name}
                        className="p-2 flex justify-between items-center"
                      >
                        <div className="flex items-center">
                          <File className="text-gray-500 mr-2" size={16} />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <div className="flex items-center">
                          {uploadProgress[file.name] > 0 &&
                          uploadProgress[file.name] < 100 ? (
                            <span className="text-xs mr-2">
                              {uploadProgress[file.name]}%
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeFileFromUpload(file.name)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadFiles.length > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span>{overallProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFiles([]);
                    setUploadProgress({});
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadFiles.length === 0}
                  className={`px-4 py-2 rounded-md ${
                    uploadFiles.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;
