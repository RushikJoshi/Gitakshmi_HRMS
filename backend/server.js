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
    // Do NOT exit immediately on transient errors if possible, but safer to exit for restarts
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION:', reason);
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
   EADDRINUSE HANDLING & STARTUP
================================ */
const server = http.createServer(app);

async function startServer() {
    await connectToDatabase();

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ FATAL ERROR: Port ${PORT} is already in use.`);
            console.error(`This likely means a zombie process is holding the port.`);
            console.error(`The agent will attempt to clear it, or you may need to kill it manually.`);
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

function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Closing server...`);
    server.close(() => {
        console.log('Http server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDb connection closed.');
            process.exit(0);
        });
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
