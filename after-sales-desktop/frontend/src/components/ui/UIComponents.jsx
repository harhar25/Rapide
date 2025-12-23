import React from 'react';

/**
 * BUTTON COMPONENT - Multiple variants for different use cases
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-color-primary-600 text-white hover:bg-color-primary-700 active:bg-color-primary-800 focus-visible:outline-color-primary-500',
    secondary: 'bg-color-secondary-600 text-white hover:bg-color-secondary-700 active:bg-color-secondary-800 focus-visible:outline-color-secondary-500',
    danger: 'bg-color-error-600 text-white hover:bg-color-error-700 active:bg-color-error-800 focus-visible:outline-color-error-500',
    success: 'bg-color-success-600 text-white hover:bg-color-success-700 active:bg-color-success-800 focus-visible:outline-color-success-500',
    warning: 'bg-color-warning-600 text-white hover:bg-color-warning-700 active:bg-color-warning-800 focus-visible:outline-color-warning-500',
    outline: 'border border-color-primary-600 text-color-primary-600 hover:bg-color-primary-50 active:bg-color-primary-100',
    ghost: 'text-color-primary-600 hover:bg-color-primary-50 active:bg-color-primary-100'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-sm',
    md: 'px-4 py-2 text-base rounded-md',
    lg: 'px-6 py-3 text-lg rounded-lg',
    xl: 'px-8 py-4 text-xl rounded-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="animate-spin">⟳</span> : Icon ? <Icon size={20} /> : null}
      {children}
    </button>
  );
};

/**
 * CARD COMPONENT - Container with consistent styling
 */
export const Card = ({ children, className = '', header, footer, ...props }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`} {...props}>
      {header && <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">{header}</div>}
      <div className="p-6">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">{footer}</div>}
    </div>
  );
};

/**
 * INPUT COMPONENT - Text input with label and error handling
 */
export const Input = ({
  label,
  error,
  required = false,
  icon: Icon,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-3 text-gray-400" size={20} />}
        <input
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            Icon ? 'pl-10' : ''
          } ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/**
 * SELECT COMPONENT - Dropdown selection
 */
export const Select = ({
  label,
  options,
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      >
        <option value="">-- Select --</option>
        {options?.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/**
 * TEXTAREA COMPONENT - Multi-line text input
 */
export const Textarea = ({
  label,
  error,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical min-h-24 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/**
 * BADGE COMPONENT - Status indicators
 */
export const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-sky-100 text-sky-800',
    secondary: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

/**
 * ALERT COMPONENT - Notifications and messages
 */
export const Alert = ({ children, variant = 'info', icon: Icon, dismissible = false, onDismiss, className = '' }) => {
  const variants = {
    info: 'bg-blue-50 border border-blue-200 text-blue-800',
    success: 'bg-green-50 border border-green-200 text-green-800',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border border-red-200 text-red-800'
  };

  return (
    <div className={`p-4 rounded-md flex gap-3 ${variants[variant]} ${className}`}>
      {Icon && <Icon size={20} className="flex-shrink-0 mt-0.5" />}
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-lg leading-none hover:opacity-70"
        >
          ×
        </button>
      )}
    </div>
  );
};

/**
 * MODAL COMPONENT - Dialog overlay
 */
export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', className = '' }) => {
  if (!isOpen) return null;

  const sizes = {
    sm: 'w-96',
    md: 'w-[28rem]',
    lg: 'w-2xl',
    xl: 'w-4xl',
    full: 'w-11/12'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl ${sizes[size]} max-h-[90vh] overflow-auto ${className}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6">{children}</div>
        {footer && <div className="flex gap-3 justify-end p-6 border-t bg-gray-50">{footer}</div>}
      </div>
    </div>
  );
};

/**
 * SPINNER COMPONENT - Loading indicator
 */
export const Spinner = ({ size = 'md', color = 'blue' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const colors = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  return (
    <div className={`${sizes[size]} ${colors[color]} animate-spin`}>
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  );
};

/**
 * SKELETON COMPONENT - Loading placeholder
 */
export const Skeleton = ({ width = 'w-full', height = 'h-4', className = '' }) => {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse ${className}`}></div>;
};

/**
 * CHECKBOX COMPONENT
 */
export const Checkbox = ({ label, error, className = '', ...props }) => {
  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus-visible:outline-none ${className}`}
          {...props}
        />
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

/**
 * TOGGLE/SWITCH COMPONENT
 */
export const Switch = ({ label, checked, onChange, className = '' }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        } ${className}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform absolute top-0.5 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};

/**
 * TABS COMPONENT
 */
export const Tabs = ({ tabs, defaultTab = 0, className = '' }) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab);

  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === idx
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};

/**
 * GRID COMPONENT - Responsive grid layout
 */
export const Grid = ({ children, cols = 3, gap = 4, className = '' }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    6: 'md:grid-cols-6'
  };

  const gapClasses = {
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8'
  };

  return (
    <div className={`grid grid-cols-1 ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * STACK COMPONENT - Vertical/horizontal spacing container
 */
export const Stack = ({ children, direction = 'vertical', spacing = 4, className = '' }) => {
  const dirClass = direction === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  const spacingClass = direction === 'vertical' ? `space-y-${spacing}` : `space-x-${spacing}`;

  return (
    <div className={`${dirClass} ${spacingClass} ${className}`}>
      {children}
    </div>
  );
};

/**
 * CONTAINER COMPONENT - Responsive width container
 */
export const Container = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
};
