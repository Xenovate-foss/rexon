import React, { useState } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { Link, useLocation } from "react-router-dom";

// Import any icons you want to use
// For example, if using React Icons:
// import { FaTachometerAlt, FaGem, FaList, FaRegLaughWink } from 'react-icons/fa';

export default function SidebarComponent() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Function to check if a menu item is active
  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <Sidebar
        collapsed={collapsed}
        backgroundColor="#ffffff"
        rootStyles={{
          border: "1px solid #efefef",
        }}
      >
        <div style={{ padding: "16px", textAlign: "center" }}>
          <h3 style={{ margin: 0 }}>My App</h3>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginTop: "8px", padding: "8px" }}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        <Menu
          transitionDuration={300}
          menuItemStyles={{
            button: ({ level, active }) => {
              return {
                backgroundColor: active ? "#13395e" : undefined,
                color: active ? "#b6c8d9" : undefined,
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                  color: "#333333",
                },
              };
            },
          }}
        >
          <MenuItem
            active={isActive("/documentation")}
            onClick={() => {
              // Optional logging or analytics
              console.log("Documentation clicked");
            }}
            component={<Link to="/documentation" />}
          >
            Documentation
          </MenuItem>

          <MenuItem
            active={isActive("/calendar")}
            component={<Link to="/calendar" />}
          >
            Calendar
          </MenuItem>

          <MenuItem
            active={isActive("/e-commerce")}
            component={<Link to="/e-commerce" />}
          >
            E-commerce
          </MenuItem>
        </Menu>
      </Sidebar>

      {/* This is where your page content would go */}
      <div style={{ padding: "16px", width: "100%" }}>
        <h2>Your page content goes here</h2>
      </div>
    </div>
  );
}