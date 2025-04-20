import { useState, useEffect } from "react";
import { Earth, Trash2, Upload, Download, RefreshCw, Check, AlertCircle } from "lucide-react";
import axios from "axios";

export default function Worlds() {
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch worlds from backend
  const fetchWorlds = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get("/api/worlds");
      setWorlds(response.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching worlds:", error);
      showAlert("Failed to load worlds", "error");
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorlds();
  }, []);

  // Show alert message
  const showAlert = (message, type) => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: "", type: "" });
    }, 3000);
  };

  // Delete a world
  const handleDelete = async (worldName) => {
    if (window.confirm(`Are you sure you want to delete ${worldName}?`)) {
      try {
        await axios.delete(`/api/world/${worldName}`);
        showAlert(`${worldName} deleted successfully`, "success");
        fetchWorlds();
      } catch (error) {
        console.error(`Error deleting world ${worldName}:`, error);
        showAlert(`Failed to delete ${worldName}`, "error");
      }
    }
  };

  // Handle file upload
  const handleUpload = async (worldName, file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("worldZip", file);
      
      await axios.post(`/api/world/${worldName}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      showAlert(`${worldName} uploaded successfully`, "success");
      fetchWorlds();
      setUploading(false);
    } catch (error) {
      console.error(`Error uploading world ${worldName}:`, error);
      showAlert(`Failed to upload ${worldName}`, "error");
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = (worldName) => {
    // This would typically point to your backend download endpoint
    window.location.href = `/api/world/${worldName}/download`;
    showAlert(`Downloading ${worldName}...`, "info");
  };

  // File input reference for uploading
  const uploadWorld = (worldName) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".zip";
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        handleUpload(worldName, e.target.files[0]);
      }
    };
    fileInput.click();
  };

  // Determine icon color based on world type
  const getIconColor = (world) => {
    if (world.overworld) return "text-green-500";
    if (world.nether) return "text-red-500";
    if (world.end) return "text-purple-500";
    return "text-blue-500";
  };

  // Determine world type label
  const getWorldTypeLabel = (world) => {
    if (world.overworld) return "Overworld";
    if (world.nether) return "Nether";
    if (world.end) return "End";
    return "Unknown";
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-900">Minecraft Worlds</h1>
          <p className="text-gray-600 mt-1">Manage your server worlds</p>
        </div>
        <button 
          onClick={fetchWorlds}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alert */}
      {alert.show && (
        <div className={`mb-4 p-3 rounded-md flex items-center ${
          alert.type === "success" ? "bg-green-100 text-green-800" :
          alert.type === "error" ? "bg-red-100 text-red-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {alert.type === "success" ? <Check className="h-5 w-5 mr-2" /> : 
           alert.type === "error" ? <AlertCircle className="h-5 w-5 mr-2" /> :
           <Earth className="h-5 w-5 mr-2" />}
          {alert.message}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col items-center">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-500 mb-2" />
            <span className="text-gray-600">Loading worlds...</span>
          </div>
        </div>
      ) : worlds.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Earth className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No worlds found</h3>
          <p className="text-gray-500 mb-4">Upload a new world to get started</p>
          <button 
            onClick={() => uploadWorld("world")}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload New World
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {worlds.map((world) => (
            <div 
              key={world.name} 
              className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <div className={`${getIconColor(world)} p-2 rounded-full bg-opacity-20 flex-shrink-0 ${
                  world.overworld ? "bg-green-100" : 
                  world.nether ? "bg-red-100" : 
                  "bg-purple-100"
                }`}>
                  <Earth className="h-6 w-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">{world.name}</h3>
                  <p className="text-sm text-gray-500">{getWorldTypeLabel(world)}</p>
                </div>
              </div>

              <div className="p-4 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => uploadWorld(world.name)}
                  disabled={uploading}
                  className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1 justify-center disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" /> 
                  <span>Upload</span>
                </button>
                <button 
                  onClick={() => handleDownload(world.name)}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1 justify-center"
                >
                  <Download className="h-4 w-4" /> 
                  <span>Download</span>
                </button>
                <button 
                  onClick={() => handleDelete(world.name)}
                  className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1 justify-center"
                >
                  <Trash2 className="h-4 w-4" /> 
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}