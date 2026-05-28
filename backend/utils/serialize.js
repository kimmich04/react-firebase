// backend/utils/serialize.js
function toPlain(v) {
  if (!v) return v;

  // Firestore Timestamp -> ISO string
  if (typeof v.toDate === "function") {
    return v.toDate().toISOString();
  }

  if (Array.isArray(v)) return v.map(toPlain);

  if (typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = toPlain(val);
    return out;
  }

  return v;
}

function serializeDoc(id, data) {
  return { id, ...toPlain(data) };
}

module.exports = { serializeDoc };