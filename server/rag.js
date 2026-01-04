const data = require("./data");

function retrieve(query) {
  return data.filter(d =>
    d.toLowerCase().includes(query.toLowerCase())
  );
}

module.exports = retrieve;
