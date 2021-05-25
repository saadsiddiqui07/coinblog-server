// IMPORTS
const functions = require("firebase-functions");
const { admin } = require("./utils/admin");
const app = require("express")();
const db = admin.firestore();

const { getAllPosts, createPost } = require("../functions/handlers/posts");
const { signup, login, imageUpload } = require("../functions/handlers/users");

// MIDDLEWARES
const FirebaseAuth = require("./utils/fbAuth");

// API ROUTING
// api to create a new post
app.post("/createPost", FirebaseAuth, createPost);
// api to fetch all posts
app.get("/getPosts", getAllPosts);
// create a new user
app.post("/signup", signup);
// api to sign in as a user
app.post("/login", login);
// api to upload an image
app.post("/users/image", imageUpload);

exports.api = functions.region("asia-south1").https.onRequest(app);
