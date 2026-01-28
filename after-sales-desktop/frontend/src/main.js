const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const isDev = process.argv.includes('--dev');

app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');

let mainWindow;

// Create window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.setBackgroundThrottling(false);

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== Printer IPC Handlers ====================

// Get list of available printers
ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrinters();
      return printers.map(printer => ({
        name: printer.name,
        description: printer.description || '',
        isDefault: printer.isDefault || false,
        status: printer.status || 0
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
});

// Print document to specified printer
ipcMain.handle('print-document', async (event, options) => {
  try {
    const { html, printerName, printOptions = {} } = options;
    
    if (!mainWindow) {
      throw new Error('Main window not available');
    }

    // Create a new invisible window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load HTML content
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Configure print settings
    const printSettings = {
      silent: true,
      printBackground: true,
      color: true,
      margin: {
        marginType: 0,
        top: 0.5,
        bottom: 0.5,
        left: 0.5,
        right: 0.5
      },
      landscape: false,
      paperSize: {
        width: 210000,
        height: 297000
      },
      scaleFactor: 100,
      ...printOptions
    };

    // Add printer name if specified
    if (printerName) {
      printSettings.deviceName = printerName;
    }

    // Send to print
    await printWindow.webContents.print(printSettings, (success, failureReason) => {
      printWindow.destroy();
      
      if (success) {
        console.log('Print sent successfully');
      } else {
        console.error('Failed to print:', failureReason);
      }
    });

    return { success: true, message: 'Document sent to printer' };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, message: error.message };
  }
});

// Discover USB printers
ipcMain.handle('discover-usb-printers', async () => {
  try {
    // USB printers are typically detected by system printer list
    // This returns printers connected via USB ports
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrinters();
      return printers
        .filter(p => {
          const desc = (p.description || '').toLowerCase();
          return desc.includes('usb') || desc.includes('lpt') || desc.includes('com');
        })
        .map(p => ({
          name: p.name,
          type: 'usb',
          port: p.description || 'USB Port',
          isDefault: p.isDefault || false
        }));
    }
    return [];
  } catch (error) {
    console.error('Error discovering USB printers:', error);
    return [];
  }
});

// Discover Network Printers (AirPrint, Windows Sharing, etc.)
ipcMain.handle('discover-network-printers', async () => {
  try {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    const networkPrinters = [];
    
    // Get all network adapters
    for (const [interfaceName, addresses] of Object.entries(networkInterfaces)) {
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          // Extract network prefix (for 192.168.1.x network)
          const ipParts = addr.address.split('.');
          const networkPrefix = ipParts.slice(0, 3).join('.');
          
          // Add known network printer IP ranges
          networkPrinters.push({
            interface: interfaceName,
            network: networkPrefix,
            localhost: addr.address,
            type: 'network',
            protocol: 'TCP/IP (IPP/LPD)'
          });
        }
      }
    }
    
    return networkPrinters;
  } catch (error) {
    console.error('Error discovering network printers:', error);
    return [];
  }
});

// Discover AirPrint compatible printers
ipcMain.handle('discover-airprint-printers', async () => {
  try {
    // AirPrint discovery would require mdns library (optional dependency)
    // For now, return system printers that might support AirPrint
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrinters();
      return printers
        .map(p => ({
          name: p.name,
          type: 'airprint',
          protocol: 'mDNS/AirPrint',
          port: 631,
          isDefault: p.isDefault || false,
          description: p.description || ''
        }));
    }
    return [];
  } catch (error) {
    console.error('Error discovering AirPrint printers:', error);
    return [];
  }
});

// Get printer status
ipcMain.handle('get-printer-status', async (event, printerName) => {
  try {
    if (mainWindow) {
      const printers = await mainWindow.webContents.getPrinters();
      const printer = printers.find(p => p.name === printerName);
      
      if (printer) {
        return {
          name: printer.name,
          status: 'ready',
          online: true,
          isDefault: printer.isDefault || false,
          description: printer.description || '',
          status_code: printer.status || 0
        };
      }
    }
    
    return {
      name: printerName,
      status: 'offline',
      online: false,
      error: 'Printer not found'
    };
  } catch (error) {
    console.error(`Error getting printer status for ${printerName}:`, error);
    return {
      status: 'error',
      online: false,
      error: error.message
    };
  }
});

// App event listeners
app.whenReady().then(() => {
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = details.responseHeaders || {};
      responseHeaders['Content-Security-Policy'] = [
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https: http://localhost:5000 http://127.0.0.1:5000;"
      ];
      callback({ responseHeaders });
    });
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Menu
const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => app.quit()
      }
    ]
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'About'
      }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));

