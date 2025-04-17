const Settings = () => (
  <div>
    <p className="text-gray-700">Configure application preferences</p>
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
        <span>Dark Mode</span>
        <div className="w-12 h-6 bg-gray-200 rounded-full relative">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded">
        <span>Notifications</span>
        <div className="w-12 h-6 bg-blue-500 rounded-full relative">
          <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
        </div>
      </div>
    </div>
  </div>
);

export default Settings;
