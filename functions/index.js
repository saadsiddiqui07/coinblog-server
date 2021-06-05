// IMPORTS
const functions = require("firebase-functions");
const app = require("express")();
const { admin } = require("./utils/admin");
const cors = require("cors");
app.use(cors());

const {
  getAllPosts,
  createPost,
  getOnePost,
  commentOnPost,
  likePost,
  unlikePost,
} = require("../functions/handlers/posts");
const {
  signup,
  login,
  imageUpload,
  addUserDetails,
  getAuthenticatedUser,
} = require("../functions/handlers/users");

// MIDDLEWARES
const FirebaseAuth = require("./utils/fbAuth");

// API ROUTING

// POST ROUTES
// api to create a new post
app.post("/createPost", FirebaseAuth, createPost);
// api to fetch all posts
app.get("/getPosts", getAllPosts);
// api to get one post
app.get("/post/:postId", getOnePost);
// api to comment on a post
app.post("/post/:postId/comment", FirebaseAuth, commentOnPost);
// like a single post
app.get("/post/:postId/like", FirebaseAuth, likePost);
// unlike a post
app.get("/post/:postId/unlike,", FirebaseAuth, unlikePost);

// USER ROUTES
// create a new user
app.post("/signup", signup);
// api to sign in as a user
app.post("/login", login);
// api to upload an image
app.post("/user/image", FirebaseAuth, imageUpload);
// api to add user details on their profile
app.post("/user", FirebaseAuth, addUserDetails);
// api to get user's personal details
app.get("/user", FirebaseAuth, getAuthenticatedUser);

exports.api = functions.region("asia-south1").https.onRequest(app);
