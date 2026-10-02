// Web Serial API Connection Manager
// Manages serial port selection, connection, and data reception

import { parsePacket } from './telemetryParser.js';

// Connection states
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

export class ConnectionManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readablePipe = null;
    this.writerPipe = null;
    this._disconnecting = false;
    this.buffer = '';
    this.state = ConnectionState.DISCONNECTED;
    this.errorMessage = null;
    this.onPacket = null;
    this.onStateChange = null;
    this.lastDataTime = null;
    this.timeoutWarningShown = false;
  }

  // Check if Web Serial API is supported
  static isSupported() {
    return 'serial' in navigator;
  }

  // Get current connection state
  getState() {
    return {
      status: this.state,
      errorMessage: this.errorMessage
    };
  }

  // Request user to select a serial port
  async requestPort() {
    if (!ConnectionManager.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      return this.port;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No port selected. Please select a serial port to connect.');
      }
      throw error;
    }
  }

  // Connect to the selected serial port
  async connect(onPacket, onStateChange) {
    if (!this.port) {
      throw new Error('No port selected. Call requestPort() first.');
    }

    this.onPacket = onPacket;
    this.onStateChange = onStateChange;

    this._updateState(ConnectionState.CONNECTING);

    try {
      // Set up connection timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
      });

      // Open port with 57600 baud, 8N1 config
      const connectPromise = this.port.open({
        baudRate: 57600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      await Promise.race([connectPromise, timeoutPromise]);

      // Set up text decoder stream
      const decoder = new TextDecoderStream();
      this.readablePipe = this.port.readable.pipeTo(decoder.writable);
      // Keep a no-op catch attached so teardown/unload never produces an
      // unhandled promise rejection.
      this.readablePipe.catch(() => {});
      this.reader = decoder.readable.getReader();
      
      // Set up writer for sending commands
      const encoder = new TextEncoderStream();
      this.writerPipe = encoder.readable.pipeTo(this.port.writable);
      this.writerPipe.catch(() => {});
      this.writer = encoder.writable.getWriter();

      this._updateState(ConnectionState.CONNECTED);
      this.lastDataTime = Date.now();

      // Start reading loop
      this._readLoop();

    } catch (error) {
      this._updateState(ConnectionState.ERROR, this._getErrorMessage(error));
      throw error;
    }
  }

  // Disconnect from the serial port
  // Ordered, guarded teardown: every step is individually wrapped so a
  // failure in one step can never skip port.close() or leave the state
  // stuck on CONNECTED/ERROR.
  async disconnect() {
    if (this._disconnecting) {
      return;
    }
    this._disconnecting = true;

    try {
      // 1. Reader side: cancel, wait for the pipe to settle, release lock.
      try {
        if (this.reader) {
          await this.reader.cancel().catch(() => {});
          if (this.readablePipe) {
            await this.readablePipe.catch(() => {});
          }
          this.reader.releaseLock();
        } else if (this.readablePipe) {
          await this.readablePipe.catch(() => {});
        }
      } catch (error) {
        console.error('Error tearing down reader:', error);
      } finally {
        this.reader = null;
        this.readablePipe = null;
      }

      // 2. Writer side: close, wait for the pipe to settle, release lock.
      try {
        if (this.writer) {
          await this.writer.close().catch(() => {});
          if (this.writerPipe) {
            await this.writerPipe.catch(() => {});
          }
          this.writer.releaseLock();
        } else if (this.writerPipe) {
          await this.writerPipe.catch(() => {});
        }
      } catch (error) {
        console.error('Error tearing down writer:', error);
      } finally {
        this.writer = null;
        this.writerPipe = null;
      }

      // 3. Port last — always attempted, even if stream teardown failed.
      try {
        if (this.port) {
          await this.port.close().catch(() => {});
        }
      } catch (error) {
        console.error('Error closing port:', error);
      } finally {
        this.port = null;
      }

      this.buffer = '';
    } finally {
      this._disconnecting = false;
      this._updateState(ConnectionState.DISCONNECTED);
    }
  }

  // Send data to the serial port
  async send(data) {
    if (!this.writer || this.state !== ConnectionState.CONNECTED) {
      throw new Error('Not connected');
    }
    
    try {
      await this.writer.write(data);
    } catch (error) {
      console.error('Send error:', error);
      throw error;
    }
  }

  // Internal read loop
  async _readLoop() {
    while (this.reader && this.state === ConnectionState.CONNECTED) {
      try {
        const { value, done } = await this.reader.read();
        
        if (done) {
          this._updateState(ConnectionState.DISCONNECTED);
          break;
        }

        this.lastDataTime = Date.now();
        this.timeoutWarningShown = false;

        this.buffer += value;

        // Process complete packets (newline-delimited)
        let newlineIndex;
        while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
          const packet = this.buffer.substring(0, newlineIndex);
          this.buffer = this.buffer.substring(newlineIndex + 1);

          if (packet.trim()) {
            try {
              const parsed = parsePacket(packet);
              if (parsed && this.onPacket) {
                this.onPacket(parsed);
              }
            } catch (error) {
              console.error('Failed to parse packet:', error, 'Packet:', packet);
            }
          }
        }

      } catch (error) {
        if (error.name !== 'AbortError' && !this._disconnecting) {
          console.error('Read error:', error);
          this._updateState(ConnectionState.ERROR, this._getErrorMessage(error));
        }
        break;
      }
    }
  }

  // Update connection state and notify listeners
  _updateState(newState, errorMessage = null) {
    this.state = newState;
    this.errorMessage = errorMessage;
    
    if (this.onStateChange) {
      this.onStateChange({
        status: newState,
        errorMessage: errorMessage
      });
    }
  }

  // Get user-friendly error message
  _getErrorMessage(error) {
    if (error.message.includes('timeout')) {
      return 'Connection timeout. Please check that the device is powered on and paired.';
    }
    if (error.message.includes('Permission denied') || error.name === 'SecurityError') {
      return 'Permission denied. Please allow serial port access.';
    }
    if (error.message.includes('port is already open')) {
      return 'Port is already in use. Please close other applications using this port.';
    }
    if (error.message.includes('failed to open')) {
      return 'Failed to open port. Please check the device connection.';
    }
    return error.message || 'An unknown error occurred.';
  }

  // Check for data timeout (no data for 5 seconds)
  checkDataTimeout() {
    if (this.state === ConnectionState.CONNECTED && this.lastDataTime) {
      const timeSinceLastData = Date.now() - this.lastDataTime;
      if (timeSinceLastData > 5000 && !this.timeoutWarningShown) {
        this.timeoutWarningShown = true;
        return true;
      }
    }
    return false;
  }
}

export default ConnectionManager;