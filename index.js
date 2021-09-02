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
const amtToUpdate = 10;
const amtToStart = 10;

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
      .limit(amtToStart)
      .toArray();
    return data;
  } catch (e) {
    console.log(e);
  }
}

async function readAdditionalData(lastID, amtToRead) {
  try {
    const data = await client
      .db("TwonkerDB")
      .collection("TestPosts")
      .find({
        time: {
          $lt: lastID,
        },
      })
      .sort({ time: -1 })
      .limit(amtToRead)
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

    //TODO: Replace "TwonkerDB" and "TestPosts" strings with config strings.
    //TODO: Replace limit numbers with a configuration number.

    //TODO: Prevent spam by putting user in list with last time sent.
    //TODO: Combine updateData and initData into one event, modify logic in web client.
    readInitialData().then((data) => {
      socket.emit("initData", data);
    });

    //TODO: Send an additional flag that tells the client to stop loading when all the content scrolled is gone.
    socket.on("clientListEnd", (lastID) => {
      console.log("Updating list: " + lastID);
      readAdditionalData(lastID, amtToUpdate).then((data) => {
        console.log(data);
        socket.emit("updateData", data);
      });
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
