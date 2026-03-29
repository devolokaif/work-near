// ============================================================
// WorkNear Backend — Main Server (src/index.js)
// Clustered Node.js for multi-core utilization
// ============================================================

const cluster = require('cluster');
const os = require('os');

const WORKERS = process.env.NODE_ENV === 'production' ? os.cpus().length : 1;

if (cluster.isMaster && process.env.NODE_ENV === 'production') {
  console.log(`Master process ${process.pid} starting ${WORKERS} workers`);
  for (let i = 0; i < WORKERS; i++) cluster.fork();
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  require('./app');
}