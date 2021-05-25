const admin = require("firebase-admin");
const db = admin.firestore();

exports.getAllPosts = (req, res) => {
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
};

exports.createPost = (req, res) => {
  // the body should not be empty of the post
  if (req.body.body.trim() === "") {
    return res.status(400).json({ message: "The body should not be empty" });
  }

  const newPost = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    userHandle: req.user.handle,
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
};
