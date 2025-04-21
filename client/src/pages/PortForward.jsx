import React, { useState } from "react";

const forwarderData = {
  isForwarding: true,
  domain: "localhost",
  forwardedPort: 29635,
  isTokenProvided: false,
};

const PortForward = () => {
  const [token, setToken] = useState("");

  return (
    <div className="p-4">
      <p className="text-gray-700">Configure network port forwarding (ngrok)</p>
      <div className="mt-4 space-y-2">
        {!forwarderData.isTokenProvided && (
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Enter your ngrok token"
          />
        )}
        {forwarderData.isForwarding && (
          <div className="grid grid-cols-3 p-3 border border-gray-200 rounded">
            <span>80 → 8080</span>
            <span>HTTP</span>
            <span className="text-green-500">Active</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortForward;
