import Xterm from "../components/Terminal";
import React, { useState } from "react";

export default function Console() {
  const [isServerOnline, setIsServerOnline] = useState(false);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div>
        <Xterm />
      </div>
    </div>
  );
}
