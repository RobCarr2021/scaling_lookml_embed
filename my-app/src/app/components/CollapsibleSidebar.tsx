"use client";

import { useState } from "react";

export default function CollapsibleSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <nav>
        <ul>
          <li>
            <span className="menu-icon">
              <i className="material-icons">search</i>
            </span>
            <span className="menu-text">Search</span>
          </li>
          <li>
            <span className="menu-icon">
              <i className="material-icons">dashboard</i>
            </span>
            <span className="menu-text">Dashboard</span>
          </li>
          <li>
            <span className="menu-icon">
              <i className="material-icons">analytics</i>
            </span>
            <span className="menu-text">Analytics</span>
          </li>
          <li>
            <span className="menu-icon">
              <i className="material-icons">settings</i>
            </span>
            <span className="menu-text">Settings</span>
          </li>
          <li style={{ flexGrow: 1 }}></li>
          <li
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ cursor: "pointer" }}
          >
            <span className="menu-icon">
              <i className="material-icons">
                {isCollapsed ? "chevron_right" : "chevron_left"}
              </i>
            </span>
            <span className="menu-text">{isCollapsed ? "" : "Collapse"}</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
