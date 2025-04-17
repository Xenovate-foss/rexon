import Xterm from "../components/Terminal";
import React, { useState } from "react";

export default function Console() {
  const [isServerOnline, setIsServerOnline] = useState(false);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <Xterm />
      </div>
      <div className="bg-black mt-15 text-white rounded-sm p-4 m-2">
        <h2 className="text-lg font-medium">Info</h2>
      </div>
    </div>
  );
}
