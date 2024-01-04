const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require("mongoose");
const userModel = require("./models");

const app = express();
const port = 8000;

app.use(cors());

mongoose.connect('mongodb+srv://vaani:vaani@cluster0.7uf5zvr.mongodb.net/Lineup?retryWrites=true&w=majority',
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
    console.log("Connected successfully");
});

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// basic get request 
app.get('/', async (req, res) => {
    const user = await userModel.find({});
    res.send(user);
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
