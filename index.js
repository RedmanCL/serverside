/*
dependencies
*/

const express = require('express')
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage');
let inspect = require('util').inspect
const busboy = require('busboy')
let path = require('path')
let os = require('os')
let fs = require('fs')
let UUID = require('uuid-v4')

/*
config - express
*/

const app = express()

/*
config - firebase
*/

const serviceAccount = require('./serviceAccountKey.json')

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'gs://redgram-2a166.appspot.com'
})

const db = getFirestore()
const bucket = getStorage().bucket()

/*
endpoint - posts
*/

app.get('/posts', (request, response) => {
  response.set('Access-Control-Allow-Origin', '*')

  let posts = []
  db.collection('posts').orderBy('date', 'desc').get().then(snapshot => {
    snapshot.forEach((doc) => {
      posts.push(doc.data())
      // console.log(posts);
    })
    response.send(posts)
  })
})

/*
endpoint - createPost
*/

app.post('/createPost', async (request, response) => {
  try {
    response.set('Access-Control-Allow-Origin', '*');

    const bb = busboy({ headers: request.headers });

    let fields = {};
    let fileData = {};

    await new Promise((resolve, reject) => {
      bb.on('file', (name, file, info) => {
        const { filename, mimeType } = info;
        let filepath = path.join(os.tmpdir(), filename);
        file.pipe(fs.createWriteStream(filepath));

        console.log(filepath);

        fileData = { filepath, mimeType };
      });

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('finish', resolve);
      request.pipe(bb);
    });

    // Check if the file field is present (file uploaded)
    if (Object.keys(fileData).length !== 0) {
      // File upload completed asynchronously, continue processing
      const uploadedFile = await bucket.upload(fileData.filepath, {
        uploadType: 'media',
        metadata: {
          contentType: fileData.mimeType,
          firebaseStorageDownloadTokens: UUID(),
        },
      });

      const metadata = uploadedFile[1];
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${metadata.bucket}/o/${metadata.name}?alt=media&token=${UUID()}`;

      // Update Firestore document with the file URL
      const createPostResult = await db.collection('posts').doc(fields.id).set({
        userHandle: fields.userHandle,
        id: fields.id,
        userId: fields.userId,
        caption: fields.caption,
        location: fields.location,
        date: fields.date,
        profilePic: fields.photoURL === 'false'? false : fields.photoURL,
        imageUrl: imageUrl,
      });

      response.status(200).send(fields.id);
    } else {
      // No file uploaded, process the rest of the function without file handling
      const createPostResult = await db.collection('posts').doc(fields.id).set({
        userHandle: fields.userHandle,
        id: fields.id,
        userId: fields.userId,
        caption: fields.caption,
        location: fields.location,
        date: fields.date,
        profilePic: fields.photoURL === 'false'? false : fields.photoURL,
        // No imageUrl for posts without a file
      });

      response.status(200).send(fields.id);
    }
  } catch (error) {
    console.error('Error occurred:', error);
    response.status(500).send('Error occurred during post creation.');
  }
});



/*
listen
*/

app.listen(3000)
