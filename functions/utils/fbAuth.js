const { db, admin } = require("../utils/admin");

module.exports = (req, res, next) => {
  let idToken;
  // first check if the header has a auth token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    // split the token from the header
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized user" });
  }

  // verify the authentic token
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      console.log(decodedToken);

      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch((err) => {
      console.error("error verifying token", err);
      return res.status(403).json(err);
    });

  /*
  const bearerHeader = req.headers["authorization"];
  if (bearerHeader) {
    const bearer = bearerHeader.split(" ");
    idToken = bearer[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized user" });
  }

    */
};
