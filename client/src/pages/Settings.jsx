import { useState, useEffect } from "react";
import axios from "axios";

const Settings = () => {
  const [config, setConfig] = useState([
    { name: "startup", value: "java -jar server.jar" },
    { name: "ngrokToken", value: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch initial config when component mounts
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/config");

      // Convert the response data to match our format
      if (response.data) {
        const formattedConfig = [
          {
            name: "startup",
            value: response.data.startup || "java -jar server.jar",
          },
          {
            name: "ngrokToken",
            value:
              response.data.ngrokToken !== undefined
                ? response.data.ngrokToken
                : "",
          },
        ];
        setConfig(formattedConfig);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      setMessage({ type: "error", text: "Failed to load configuration" });
    } finally {
      setLoading(false);
    }
  };

  const handleCommandChange = (e) => {
    const newConfig = [...config];
    newConfig[0].value = e.target.value;
    setConfig(newConfig);
  };

  const handleTokenChange = (e) => {
    const newConfig = [...config];
    newConfig[1].value = e.target.value;
    setConfig(newConfig);
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Convert our array format to object format for API
      const configObject = {
        startup: config[0].value,
        ngrokToken: config[1].value,
      };

      await axios.post("/api/config", configObject);
      setMessage({ type: "success", text: "Configuration saved successfully" });
    } catch (error) {
      console.error("Error saving config:", error);
      setMessage({ type: "error", text: "Failed to save configuration" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Configure Application
      </h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-5">
        {/* Start Up Command */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Up Command
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] font-mono text-sm"
            value={config[0].value}
            onChange={handleCommandChange}
          />
        </div>

        {/* Ngrok token */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ngrok Token
          </label>
          <div className="space-y-2">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              value={config[1].value}
              onChange={handleTokenChange}
              placeholder="Enter your Ngrok token"
            />
            <p className="text-xs text-gray-500">
              Enter your Ngrok authentication token for public URL access
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={saveConfig}
          disabled={loading}
          className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default Settings;
