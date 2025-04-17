import { useState } from "react";

const Settings = () => {
  const [config, setConfig] = useState([
    { name: "startup", value: "java -jar server.jar" },
    { name: "enabled", value: true },
  ]);

  const handleCommandChange = (e) => {
    const newConfig = [...config];
    newConfig[0].value = e.target.value;
    setConfig(newConfig);
  };

  const toggleEnabled = () => {
    const newConfig = [...config];
    newConfig[1].value = !newConfig[1].value;
    setConfig(newConfig);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Configure Application
      </h2>

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

        {/* Toggle Switch */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="font-medium text-gray-700">Enable Service</p>
            <p className="text-sm text-gray-500">
              Automatically start the service on boot
            </p>
          </div>

          <button
            onClick={toggleEnabled}
            className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors ${
              config[1].value ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                config[1].value ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings;
