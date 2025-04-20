import { useState, useEffect } from "react";
import {
  X,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Check,
} from "lucide-react";

const PaperMCVersionSelector = () => {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildLoading, setBuildLoading] = useState(false);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [error, setError] = useState(null);
  const [buildError, setBuildError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [currentServer, setCurrentServer] = useState(null);
  const [loadingCurrentServer, setLoadingCurrentServer] = useState(true);

  // Fetch the current installed server version
  useEffect(() => {
    const fetchCurrentServer = async () => {
      try {
        setLoadingCurrentServer(true);
        const response = await fetch("/api/version/current");

        if (!response.ok) {
          throw new Error(
            `Failed to fetch current server: ${response.statusText}`
          );
        }

        const data = await response.json();
        setCurrentServer(data);
      } catch (error) {
        console.error("Failed to fetch current server:", error);
        // Don't set an error state, just set currentServer to null
        setCurrentServer(null);
      } finally {
        setLoadingCurrentServer(false);
      }
    };

    fetchCurrentServer();
  }, [downloadSuccess]); // Re-fetch when download is successful

  // Fetch versions from PaperMC API
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Real API call to PaperMC
        const response = await fetch(
          "https://api.papermc.io/v2/projects/paper"
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch versions: ${response.statusText}`);
        }

        const data = await response.json();

        // Most recent versions first
        const versionList = data.versions.reverse();

        // For each version, create an object with the version number and metadata
        const formattedVersions = versionList.map((version, index) => ({
          version,
          // This is an estimation - in a real app you might want to fetch actual release dates
          date: new Date(Date.now() - index * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          isLts: ["1.20.4", "1.19.4", "1.18.2", "1.16.5"].includes(version), // Sample LTS versions
        }));

        setVersions(formattedVersions);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch versions:", error);
        setError("Failed to load versions. Please try again later.");
        setLoading(false);
      }
    };

    fetchVersions();
  }, []);

  // Fetch builds for a specific version
  const fetchBuilds = async (version) => {
    try {
      setBuildLoading(true);
      setBuildError(null);

      // Real API call to get builds for specific version
      const response = await fetch(
        `https://api.papermc.io/v2/projects/paper/versions/${version}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch builds: ${response.statusText}`);
      }

      const data = await response.json();

      // For each build number, fetch details (limit to 15 builds to avoid too many requests)
      const buildDetails = await Promise.all(
        data.builds.slice(0, 15).map(async (buildNum) => {
          try {
            const buildResponse = await fetch(
              `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${buildNum}`
            );

            if (!buildResponse.ok) {
              throw new Error(
                `Failed to fetch build ${buildNum}: ${buildResponse.statusText}`
              );
            }

            const buildData = await buildResponse.json();

            return {
              build: buildNum,
              date: new Date(buildData.timestamp).toISOString().split("T")[0],
              changes:
                buildData.changes && buildData.changes.length > 0
                  ? buildData.changes.map((c) => c.summary).join(". ")
                  : "No changelog available",
            };
          } catch (err) {
            console.error(`Error fetching details for build ${buildNum}:`, err);
            return {
              build: buildNum,
              date: "Unknown",
              changes: "Failed to load changelog",
            };
          }
        })
      );

      // Sort by build number (descending)
      buildDetails.sort((a, b) => b.build - a.build);

      setBuilds(buildDetails);
      setBuildLoading(false);
    } catch (error) {
      console.error(`Failed to fetch builds for version ${version}:`, error);
      setBuildError(
        `Failed to load builds for version ${version}. Please try again later.`
      );
      setBuildLoading(false);
    }
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    fetchBuilds(version.version);
    setShowBuildDialog(true);
  };

  const handleBuildSelect = (build) => {
    setSelectedBuild(build);
  };

  const handleDownload = async () => {
    if (!selectedVersion || !selectedBuild) return;

    try {
      setDownloading(true);
      setDownloadSuccess(null);
      setDownloadError(null);

      // Make a request to the backend to download the server JAR
      const response = await fetch(
        `/api/download/latest/${selectedVersion.version}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            build: selectedBuild.build,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to download the server JAR"
        );
      }

      const data = await response.json();

      setDownloadSuccess({
        message: data.message,
        filePath: data.filePath,
      });

      // Close the build dialog (optional - can keep open to show success message)
      setTimeout(() => {
        setShowBuildDialog(false);
        setSelectedBuild(null);
        setDownloadSuccess(null);
      }, 3000);
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError(error.message);
    } finally {
      setDownloading(false);
    }
  };

  // Check if a specific version is currently installed
  const isVersionInstalled = (version) => {
    if (!currentServer || !currentServer.id) return false;

    // Check if the version ID starts with the version number
    // For example, if currentServer.id is "1.20.4-375" and version is "1.20.4"
    return currentServer.id.startsWith(version);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-gray-800 overflow-hidden rounded-sm">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-500 to-blue-800 px-4 py-5 shadow-md rounded-lg text-center text-white sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center">
          <img
            src="https://assets.papermc.io/brand/papermc_logo.min.svg"
            alt="PaperMC Logo"
            className="h-12 w-12 mr-0 sm:mr-4 mb-2 sm:mb-0"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              PaperMC Version Selector
            </h1>
            <p className="text-blue-200 text-sm sm:text-base">
              Select a version and build to download
            </p>
            {currentServer && currentServer.id && (
              <p className="text-green-200 text-sm mt-1">
                Currently installed: {currentServer.name || currentServer.id}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
            <span className="text-gray-600">Loading versions...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500 text-center bg-red-50 p-4 rounded-lg shadow-sm border border-red-200 max-w-md">
              <p>{error}</p>
              <button
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-700">
                Available Versions
              </h2>
              <p className="text-gray-500 text-sm">
                Click on a version to view available builds
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {versions.map((version) => {
                const installed = isVersionInstalled(version.version);

                return (
                  <div
                    key={version.version}
                    className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden relative"
                    onClick={() => handleVersionSelect(version)}
                  >
                    <div className="p-4 pb-16 relative">
                      <div className="flex justify-between">
                        <h3 className="text-xl font-bold text-blue-400">
                          Paper {version.version}
                        </h3>
                        <div className="flex gap-2">
                          {installed && (
                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                              <Check size={12} className="mr-1" />
                              Installed
                            </span>
                          )}
                          {version.isLts && (
                            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              LTS
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        Released: {version.date}
                      </p>
                      <img
                        src="https://assets.papermc.io/brand/papermc_logo.min.svg"
                        height={64}
                        width={64}
                        className="absolute top-0 right-0 bottom-3 right-3 opacity-20"
                        alt="PaperMC Logo"
                      />
                    </div>
                    <div className="absolute mt-18 bottom-0 left-0 right-0 bg-gray-900 bg-opacity-80 p-3">
                      <button
                        className={`w-full ${
                          installed
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white py-2 rounded-md transition-colors text-sm flex items-center justify-center`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVersionSelect(version);
                        }}
                      >
                        {installed ? (
                          <>
                            <Check size={16} className="mr-2" />
                            View Installed
                          </>
                        ) : (
                          <>
                            <Download size={16} className="mr-2" />
                            Select Version
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Build selection dialog */}
      {showBuildDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center p-2 sm:p-4 z-50 overflow-hidden z-0">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] border border-gray-200">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-800 p-4 border-b border-gray-300 flex justify-between items-center rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Paper {selectedVersion.version}
                </h2>
                <p className="text-blue-200 text-sm">
                  {isVersionInstalled(selectedVersion.version)
                    ? "This version is currently installed"
                    : "Choose a build number to download"}
                </p>
              </div>
              <button
                className="text-white bg-blue-800 hover:bg-blue-700 rounded-full p-1 transition-colors"
                onClick={() => {
                  setShowBuildDialog(false);
                  setSelectedBuild(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 sm:p-3">
              {buildLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2
                    className="animate-spin text-blue-500 mr-2"
                    size={24}
                  />
                  <span className="text-gray-600">Loading builds...</span>
                </div>
              ) : buildError ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-red-500 text-center bg-red-50 p-4 rounded-lg border border-red-200 max-w-md">
                    <p>{buildError}</p>
                    <button
                      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
                      onClick={() => fetchBuilds(selectedVersion.version)}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 border-b flex justify-between">
                    <span>Build Number</span>
                    <span className="hidden sm:block">Date</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {builds.map((build) => {
                      // Check if this specific build is installed
                      const isBuildInstalled =
                        currentServer &&
                        currentServer.id &&
                        currentServer.id ===
                          `${selectedVersion.version}-${build.build}`;

                      return (
                        <div
                          key={build.build}
                          className={`p-3 hover:bg-blue-50 cursor-pointer transition-colors ${
                            selectedBuild?.build === build.build
                              ? "bg-blue-100"
                              : ""
                          } ${
                            isBuildInstalled
                              ? "bg-green-50 hover:bg-green-100"
                              : ""
                          }`}
                          onClick={() => handleBuildSelect(build)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-grow pr-2">
                              <div className="flex items-center">
                                <h3 className="font-medium text-blue-700">
                                  Build #{build.build}
                                </h3>
                                {isBuildInstalled && (
                                  <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center">
                                    <Check size={10} className="mr-1" />
                                    Installed
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 block sm:hidden">
                                {build.date}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {build.changes}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="hidden sm:block text-gray-500 text-sm">
                                {build.date}
                              </span>
                              {selectedBuild?.build === build.build && (
                                <div className="text-blue-600 mt-2">
                                  <ChevronRight size={20} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Download Status Messages */}
            {downloadSuccess && (
              <div className="mx-4 my-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <div>
                    <p className="font-medium">{downloadSuccess.message}</p>
                    <p className="text-sm text-green-600">
                      Downloaded to: {downloadSuccess.filePath}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {downloadError && (
              <div className="mx-4 my-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  <p className="font-medium">
                    Download failed: {downloadError}
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between gap-2">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                onClick={() => {
                  setShowBuildDialog(false);
                  setSelectedBuild(null);
                  setDownloadSuccess(null);
                  setDownloadError(null);
                }}
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Versions
              </button>

              <button
                className={`${
                  isVersionInstalled(selectedVersion.version) && !selectedBuild
                    ? "bg-gray-400"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors ${
                  (!selectedBuild || downloading) &&
                  "opacity-50 cursor-not-allowed"
                }`}
                disabled={!selectedBuild || downloading}
                onClick={handleDownload}
              >
                {downloading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    {currentServer &&
                    currentServer.id &&
                    currentServer.id ===
                      `${selectedVersion.version}-${selectedBuild?.build}`
                      ? "Reinstall"
                      : "Download"}{" "}
                    Build #{selectedBuild?.build}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 px-3 text-center text-gray-500 text-sm border-t border-gray-200">
        <div className="flex items-center justify-center">
          <a
            href="https://papermc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-blue-600 transition-colors"
          >
            Visit Official PaperMC Website
            <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
      </footer>
    </div>
  );
};

function ChevronRight({ size = 24 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default PaperMCVersionSelector;
