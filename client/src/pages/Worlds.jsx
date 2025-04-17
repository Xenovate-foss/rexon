import { Earth, Trash2, Upload, Download } from "lucide-react";

const worlds = [
  { name: "World", overworld: true },
  { name: "The_Nether", overworld: false, nether: true },
  { name: "The_end", overworld: false, nether: false, end: true }
];

export default function Worlds() {
  return (
    <div className="p-4">
      <p className="text-gray-700 text-lg font-medium">Manage your worlds</p>
      <div className="mt-4 space-y-2 border-blue-800 gap-4">
        {worlds.map((world) => (
                      <div key={world.name} className="p-3 border border-blue-300 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white shadow-sm hover:bg-blue-50 transition-colors">
            <div className="flex items-center gap-3">
              <Earth 
                className={`${
                  world.overworld 
                    ? "text-green-500" 
                    : world.nether 
                    ? "text-red-500" 
                    : "text-purple-500"
                } h-5 w-5 flex-shrink-0`} 
              />
              <span className="font-medium truncate">{world.name}</span>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1 flex-1 sm:flex-auto justify-center">
                <Upload className="h-4 w-4" /> 
                <span>Upload</span>
              </button>
              <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-1 flex-1 sm:flex-auto justify-center">
                <Download className="h-4 w-4" /> 
                <span>Download</span>
              </button>
              <button className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center gap-1 flex-1 sm:flex-auto justify-center">
                <Trash2 className="h-4 w-4" /> 
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}