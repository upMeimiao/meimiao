fetch('http://spider-monitor.meimiaoip.com/api/statusMonitor').then(response => response.json())
    .then(data => postMessage(data.infos))
    .catch(e => console.log("Oops, error", e))