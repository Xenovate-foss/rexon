import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  Menu,
  X,
  Terminal,
  Settings as SettingsIcon,
  FolderClosed,
  Blocks,
  Earth,
  ChevronRight,
  ChevronLeft,
  EthernetPort,
  Grid2x2Plus,
  BookUp2,
  Home
} from "lucide-react";
import Console from "./pages/Console";
import FileManager from "./pages/FileManager";
import Plugins from "./pages/Plugins";
import PluginExplorer from "./components/PluginExplorer";
import Worlds from "./pages/Worlds";
import Settings from "./pages/Settings";
import Versions from "./pages/Version";
import PortForward from "./pages/PortForward";
import Dashboard from "./pages/Dashboard"

const SidebarContent = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname.substring(1) || "home";

  const menuItems = [
    { name: "Dashboard", icon: <Home />, path: ""},
    { name: "Console", icon: <Terminal />, path: "console" },
    { name: "File Manager", icon: <FolderClosed />, path: "file-manager" },
    { name: "Plugins", icon: <Blocks />, path: "plugins" },
    { name: "Plugin Explorer", icon: <Grid2x2Plus />, path: "plugin-explorer" },
    { name: "Worlds", icon: <Earth />, path: "worlds" },
    { name: "Port forward", icon: <EthernetPort />, path: "port-forward" },
    { name: "Version manager", icon: <BookUp2 />, path: "versions" },
    { name: "Settings", icon: <SettingsIcon />, path: "settings" },
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Mobile overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`bg-white text-black flex flex-col shadow-lg border-r border-gray-200 ${
          isCollapsed && !isMobile ? "w-16" : "w-64"
        } transition-all duration-300 ease-in-out ${
          isMobile ? "fixed top-0 left-0 h-full z-20" : ""
        } ${
          isMobile && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {(!isCollapsed || isMobile) && (
            <h1 className="text-xl font-bold">Rexon</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
          >
            {isMobile ? (
              <X size={20} />
            ) : isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <ul>
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={`/${item.path}`}
                  className={`flex items-center w-full p-3 ${
                    isCollapsed && !isMobile ? "justify-center" : "px-4"
                  } ${
                    currentPath === item.path
                      ? "bg-black text-white"
                      : "text-black hover:bg-blue-600 hover:text-white"
                  } transition-colors`}
                  onClick={() => {
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {(!isCollapsed || isMobile) && (
                    <span className="ml-3 whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      <div className="bg-gray-900 text-white rounded-x-5 px-5 w-full">
        <p>Rexon - v0.01.1(lotus)</p>
      </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-100 overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center mb-6">
            {isMobile && (
              <button
                className="mr-4 p-2 rounded-tr-lg rounded-tl-lg bg-black text-white hover:bg-blue-600 transition-colors"
                onClick={toggleSidebar}
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold">
              {menuItems.find((item) => item.path === currentPath)?.name ||
                currentPath.name}
            </h1>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/console" element={<Console />} />
              <Route path="/file-manager" element={<FileManager />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/worlds" element={<Worlds />} />
              <Route path="/port-forward" element={<PortForward />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plugin-explorer" element={<PluginExplorer />} />
              <Route path="/versions" element={<Versions />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with Router
const Sidebar = () => {
  return (
    <Router>
      <SidebarContent />
    </Router>
  );
};

export default Sidebar;
