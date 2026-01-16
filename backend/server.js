require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');

// Port definition with environment fallback
const PORT = process.env.PORT || 5000;

// Ngrok setup (Optional)
let ngrok;
try { ngrok = require('ngrok'); } catch (_) { ngrok = null; }

/* ===============================
   GLOBAL ERROR HANDLERS (PROCESS)
================================ */
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
    console.error(err.stack);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
    // Optionally shutdown, or just log
    // gracefulShutdown('unhandledRejection');
});

/* ===============================
   DATABASE CONNECTION
================================ */
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';
const connectOptions = {
    maxPoolSize: 10,
    minPoolSize: 5,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    family: 4
};

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGO_URI, connectOptions);
        console.log('✅ MongoDB connected');
    } catch (err) {
        console.error('❌ MongoDB initial connection failed:', err.message);
        // Fallback logic for SRV/DNS issues
        if (err && (err.syscall === 'querySrv' || err.code === 'ENOTFOUND')) {
            console.warn('⚠️ DNS SRV lookup failed. Checking fallback...');
            const fallback = process.env.MONGO_FALLBACK_URI || 'mongodb://localhost:27017/hrms';
            if (fallback && fallback !== MONGO_URI) {
                console.log(`🔄 Attempting fallback: ${fallback}`);
                await mongoose.connect(fallback, connectOptions);
                console.log('✅ MongoDB connected (Fallback)');
                return;
            }
        }
        // If we can't connect, exit.
        process.exit(1);
    }
}

/* ===============================
   SERVER LIFECYCLE MANAGEMENT
================================ */
const server = http.createServer(app);
let isShuttingDown = false;

async function startServer() {
    await connectToDatabase();

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ FATAL ERROR: Port ${PORT} is already in use.`);
            console.error(`Attempting one last kill-port if possible...`);
            // We can't actually kill it easily from here without child_process, 
            // but the package.json script should have handled it.
            process.exit(1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(PORT, async () => {
        console.log(`🚀 Server running on port ${PORT}`);

        // Ngrok (Dev only)
        const useNgrok = String(process.env.USE_NGROK || '').toLowerCase() === 'true' && process.env.NODE_ENV !== 'production';
        if (useNgrok && ngrok) {
            try {
                if (process.env.NGROK_AUTHTOKEN) await ngrok.authtoken(process.env.NGROK_AUTHTOKEN);
                const url = await ngrok.connect({ addr: PORT });
                console.log('🌍 NGROK URL:', url);
            } catch (e) {
                console.warn('ngrok failed:', e.message);
            }
        }
    });
}

/**
 * Graceful Shutdown Logic
 */
function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    // Force forceful shutdown after timeout
    const forceExitTimeout = setTimeout(() => {
        console.error('⚠️ Could not close connections in time, forcefully shutting down.');
        process.exit(1);
    }, 5000); // 5 seconds max
    forceExitTimeout.unref();

    // 1. Close HTTP Server
    if (server.listening) {
        server.close((err) => {
            if (err) {
                console.error('❌ Error closing HTTP server:', err);
                process.exit(1);
            }
            console.log('✅ HTTP server closed.');

            // 2. Close Database Connection
            mongoose.disconnect().then(() => {
                console.log('✅ MongoDB connection closed.');
                console.log('👋 Goodbye!');
                process.exit(0);
            }).catch(e => {
                console.error('❌ Error closing MongoDB:', e);
                process.exit(1);
            });
        });
    } else {
        console.log('ℹ️ Server was not listening. Exiting.');
        mongoose.disconnect().then(() => process.exit(0));
    }
}

// Signal Listeners
// SIGINT: Ctrl+C
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// SIGTERM: Docker/Kubernetes stop
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// SIGUSR2: Nodemon restart
process.once('SIGUSR2', function () {
    gracefulShutdown('SIGUSR2');
});

// Windows specific workaround for Nodemon signals?
// Not needed if we use SIGUSR2 correctly with nodemon, but handled above.

// Start
if (require.main === module) {
    startServer();
}

module.exports = server; // Export for testing
