const express = require('express');
const router = express.Router();
const { Client } = require('ssh2');
const { getContainer } = require('../models/database');

router.get('/logs', async (req, res) => {
  const { host } = req.query;
  
  try {
    const container = await getContainer(host);
    if (!container) {
      return res.status(404).send('Host not found');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const conn = new Client();
    
    // Handle SSH connection error
    conn.on('error', (err) => {
      console.error('SSH Connection Error:', err);
      res.write(`data: SSH connection error: ${err.message}\n\n`);
      conn.end();
    });

    // Handle SSH connection close
    conn.on('close', () => {
      console.log('SSH Connection closed');
      res.write('data: SSH connection closed\n\n');
      res.end();
    });

    conn.on('ready', () => {
      console.log('SSH Client Ready');
      res.write('data: SSH connection successful\n\n');

      // Set a larger maximum buffer
      const maxBuffer = 1024 * 1024 * 10; // 10MB
      const options = {
        MaxBuffer: maxBuffer,
        env: { TERM: 'xterm' }
      };

      // Execute docker logs command, add --timestamps to ensure timestamps
      const command = `docker logs -f --tail 100 --timestamps ${container.container_name}`;
      
      conn.exec(command, options, (err, stream) => {
        if (err) {
          console.error('Exec Error:', err);
          res.write(`data: Execution command error: ${err.message}\n\n`);
          conn.end();
          return;
        }

        let buffer = '';

        // Handle standard output
        stream.on('data', (data) => {
          buffer += data.toString();
          const lines = buffer.split('\n');
          
          // Keep the last line (possibly incomplete)
          buffer = lines.pop();
          
          // Send complete lines
          lines.forEach(line => {
            if (line.trim()) {
              res.write(`data: ${line.trim()}\n\n`);
            }
          });
        });

        // Handle standard error
        stream.stderr.on('data', (data) => {
          const errorMsg = data.toString().trim();
          if (errorMsg) {
            res.write(`data: ERROR: ${errorMsg}\n\n`);
          }
        });

        // Send remaining buffer when stream ends
        stream.on('end', () => {
          if (buffer.trim()) {
            res.write(`data: ${buffer.trim()}\n\n`);
          }
          buffer = '';
        });

        // Handle stream close
        stream.on('close', (code, signal) => {
          conn.end();
        });

        // Handle stream error
        stream.on('error', (err) => {
          console.error('Stream error:', err);
          conn.end();
        });
      });
    });

    // Handle client disconnection
    req.on('close', () => {
      console.log('Client disconnected');
      conn.end();
    });

    // Start the connection
    conn.connect({
      host: container.host,
      port: 22,
      username: container.username, // Use the container's configured username
      privateKey: container.ssh_key
    });
  } catch (error) {
    res.status(500).send('Error establishing connection');
  }
});

module.exports = router;