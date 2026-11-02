import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Key,
  LogOut,
  User,
  ChevronRight,
  ChevronLeft,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

/**
 * Modern Sidebar Component
 *
 * Features:
 * - Premium Glassmorphism Design
 * - Collapsible (Rail/Drawer)
 * - Interactive Active States
 * - Smooth Animations
 * - Integrated Theme Toggle
 */

const NavItem = ({
  icon,
  label,
  to = '#',
  active = false,
  hasDropdown = false,
  dropdownItems = [],
  items = [],
  onClick,
  collapsed = false,
  onMobileClose
}) => {
  const actualDropdownItems = dropdownItems.length > 0 ? dropdownItems : items;
  const actuallyHasDropdown = hasDropdown || actualDropdownItems.length > 0;
  
  const [showDropdown, setShowDropdown] = useState(active);

  // Auto-expand if the route becomes active
  React.useEffect(() => {
    if (active) {
      setShowDropdown(true);
    }
  }, [active]);

  // If collapsed, we don't show dropdown inline, but maybe tooltip (omitted for brevity, just icon)
  // For strictly collapsed view, we might disable dropdown or show it as hover menu.
  // For now, if collapsed, we disable dropdown expansion logic in UI or expand sidebar on click.

  const content = (
    <>
      <div className={`flex items-center gap-3 flex-1 ${collapsed ? 'justify-center' : ''}`}>
        <span className={`transition-all duration-200 ${active ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`}>
          {/* Make icon slightly bolder when active */}
          {React.cloneElement(icon, { strokeWidth: active ? 2.5 : 2 })}
        </span>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className={`transition-all duration-200 whitespace-nowrap ${active ? 'text-[var(--color-primary)] font-semibold tracking-wide scale-[1.02]' : 'font-medium text-[var(--text-body)]'} group-hover:text-[var(--text-main)]`}
          >
            {label}
          </motion.span>
        )}
      </div>
      {!collapsed && actuallyHasDropdown && (
        <motion.div
          animate={{ rotate: showDropdown ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className={`transition-colors ${active ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}`} />
        </motion.div>
      )}
    </>
  );

  const handleClick = (e) => {
    if (collapsed && actuallyHasDropdown) {
      // Handle collapse click
    }

    if (actuallyHasDropdown && !collapsed) {
      e.preventDefault();
      setShowDropdown(!showDropdown);
    } else if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const buttonClasses = `w-full flex items-center ${collapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} rounded-xl transition-all duration-200 relative group overflow-hidden ${active ? '' : 'hover:bg-[var(--surface-muted)]'}`;

  return (
    <div className="mb-1">
      {actuallyHasDropdown || onClick ? (
        <button
          className={buttonClasses}
          onClick={handleClick}
          title={collapsed ? label : ''}
        >
          {active && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 rounded-xl bg-[var(--color-primary-light)]"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}

          {/* Side Accent for Active */}
          {active && !collapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded-r-full bg-[var(--color-primary)]"></div>
          )}

          <div className="relative z-10 flex items-center w-full">
            {content}
          </div>
        </button>
      ) : (
        <Link
          to={to}
          className={buttonClasses}
          title={collapsed ? label : ''}
        >
          {active && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 rounded-xl bg-[var(--color-primary-light)]"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          {active && !collapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/5 rounded-r-full bg-[var(--color-primary)]"></div>
          )}
          <div className="relative z-10 flex items-center w-full">
            {content}
          </div>
        </Link>
      )}

      {/* Dropdown Menu - Only show if not collapsed */}
      <AnimatePresence>
        {actuallyHasDropdown && showDropdown && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-2 py-1 space-y-1 mt-1">
              <div className="pl-4 border-l border-[var(--color-border)] space-y-1">
                {actualDropdownItems.map((item, index) => (
                  <Link
                    key={index}
                    to={item.to}
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      if (onMobileClose) onMobileClose();
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-[var(--text-body)] hover:text-[var(--text-main)] hover:bg-[var(--surface-muted)] relative z-50 cursor-pointer block w-full"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border-strong)] group-hover:bg-[var(--color-primary)] transition-colors inline-block mr-2"></div>
                    <span className="relative z-10">{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">{item.badge}</span>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ModernSidebar = ({
  navItems = [],
  userName = "John Doe",
  userRole = "Admin",
  userAvatar = null,
  userImage = null,
  profileLink = "/profile",
  changePasswordLink = "/change-password",
  onLogout,
  isMobileOpen = false,
  onMobileClose
}) => {
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const sidebarClasses = `
    h-screen flex flex-col bg-[var(--surface)]
    fixed lg:static top-0 left-0 z-40 transition-all duration-300 ease-in-out border-r border-[var(--color-border)]
    ${collapsed ? 'w-20' : 'w-72'}
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside className={sidebarClasses}>
        {/* Logo Section */}
        <div
          className={`flex items-center gap-3 ${collapsed ? 'justify-center p-4' : 'p-8'} relative border-b border-[var(--color-border)]`}
        >
          <div className="relative shrink-0">
            <div
              className={`relative rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #FF6B2B 100%)',
                color: 'white'
              }}
            >
              L
            </div>
          </div>

          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col whitespace-nowrap overflow-hidden"
            >
              <span className="text-lg font-bold tracking-tight text-[var(--text-main)]">Link Management</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-subtle)]">Workspace</span>
            </motion.div>
          )}

          {/* Collapse Toggle Button (Desktop Only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--surface)] border border-[var(--color-border-strong)] rounded-full items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all z-50 shadow-sm"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-20 custom-scrollbar overflow-x-hidden">
          <nav className="space-y-1">
            {navItems.map((item, index) => (
              <NavItem
                key={index}
                icon={item.icon}
                label={item.label}
                to={item.to}
                active={item.active}
                hasDropdown={item.hasDropdown}
                dropdownItems={item.dropdownItems}
                items={item.items}
                collapsed={collapsed}
                onMobileClose={onMobileClose}
                onClick={collapsed && (item.hasDropdown || (item.items && item.items.length > 0)) ? () => setCollapsed(false) : undefined} 
              />
            ))}
          </nav>
        </div>

        {/* Profile Section at Bottom */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-muted)] transition-all duration-200 border border-transparent hover:border-[var(--color-border)] ${collapsed ? 'justify-center' : ''}`}
            >
              {/* Avatar */}
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--surface-muted)] shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary-light) 0%, #FFF 100%)',
                    color: 'var(--color-primary-deep)',
                    border: '1px solid var(--color-primary)'
                  }}
                >
                  {userAvatar || userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              )}

              {/* User Info */}
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 text-left overflow-hidden"
                >
                  <div className="text-sm font-semibold truncate text-[var(--text-main)]">
                    {userName}
                  </div>
                  <div className="text-xs font-medium truncate text-[var(--text-muted)]">
                    {userRole}
                  </div>
                </motion.div>
              )}

              {/* Dropdown Arrow */}
              {!collapsed && (
                <motion.div
                  animate={{ rotate: showProfileMenu ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} className="text-[var(--text-muted)]" />
                </motion.div>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`absolute bottom-full left-0 mb-3 bg-[var(--surface)] border border-[var(--color-border)] shadow-card p-2 rounded-xl z-50 overflow-hidden ${collapsed ? 'w-56 left-full ml-2' : 'left-0 right-0'}`}
                >
                  <Link
                    to={profileLink}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-muted)] transition-all duration-200 text-[var(--text-body)] hover:text-[var(--text-main)]"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <User size={16} />
                    <span className="text-sm font-medium">Profile</span>
                  </Link>

                  <Link
                    to={changePasswordLink}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-muted)] transition-all duration-200 text-[var(--text-body)] hover:text-[var(--text-main)]"
                    onClick={() => setShowProfileMenu(false)}
                  >
                    <Key size={16} />
                    <span className="text-sm font-medium">Change Password</span>
                  </Link>

                  <div className="my-1.5 h-px bg-[var(--color-border)]" />

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white"
                  >
                    <LogOut size={16} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>
    </>
  );
};
