/**
 * Printer Detection Service - Enhanced
 * Detects printers on local PC ports, network shares, and air share services
 * Supports: USB, LPT, COM ports, TCP/IP, AirPrint, Network Printers
 */

/**
 * Detects printers on local system
 * @returns {Promise<Array>} Array of detected printers
 */
const detectLocalPrinters = async () => {
  try {
    if (window.electronAPI && window.electronAPI.getPrinters) {
      const printers = await window.electronAPI.getPrinters();
      return printers.map(printer => ({
        ...printer,
        type: 'local',
        port: printer.description || 'USB/LPT',
        detected_at: new Date().toISOString()
      }));
    }
    return [];
  } catch (error) {
    console.error('Error detecting local printers:', error);
    return [];
  }
};

/**
 * Detects network printers and shared printers
 * @returns {Promise<Array>} Array of detected network printers
 */
const detectNetworkPrinters = async () => {
  try {
    const networkPrinters = [];

    // Common network printer IP ranges and ports to scan
    const commonPorts = [9100, 515, 631, 5353]; // LPD, IPP, mDNS
    const commonSubnets = ['192.168.1', '192.168.0', '10.0.0']; // Common local network ranges

    // Check for network printer discovery via Bonjour/mDNS (AirPrint compatible)
    if (window.electronAPI && window.electronAPI.discoverNetworkPrinters) {
      const discovered = await window.electronAPI.discoverNetworkPrinters();
      networkPrinters.push(...discovered.map(p => ({
        ...p,
        type: 'network',
        protocol: 'mDNS/Bonjour',
        detected_at: new Date().toISOString()
      })));
    }

    return networkPrinters;
  } catch (error) {
    console.error('Error detecting network printers:', error);
    return [];
  }
};

/**
 * Detects AirPrint compatible printers
 * @returns {Promise<Array>} Array of AirPrint printers
 */
const detectAirPrintPrinters = async () => {
  try {
    const airPrintPrinters = [];
    if (window.electronAPI && window.electronAPI.discoverAirPrintPrinters) {
      const discovered = await window.electronAPI.discoverAirPrintPrinters();
      airPrintPrinters.push(...discovered.map(p => ({
        ...p,
        type: 'airprint',
        protocol: 'AirPrint (mDNS)',
        port: 631,
        detected_at: new Date().toISOString()
      })));
    }
    return airPrintPrinters;
  } catch (error) {
    console.error('Error detecting AirPrint printers:', error);
    return [];
  }
};

/**
 * Detects USB port printers
 * @returns {Promise<Array>} Array of USB printers
 */
const detectUSBPrinters = async () => {
  try {
    if (window.electronAPI && window.electronAPI.discoverUSBPrinters) {
      const usbPrinters = await window.electronAPI.discoverUSBPrinters();
      return usbPrinters.map(p => ({
        ...p,
        type: 'usb',
        port: `USB:${p.port || 'unknown'}`,
        detected_at: new Date().toISOString()
      }));
    }
    return [];
  } catch (error) {
    console.error('Error detecting USB printers:', error);
    return [];
  }
};

/**
 * Comprehensive printer discovery - scans all available printer types
 * @returns {Promise<Array>} Complete list of all detected printers
 */
const detectAllPrinters = async () => {
  try {
    const [localPrinters, networkPrinters, airPrintPrinters, usbPrinters] = await Promise.all([
      detectLocalPrinters(),
      detectNetworkPrinters(),
      detectAirPrintPrinters(),
      detectUSBPrinters()
    ]);

    // Combine and deduplicate by name
    const allPrinters = [...localPrinters, ...networkPrinters, ...airPrintPrinters, ...usbPrinters];
    const uniquePrinters = [];
    const seenNames = new Set();

    for (const printer of allPrinters) {
      if (!seenNames.has(printer.name)) {
        seenNames.add(printer.name);
        uniquePrinters.push(printer);
      }
    }

    return uniquePrinters.sort((a, b) => {
      // Sort by: default first, then local, then network
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      if (a.type === 'local' && b.type !== 'local') return -1;
      return 0;
    });
  } catch (error) {
    console.error('Error detecting all printers:', error);
    return [];
  }
};

/**
 * Get printer status information
 * @param {string} printerName - Name of the printer
 * @returns {Promise<Object>} Printer status information
 */
const getPrinterStatus = async (printerName) => {
  try {
    if (window.electronAPI && window.electronAPI.getPrinterStatus) {
      return await window.electronAPI.getPrinterStatus(printerName);
    }
    return { status: 'unknown', online: false };
  } catch (error) {
    console.error(`Error getting printer status for ${printerName}:`, error);
    return { status: 'error', online: false, error: error.message };
  }
};

/**
 * Get default printer
 * @returns {Promise<Object|null>} Default printer or null
 */
const getDefaultPrinter = async () => {
  try {
    const printers = await detectAllPrinters();
    const defaultPrinter = printers.find(p => p.isDefault);
    return defaultPrinter || printers[0] || null;
  } catch (error) {
    console.error('Error getting default printer:', error);
    return null;
  }
};

/**
 * Validate printer connection
 * @param {string} printerName - Printer to validate
 * @returns {Promise<boolean>} True if printer is available
 */
const validatePrinterConnection = async (printerName) => {
  try {
    const status = await getPrinterStatus(printerName);
    return status.online !== false && status.status !== 'error';
  } catch (error) {
    console.error(`Error validating printer ${printerName}:`, error);
    return false;
  }
};

export {
  detectLocalPrinters,
  detectNetworkPrinters,
  detectAirPrintPrinters,
  detectUSBPrinters,
  detectAllPrinters,
  getPrinterStatus,
  getDefaultPrinter,
  validatePrinterConnection
};
