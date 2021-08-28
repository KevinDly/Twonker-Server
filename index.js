const config = require("config");
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", //check if "*" is correct?
    credentials: true,
  },
});

const { MongoClient } = require("mongodb");
const username = config.get("mongodb.username");
const password = config.get("mongodb.password");
const clusterUrl = config.get("mongodb.clusterUrl");

const uri = `mongodb+srv://${username}:${password}@${clusterUrl}.gsxtp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
//const uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?authMechanism=${authMechanism}`;

const client = new MongoClient(uri);
const testData = ["Hello", "how are you man?", "im good!"];
//const client = new MongoClient(uri);
//Connect to database then connect sockets.
connectMongo()
  .catch(console.error)
  .then(() => {
    connectSockets();
  });

//connectSockets();
//Connect to client
async function connectMongo() {
  try {
    await client.connect();
  } catch (e) {
    console.log(e);
  }
}

async function readInitialData() {
  try {
    const data = await client
      .db("TwonkerDB")
      .collection("TestPosts")
      .find({})
      .sort({ time: -1 })
      .limit(5)
      .toArray();
    return data;
  } catch (e) {
    console.log(e);
  }
}

//Connect sockets.
function connectSockets() {
  io.on("connection", (socket) => {
    //Replace this with correct emit event for initial data transfer.

    //TODO: Grab mongodb data from database and then emit it via initData event.

    //TODO: Replace "TwonkerDB" and "TestPosts" strings with config strings.
    //TODO: Replace limit numbers with a configuration number.

    //1. Create cursor for each connection to database? https://docs.mongodb.com/manual/reference/method/cursor.forEach/
    //2. Grab appropriate list of data.
    //3. Use .then to put data into a new function.
    //3a. In that function emit the data that was given from the previous function.

    //TODO: On send update both all listeners AND mongodb with the post that is recieved.
    //TODO: Prevent spam by putting user in list with last time sent.
    readInitialData().then((data) => {
      socket.emit("initData", data);
    });

    socket.on("recievedPost", (post) => {
      console.log("Recieved data: " + post);
      const currTime = Date.now();
      console.log("Post recieved at " + currTime);

      //TODO: Add "newPost" emit event to web app
      //Emits post with time to all.
      var newPost = {
        content: post,
        time: currTime,
      };

      //TODO: Replace with prod and env config
      client.db("TwonkerDB").collection("TestPosts").insertOne(newPost);

      io.emit("newPost", newPost);

      //socket.emit("initData", testData);
    });

    //If data isnt available for some reason emit a connection error instead
  });

  //Change this to a config later on?
  server.listen(2999, () => {
    console.log("listening on *:2999");
  });
  //On client emitting post event, sent post out to all connected clients to update, and simultaneously update the Mongo.db database.
}
