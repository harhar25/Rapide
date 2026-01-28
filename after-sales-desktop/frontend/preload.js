const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Printer management APIs
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  print: (options) => ipcRenderer.invoke('print-document', options),
  
  // Printer discovery APIs
  discoverUSBPrinters: () => ipcRenderer.invoke('discover-usb-printers'),
  discoverNetworkPrinters: () => ipcRenderer.invoke('discover-network-printers'),
  discoverAirPrintPrinters: () => ipcRenderer.invoke('discover-airprint-printers'),
  getPrinterStatus: (printerName) => ipcRenderer.invoke('get-printer-status', printerName),
  
  // Other APIs can be added here
});
