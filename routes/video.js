const express = require('express');
const router = express.Router();
const multer = require('multer');
var ffmpeg = require('fluent-ffmpeg')

const { Video } = require("../models/Video");

const { auth } = require("../middleware/auth");

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}_${file.originalname}`)
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname)
        if(ext !== '.mp4'){
            return cb(res.status(400).end('Only .mp4 File Types are allowed'), false)
        }
        cb(null, true)
    }
  })
   
  var upload = multer({ storage: storage }).single("file")


router.post("/uploadfiles", (req, res) => {

    upload(req, res, err => {
        if(err) {
            return res.json({ success: false, err })
        }
        return res.json({ success: true, filePath: res.req.file.path, fileName: res.req.file.filename })  
    })
});

// --------------------------------------

router.post("/thumbnail", (req, res) => {

  let thumbsFilePath ="";
  let fileDuration ="";

  ffmpeg.ffprobe(req.body.filePath, function(err, metadata){
      console.dir(metadata);

      fileDuration = metadata.format.duration;
  })


  ffmpeg(req.body.filePath)
  .on('filenames', function (filenames) {
      console.log('Will generate ' + filenames.join(', '))
      thumbsFilePath = "uploads/thumbnails/" + filenames[0];
  })
  .on('end', function () {
      console.log('Screenshots taken');
      return res.json({ success: true, thumbsFilePath: thumbsFilePath, fileDuration: fileDuration})
  })
  .screenshots({
      // Will take screens at 20%, 40%, 60% and 80% of the video
      count: 3,
      folder: 'uploads/thumbnails',
      size:'320x240',
      // %b input basename ( filename w/o extension )
      filename:'thumbnail-%b.png'
  });

});

router.get("/getVideos", (req, res) => {

    Video.find()
      .populate('writer')
      .exec((err, videos) => {
        if(err) return res.status(400).send(err);
        res.status(200).json({ success: true, videos })
      })
});



router.post("/uploadVideo", (req, res) => {

  const video = new Video(req.body)

  console.log(req.body.filePath)

  // video.save((err, video) => {
  //   if(err) return res.status(400).json({ success: false, err })
  //   return res.status(200).json({
  //     success: true
  //   })
  // })
  
  const fs = require('fs');
  const AWS = require('aws-sdk');
  
  // Enter copied or downloaded access id and secret here
  const ID = process.env.AWS_ACCESS_KEY;
  const SECRET = process.env.AWS_SECRET_ACCESS;
  
  // Enter the name of the bucket that you have created here
  const BUCKET_NAME = 'jpt-onevideo.com';
  
  // Initializing S3 Interface
  const s3 = new AWS.S3({
      accessKeyId: ID,
      secretAccessKey: SECRET
  });
  
  const uploadFile = (fileName) => {
    // read content from the file
      const fileContent = fs.readFileSync(fileName);

      // setting up s3 upload parameters
      const params = {
          Bucket: BUCKET_NAME,
          Key: req.body.filePath, // file name you want to save as
          Body: fileContent
      };

      // Uploading files to the bucket
      s3.upload(params, function(err, data) {
          if (err) {
              throw err
          }
          console.log(`File uploaded successfully. ${data.Location}`)
      });
  };

  uploadFile(req.body.filePath)

});



router.post("/getVideo", (req, res) => {
    Video.findOne({ "_id" : req.body.videoID })
    // https://s3.us-east-2.amazonaws.com/jpt-onevideo.com/uploads%5C1595494342909_2020-07-09+18-23-25.mp4
    .populate('writer')
    .exec((err, video) => {
      if(err) return res.status(400).send(err);
      res.status(200).json({ success: true, video })
    })
});


module.exports = router;