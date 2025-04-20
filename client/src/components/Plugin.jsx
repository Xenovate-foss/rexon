import { Package } from "lucide-react";

const Plugin = ({ name, version }) => {
  return (
    <div className="flex items-center p-4">
      <div className="bg-blue-100 p-2 rounded-md mr-4">
        <Package className="text-blue-600" size={20} />
      </div>
      <div>
        <h3 className="font-medium text-gray-800">{name}</h3>
        <p className="text-sm text-gray-500">Version: {version}</p>
      </div>
    </div>
  );
};

export default Plugin;
