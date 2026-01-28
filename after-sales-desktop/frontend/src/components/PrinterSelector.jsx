import React, { useState, useEffect } from 'react';
import { getPrinters, getDefaultPrinter } from '../services/printService';

const PrinterSelector = ({ isOpen, onClose, onPrint, isLoading = false }) => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPrinters();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
      
      // Set default printer
      if (availablePrinters.length > 0) {
        const defaultPrinter = availablePrinters.find(p => p.isDefault);
        setSelectedPrinter(defaultPrinter || availablePrinters[0]);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    if (selectedPrinter && onPrint) {
      onPrint(selectedPrinter);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="printer-selector-overlay">
      <div className="printer-selector-modal">
        <div className="printer-modal-header">
          <h3>Select Printer</h3>
          <button className="close-btn" onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        <div className="printer-modal-content">
          {loading ? (
            <div className="loading-printers">
              <div className="spinner"></div>
              <p>Loading available printers...</p>
            </div>
          ) : printers.length > 0 ? (
            <div className="printers-list">
              {printers.map((printer) => (
                <label key={printer.name} className="printer-option">
                  <input
                    type="radio"
                    name="printer"
                    value={printer.name}
                    checked={selectedPrinter?.name === printer.name}
                    onChange={() => setSelectedPrinter(printer)}
                    disabled={isLoading}
                  />
                  <div className="printer-info">
                    <span className="printer-name">{printer.name}</span>
                    {printer.isDefault && <span className="printer-default">Default</span>}
                    {printer.description && (
                      <span className="printer-description">{printer.description}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="no-printers">
              <p>⚠️ No printers found. Please ensure a printer is connected and installed.</p>
            </div>
          )}
        </div>

        <div className="printer-modal-footer">
          <button 
            className="btn-cancel" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="btn-print" 
            onClick={handlePrint}
            disabled={!selectedPrinter || isLoading}
          >
            {isLoading ? 'Printing...' : 'Print'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSelector;
