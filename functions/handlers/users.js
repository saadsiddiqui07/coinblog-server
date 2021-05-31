// USERS HANDLERS
const { db, admin } = require("../utils/admin");
const validator = require("email-validator");
const config = require("../utils/config");
const { uuid } = require("uuidv4");
const { reduceUserDetails } = require("../utils/reduceUseDetails");

const firebase = require("firebase");
firebase.initializeApp(config);

// to check whether the input field is empty or not
const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

exports.signup = (req, res) => {
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

  const noImg = "no-img.jpg";
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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media}`,
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
};

exports.login = (req, res) => {
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
};

// api to upload a new image -->> PROFILE PICTURE
exports.imageUpload = (req, res) => {
  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new Busboy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;

  let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/png" && mimetype !== "image/jpeg") {
      return res.status(400).json({ error: "please enter an image file" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    // get a random number for image --> 12879369.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;

    // join the image to a directory
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        res.json({ message: "Image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};

exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  // update user's profile with details
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.status(201).json({ message: "Profile updated successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json({ error: "Error while updating profile" });
    });
};

exports.getAuthenticatedUser = (req, res) => {};
