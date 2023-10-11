/*
dependencies
*/

const express = require('express')
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore')

/*
config - express
*/

const app = express()

/*
config - firebase
*/

const serviceAccount = require('./serviceAccountKey.json');
const async = require('hbs/lib/async');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

/*
endpoint - posts
*/

 app.get('/posts', (request, response) => {
  response.set('Access-Control-Allow-Origin', '*')

  let posts = []
   db.collection('posts').orderBy('date', 'desc').get().then(snapshot => {
     snapshot.forEach((doc) => {
       posts.push(doc.data())
       console.log(posts);
   })
   response.send(posts)
  })
})

/*
endpoint - createPost
*/

 app.get('/createPost', (request, response) => {
  response.set('Access-Control-Allow-Origin', '*')

  response.send('createPost')

})

/*
listen
*/

app.listen(3000)
