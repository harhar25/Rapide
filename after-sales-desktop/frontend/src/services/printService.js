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

const printJobOrder = async (htmlContent, printerName = null, options = {}) => {
  try {
    if (window.electronAPI && window.electronAPI.print) {
      const result = await window.electronAPI.print({
        html: htmlContent,
        printerName: printerName,
        options: {
          silent: false,
          printBackground: true,
          ...options
        }
      });
      return result;
    } else {
      // Fallback to standard window.print()
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      return { success: true, message: 'Print sent to default printer' };
    }
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
