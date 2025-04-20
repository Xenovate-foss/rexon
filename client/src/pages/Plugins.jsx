import Plugin from "@/components/Plugin";
import PluginUploader from "@/components/PluginUploader";
import { Link } from "react-router-dom";
import {
  Grid2x2Plus,
  Package,
  AlertCircle,
  Loader,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import axios from "axios";
import { useState, useEffect } from "react";

const Plugins = () => {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState({
    isDeleting: false,
    pluginName: null,
  });
  const [showUploader, setShowUploader] = useState(false);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/plugins");
      setPlugins(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching plugins:", err);
      setError("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleUploadComplete = (newPlugins) => {
    // Refresh the plugin list
    fetchPlugins();
    // Auto-hide the uploader after successful upload
    setShowUploader(false);
  };

  const handleDeletePlugin = async (filename) => {
    try {
      setDeleteStatus({ isDeleting: true, pluginName: filename });
      await axios.delete(`/api/plugin/${filename}`);

      // Remove the plugin from the state
      setPlugins(plugins.filter((plugin) => plugin.filename !== filename));

      // Reset delete status
      setDeleteStatus({ isDeleting: false, pluginName: null });
    } catch (error) {
      console.error(`Error deleting plugin: ${error}`);
      // Show error briefly
      setError(
        `Failed to delete plugin: ${
          error.response?.data?.message || error.message
        }`
      );
      setTimeout(() => setError(null), 5000);
      setDeleteStatus({ isDeleting: false, pluginName: null });
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg shadow-sm">
      <div className="flex items-center mb-6 border-b border-gray-200 pb-4">
        <Package className="text-blue-600 mr-3" size={24} />
        <h2 className="text-2xl font-semibold text-gray-800">Plugin Manager</h2>
      </div>

      <p className="text-gray-700 mb-6">
        Install and manage system plugins to extend functionality
      </p>

      {/* Upload plugins button */}
      <button
        onClick={() => setShowUploader(!showUploader)}
        className="w-full mb-6 py-3 px-6 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-between rounded-md shadow-sm"
      >
        <div className="flex items-center">
          <Upload size={18} className="text-blue-600 mr-2" />
          <span className="font-medium text-gray-800">Upload Plugins</span>
        </div>
        {showUploader ? (
          <ChevronUp size={18} className="text-gray-600" />
        ) : (
          <ChevronDown size={18} className="text-gray-600" />
        )}
      </button>

      {/* Plugin upload component (toggleable) */}
      {showUploader && (
        <div className="mb-8">
          <PluginUploader onUploadComplete={handleUploadComplete} />
        </div>
      )}

      <h3 className="text-lg font-medium text-gray-800 mb-4">
        Installed Plugins
      </h3>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow-sm">
            <Loader className="text-blue-500 animate-spin mb-4" size={32} />
            <p className="text-gray-600">Loading plugins...</p>
          </div>
        ) : error ? (
          <div className="flex items-center bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertCircle className="text-red-500 mr-3" size={20} />
            <p className="text-red-600">{error}</p>
          </div>
        ) : plugins.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm divide-y divide-gray-100">
            {plugins.map((plugin) => (
              <div
                key={plugin.filename}
                className="p-4 flex items-center justify-between"
              >
                <Plugin name={plugin.name} version={plugin.version} />
                <button
                  onClick={() => handleDeletePlugin(plugin.filename)}
                  disabled={
                    deleteStatus.isDeleting &&
                    deleteStatus.pluginName === plugin.filename
                  }
                  className={`p-2 rounded-full ${
                    deleteStatus.isDeleting &&
                    deleteStatus.pluginName === plugin.filename
                      ? "bg-gray-100 cursor-not-allowed"
                      : "hover:bg-red-50 text-gray-500 hover:text-red-600"
                  }`}
                >
                  {deleteStatus.isDeleting &&
                  deleteStatus.pluginName === plugin.filename ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-sm text-center">
            <Package className="text-gray-400 mx-auto mb-3" size={36} />
            <p className="text-gray-500">No plugins found</p>
            <p className="text-gray-400 text-sm mt-2">
              Explore the marketplace to discover plugins
            </p>
          </div>
        )}

        <Link to="/plugin-explorer" className="block mt-8">
          <button className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 text-white rounded-md shadow-md font-medium">
            <Grid2x2Plus size={18} /> Explore Plugin Marketplace
          </button>
        </Link>
      </div>
    </div>
  );
};

export default Plugins;
