import Xterm from "../components/Terminal.jsx";
import React, { useState } from "react";

export default function Console() {
  return (
    <div className="grid grid-row-1 sm:grid-flow-col sm:grid-row-2 gap-2">
      <div>
        <Xterm />
      </div>
      <div className="bg-black text-white w-auto h-auto rounded-sm p-2 px-8 mt-4 m-2">
        <h2 className="text-medium">Info</h2>
      </div>
    </div>
  );
}
