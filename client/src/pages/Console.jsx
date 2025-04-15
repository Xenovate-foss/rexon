import Xterm from "../components/Terminal";
import React, { useState } from "react";

export default function Console() {
  const [isServerOnline, setIsServerOnline] = useState(false);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <div className="flex">
          <button 
            className="text-white px-4 py-2 m-2 bg-blue-800 shadow-sm rounded-md hover:bg-blue-600" 
            disabled={isServerOnline}
          >
            Start
          </button>
          <button 
            className="text-white px-4 py-2 m-2 bg-red-800 shadow-sm rounded-md hover:bg-red-600" 
            disabled={!isServerOnline}
          >
            Stop
          </button>
          <button 
            className="text-white px-4 py-2 m-2 bg-yellow-800 shadow-sm rounded-md hover:bg-yellow-600" 
            disabled={!isServerOnline}
          >
            Restart
          </button>
          <button 
            className="text-white px-4 py-2 m-2 bg-red-800 shadow-sm rounded-md hover:bg-red-600" 
            disabled={!isServerOnline}
          >
            Kill
          </button>
        </div>
        <Xterm />
      </div>
      <div className="bg-black mt-15 text-white rounded-sm p-4 m-2">
        <h2 className="text-lg font-medium">Info</h2>
      </div>
    </div>
  );
}