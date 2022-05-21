const express = require("express");
const imageRouter = express.Router();
const mongoose = require("mongoose");
const Image = require("../models/image");
const config = require("../config");

module.exports = (upload) => {
  const url = config.mongoURI;
  const connect = mongoose.createConnection(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  let gfs;

  connect.once("open", () => {
    // initialize stream
    gfs = new mongoose.mongo.GridFSBucket(connect.db, {
      bucketName: "uploads",
    });

    // console.log(gfs);
  });

  /*
        POST: Upload a single image/file to Image collection
    */
  imageRouter
    .route("/postFile")
    .post(upload.single("file"), (req, res, next) => {
      console.log(req.body);
      // check for existing images
      Image.findOne({ caption: req.body.caption })
        .then((image) => {
          console.log(image);
          if (image) {
            return res.status(200).json({
              success: false,
              message: "Image already exists",
            });
          }

          let newImage = new Image({
            caption: req.body.caption,
            theme: req.body.theme,
            filename: req.file.filename,
            fileId: req.file.id,
          });

          newImage
            .save()
            .then((image) => {
              res.status(200).json({
                success: true,
                image,
              });
            })
            .catch((err) => res.status(500).json(err));
        })
        .catch((err) => res.status(500).json(err));
    })
    .get((req, res, next) => {
      Image.find({})
        .then((images) => {
          res.status(200).json({
            success: true,
            images,
          });
        })
        .catch((err) => res.status(500).json(err));
    });

  /*
        GET: Fetches all the files in the uploads collection
    */
  imageRouter.route("/files").get((req, res, next) => {
    gfs.find().toArray((err, files) => {
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files available",
        });
      }

      files.map((file) => {
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/jpg" ||
          file.contentType === "image/png" ||
          file.contentType === "image/svg"
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

      res.status(200).json({
        success: true,
        files,
      });
    });
  });

  /*
        DELETE: Delete a particular file by an ID
    */
  imageRouter.route("/file/del/:id").post((req, res, next) => {
    console.log(req.params.id);
    gfs.delete(new mongoose.Types.ObjectId(req.params.id), (err, data) => {
      if (err) {
        return res.status(404).json({ err: err });
      }

      res.status(200).json({
        success: true,
        message: `File with ID ${req.params.id} is deleted`,
      });
    });
  });

  return imageRouter;
};
