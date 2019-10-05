'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');
const dns = require('dns');

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true});
autoIncrement.initialize(mongoose.connection);

let URLSchema = new mongoose.Schema({
  url: String
});

URLSchema.plugin(autoIncrement.plugin, { model: 'UrlList' });

let UrlModel = mongoose.model('UrlList', URLSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

// url shortner microservice
app.post('/api/shorturl/new', (req, res) => {
  let { url } = req.body;
  url = url.split('//')[1];
  url = url[url.length-1] === '/' ? url.slice(0, url.length-1) : url;
  dns.lookup(url, (err, address, family) => {
    if (err) {
      res.send({error: 'invalid URL'})
    } else {
      UrlModel.findOne({ url: url }, (err, data) => {
        if(err) {
          console.log(err)
        } else {
          if (data) {
            let { _id, url } = data;
            res.send({original_url: url, short_url: _id });
          } else {
            let urlObj = new UrlModel({
              url: url
            });

            urlObj.save().then(() => {
              UrlModel.findOne({ url: url }, (err, data) => {
              if(err) {
                console.log(err)
              } else {
                if (data) {
                  let { _id, url } = data;
                  res.send({original_url: url, short_url: _id });
                }
              }
            });
          });
          }
        }
      });  
    }
  });  
});

// url redirection
app.get('/api/shorturl/:id', (req, res) => {
  let { id } = req.params;
  UrlModel.findOne({ _id: id }, (err, data) => {
    if (err) {
      console.log(err);
    } else {
      let { url } = data;
      res.redirect('https://'.concat(url));
    }
  })
})


app.listen(port, function () {
  console.log('Node.js listening ...');
});