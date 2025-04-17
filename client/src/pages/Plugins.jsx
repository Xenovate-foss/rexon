import Plugin from "@/components/Plugin";
import { Link } from "react-router-dom";
import { Grid2x2Plus } from "lucide-react";

const plugins = [
  { name: "login", version: "1.0.0" },
  { name: "Lodestone", version: "0.123.0" },
];

const Plugins = () => (
  <div>
    <p className="text-gray-700">Install and manage system plugins</p>
    <div className="mt-4 space-y-2">
      {plugins.map((plugin) => (
        <Plugin key={plugin.name} name={plugin.name} version={plugin.version} />
      ))}
      <Link to={"/plugin-explorer"}>
        <button className="m-4 px-4 py-2 bg-blue-800 flex gap-2 text-white rounded-md shadow-sm hover:bg-blue-300 cursor-pointer">
          <Grid2x2Plus /> Explore Plugins
        </button>
      </Link>
    </div>
  </div>
);

export default Plugins;
