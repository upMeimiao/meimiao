function all() {
  fetch('http://spider-monitor.meimiaoip.com/api/statusMonitor').then(response => response.json())
    .then(data => postMessage(data))
    .catch(e => postMessage(e));
}
all();
setInterval(() => {
  all();
}, 900000);