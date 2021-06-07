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
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
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
    likeCount: 0,
    commentCount: 0,
  };
  // adding the newPost object to the database
  db.collection("posts")
    .add(newPost)
    .then((doc) => {
      const resPost = newPost;
      resPost.postId = doc.id;
      res.json(resPost);
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

// api to comment on a post
exports.commentOnPost = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ comment: "Must not be empty" });
  }
  // new comment body
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
  console.log(newComment);

  // get a specific post using postId
  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(400).json({ error: "Post not found" });
      }
      // increment the commentCount
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      // add a new comment object in the firestore
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};

exports.likePost = (req, res) => {
  // check a like document
  const likeDocument = db
    .collection("likes")
    .where("postId", "==", req.params.postId)
    .where("userHandle", "==", req.user.handle)
    .limit(1);

  // get a specific post document
  const postDocument = db.doc(`/posts/${req.params.postId}`);

  let postData;

  // get the details of the specific post
  postDocument
    .get()
    .then((doc) => {
      // if the post is uploaded then return the like document details
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "post not found" });
      }
    })
    .then((data) => {
      // if post is not liked then add a like document
      if (data.empty) {
        return (
          db
            .collection("likes")
            .add({
              postId: req.params.postId,
              userHandle: req.user.handle,
            })
            // increment the likeCount in the collection
            .then(() => {
              postData.likeCount++;
              return postDocument.update({ likeCount: postData.likeCount });
            })
            // return the post data of the liked post
            .then(() => {
              return res.json(postData);
            })
        );
      } else {
        return res.status(400).json({ error: "post already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("postId", "==", req.params.postId)
    .where("userHandle", "==", req.user.handle)
    .limit(1);

  // get a specific post document
  const postDocument = db.doc(`/posts/${req.params.postId}`);

  let postData;

  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "post not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Post not liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            postData.likeCount--;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            return res.json(postData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
