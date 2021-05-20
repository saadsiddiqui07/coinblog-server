// IMPORTS
const functions = require("firebase-functions");
const validator = require("email-validator");
const admin = require("firebase-admin");
admin.initializeApp();
const app = require("express")();
const db = admin.firestore();

// MIDDLEWARES

// DATABASE CONFIG
const firebase = require("firebase");
const firebaseConfig = {
  apiKey: "AIzaSyDHba21ZHOstQWoInzov7CQgY6C-dG6f5w",
  authDomain: "coinblog-7.firebaseapp.com",
  projectId: "coinblog-7",
  storageBucket: "coinblog-7.appspot.com",
  messagingSenderId: "567746797423",
  appId: "1:567746797423:web:76aa953283370333e1929a",
  measurementId: "G-W0MK16BS73",
};
firebase.initializeApp(firebaseConfig);

// API ROUTING

// api to fetch all posts
app.get("/getPosts", (req, res) => {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          postId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(posts);
    })
    .catch((err) => console.error(err));
});

// api to create a new post
app.post("/createPost", (req, res) => {
  const newPost = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    userHandle: req.body.userHandle,
  };
  // adding the newPost body to the database
  db.collection("posts")
    .add(newPost)
    .then((doc) => {
      res.json({ message: `Document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "Oops! it went wrong " });
      console.error(err);
    });
});

// function to check if the input is empty or not
const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

// create a new user
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  let errors = {};

  const isEmailValid = validator.validate(newUser.email);
  // checking validation of the credentials
  if (isEmpty(newUser.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmailValid) {
    errors.email = "Must be a valid address";
  }

  if (isEmpty(newUser.password)) errors.password = "Password must not be empty";
  if (isEmpty(newUser.handle)) errors.handle = "must not be empty";
  // password validation
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "password does not match";

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  let token, userId;
  // adding user to the database
  db.doc(`users/${newUser.handle}`)
    .get()
    .then((doc) => {
      // if user exists then throw an error
      if (doc.exists) {
        return res.status(400).json({ handle: "Handle already taken" });
      } else {
        // otherwise create a user
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    // getting the id token of the user
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    // getting token in json format
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        email: newUser.email,
        handle: newUser.handle,
        createdAt: new Date().toISOString(),
        userId,
      };
      db.doc(`users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already taken" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

// api to sign in as a user
app.post("/signin", (req, res) => {
  const userDetails = {
    email: req.body.email,
    password: req.body.password,
  };

  let errors = {};

  const isEmailValid = validator.validate(userDetails.email);

  // checking validation of the email
  if (isEmpty(userDetails.email)) {
    errors.email = "Email must not be empty";
  } else if (!isEmailValid) {
    errors.email = "Email must be valid";
  }

  // checking validation of the password
  if (isEmpty(userDetails.password))
    errors.password = "Password must not be empty";

  // if there are errors then return the errors
  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  // if the credentials are valid then sign in
  firebase
    .auth()
    .signInWithEmailAndPassword(userDetails.email, userDetails.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        return res.status(400).json({ email: " Email is wrong" });
      } else if (err.code === "auth/wrong-password") {
        return res.status(400).json({ password: " Password is wrong" });
      }
      return res.status(500).json({ error: err.code });
    });
});

exports.api = functions.region("asia-south1").https.onRequest(app);
