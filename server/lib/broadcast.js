const clients = new Map();
let nextId = 0;

export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, res] of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

// Returns the id to hand back to removeClient. Date.now() collides when two
// clients connect in the same millisecond, which silently drops one of them.
export function addClient(res) {
  const id = ++nextId;
  clients.set(id, res);
  return id;
}

export function removeClient(id) {
  clients.delete(id);
}

export function clientCount() {
  return clients.size;
}
