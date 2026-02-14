import { fetchJson } from '../utils/fetchJson';

/**
 * Print Service - Handles printer selection and document printing
 * Uses Electron IPC for printer management
 */

const getPrinters = async () => {
  try {
    if (window.electronAPI && window.electronAPI.getPrinters) {
      const printers = await window.electronAPI.getPrinters();
      return printers;
    } else {
      // Fallback for non-electron environments
      return [{ name: 'Default Printer', isDefault: true }];
    }
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
};

const printJobOrder = async (htmlContent, printerName = null, options = {}, logData = null) => {
  try {
    let result = { success: false };
    if (window.electronAPI && window.electronAPI.print) {
      result = await window.electronAPI.print({
        html: htmlContent,
        printerName: printerName,
        options: {
          silent: false,
          printBackground: true,
          ...options
        }
      });
    } else {
      // Fallback to standard window.print()
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      result = { success: true, message: 'Print sent to default printer' };
    }

    // Log the print action validation
    if (logData && logData.service_order_id) {
       await fetchJson('/api/documents/log-print', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           service_order_id: logData.service_order_id,
           document_type: logData.document_type || 'other',
           printed_by: logData.printed_by || 'Unknown',
           document_data: logData.data || {}
         })
       });
    }

    return result;

  } catch (error) {
    console.error('Error printing:', error);
    throw error;
  }
};

const getDefaultPrinter = async () => {
  try {
    const printers = await getPrinters();
    return printers.find(p => p.isDefault) || printers[0] || null;
  } catch (error) {
    console.error('Error getting default printer:', error);
    return null;
  }
};

export { getPrinters, printJobOrder, getDefaultPrinter };

