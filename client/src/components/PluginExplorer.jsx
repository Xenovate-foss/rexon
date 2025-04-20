import axios from "axios";
import React, { useState, useEffect } from "react";
import {
  Download,
  Star,
  FolderDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";

export default function PluginExplorer() {
  const [plugins, setPlugins] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [installing, setInstalling] = useState({});
  const [installStatus, setInstallStatus] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const resultsPerPage = 20;

  const fetchPlugins = async (searchQuery, page = 1) => {
    try {
      setLoading(true);
      setError(null);

      // Calculate offset for pagination
      const offset = (page - 1) * resultsPerPage;

      const response = await axios.get(
        `https://api.modrinth.com/v2/search?query=${encodeURIComponent(
          searchQuery
        )}&limit=${resultsPerPage}&offset=${offset}&facets=[["project_type:plugin"]]`
      );

      setPlugins(response.data.hits || []);
      setTotalResults(response.data.total_hits || 0);
      setTotalPages(
        Math.ceil((response.data.total_hits || 0) / resultsPerPage)
      );
    } catch (error) {
      console.error("Error fetching plugins:", error);
      setError("Failed to fetch plugins. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add new function to install a plugin
  const installPlugin = async (plugin) => {
    try {
      setInstalling((prev) => ({ ...prev, [plugin.project_id]: true }));
      setInstallStatus((prev) => ({
        ...prev,
        [plugin.project_id]: {
          status: "installing",
          message: "Installing plugin...",
        },
      }));

      // Call the API endpoint to add the plugin
      const response = await axios.post(`/api/addplugin/${plugin.slug}`);

      if (response.data.success) {
        setInstallStatus((prev) => ({
          ...prev,
          [plugin.project_id]: {
            status: "success",
            message: "Plugin installed successfully!",
          },
        }));
      } else if (response.data.warning) {
        setInstallStatus((prev) => ({
          ...prev,
          [plugin.project_id]: {
            status: "warning",
            message: response.data.message || "Plugin installed with warnings.",
          },
        }));
      }

      // Clear the status after 5 seconds
      setTimeout(() => {
        setInstallStatus((prev) => {
          const newStatus = { ...prev };
          delete newStatus[plugin.project_id];
          return newStatus;
        });
      }, 5000);
    } catch (error) {
      console.error("Error installing plugin:", error);
      setInstallStatus((prev) => ({
        ...prev,
        [plugin.project_id]: {
          status: "error",
          message: error.response?.data?.message || "Failed to install plugin.",
        },
      }));
    } finally {
      setInstalling((prev) => {
        const newInstalling = { ...prev };
        delete newInstalling[plugin.project_id];
        return newInstalling;
      });
    }
  };

  useEffect(() => {
    // Fetch plugins on initial load
    fetchPlugins(query);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    fetchPlugins(query);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    fetchPlugins(query, newPage);
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg shadow-md mb-6">
        <h1 className="text-3xl font-bold mb-4">Minecraft Plugin Explorer</h1>
        <p className="text-blue-100 mb-6">
          Search and discover thousands of Minecraft plugins from Modrinth
        </p>

        <form onSubmit={handleSearch} className="relative">
          <div className="flex gap-2 items-center">
            <div className="relative flex-grow">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plugins..."
                className="w-full p-3 pl-10 rounded-l-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={20}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-3 rounded-r-lg hover:bg-blue-600 transition-colors font-medium flex items-center"
              disabled={loading}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6">
          <div className="flex">
            <div className="py-1">
              <svg
                className="w-6 h-6 mr-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="font-bold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading plugins...</p>
        </div>
      ) : (
        <>
          {plugins.length > 0 && (
            <div className="mb-4 text-gray-600">
              Showing {(currentPage - 1) * resultsPerPage + 1}-
              {Math.min(currentPage * resultsPerPage, totalResults)} of{" "}
              {totalResults} results
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.length > 0 ? (
              plugins.map((plugin) => (
                <div
                  key={plugin.project_id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center p-4">
                    {plugin.icon_url ? (
                      <img
                        src={plugin.icon_url}
                        alt={`${plugin.title} icon`}
                        className="h-24 w-24 object-contain rounded-lg shadow-sm"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/api/placeholder/96/96";
                        }}
                      />
                    ) : (
                      <div className="h-24 w-24 bg-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-2xl font-bold text-blue-500">
                          {plugin.title?.charAt(0) || "P"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {plugin.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      By {plugin.author}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {plugin.categories?.slice(0, 2).map((category, idx) => (
                        <span
                          key={idx}
                          className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                      {plugin.versions?.[0] && (
                        <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                          {plugin.versions[0]}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 h-10 mb-4">
                      {plugin.description}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Download size={16} />
                          <span>
                            {plugin.downloads > 999
                              ? `${(plugin.downloads / 1000).toFixed(1)}k`
                              : plugin.downloads}
                          </span>
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Star
                            size={16}
                            fill="currentColor"
                            className="text-yellow-400"
                          />
                          <span>{plugin.follows}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Install button */}
                        <button
                          onClick={() => installPlugin(plugin)}
                          disabled={installing[plugin.project_id]}
                          className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${
                            installing[plugin.project_id]
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          }`}
                        >
                          {installing[plugin.project_id] ? (
                            <>
                              <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin"></div>
                              Installing
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              Install
                            </>
                          )}
                        </button>

                        <a
                          href={`https://modrinth.com/plugin/${plugin.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <FolderDown size={18} />
                        </a>
                      </div>
                    </div>

                    {/* Installation status message */}
                    {installStatus[plugin.project_id] && (
                      <div
                        className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${
                          installStatus[plugin.project_id].status === "success"
                            ? "bg-green-50 text-green-700"
                            : installStatus[plugin.project_id].status ===
                              "warning"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {installStatus[plugin.project_id].status ===
                        "success" ? (
                          <Check size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                        {installStatus[plugin.project_id].message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  No plugins found
                </h3>
                <p className="text-gray-500">
                  No plugins found for "{query}". Try a different search term.
                </p>
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg ${
                  currentPage === 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <ChevronLeft size={20} />
              </button>

              {/* Page number buttons */}
              {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                // Logic to show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = idx + 1;
                } else if (currentPage <= 3) {
                  pageNum = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + idx;
                } else {
                  pageNum = currentPage - 2 + idx;
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-blue-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg ${
                  currentPage === totalPages
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
