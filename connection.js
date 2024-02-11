const mongoose = require("mongoose");
//MongoDB connection file 
async function connectMongoDb(url) {
  mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error: "));
  db.once("open", function () {
    console.log("Connected successfully");
  });
}

module.exports = {
  connectMongoDb,
};
