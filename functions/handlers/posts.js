const admin = require("firebase-admin");
const db = admin.firestore();

// fetch all the posts from the database
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
  // adding the newPost object to the database
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

// fetch a single post from the database
exports.getOnePost = (req, res) => {
  let postDetails = {};
  // get a specific post details
  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ error: "Post not found" });
      }
      postDetails = doc.data();
      postDetails.postId = doc.id;

      // get the comment details of the specific post
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then((data) => {
      postDetails.comments = [];
      data.forEach((doc) => {
        // push comments into an array
        postDetails.comments.push(doc.data());
      });
      return res.json(postDetails);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
