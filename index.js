require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const { type } = require('express/lib/response');
const { Schema } = mongoose;
const urlparser = require('url');
const dns = require('dns');
const shortid = require('shortid');
const url = process.env.URL;
const axios = require('axios');
// Basic Configuration
const port = process.env.PORT || 3000;


//DATABASE CONFIGURATION
mongoose.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB', error);
});
//Schema config
const UrlSchema = new Schema({
  url: {
    type: String,
    required: true
  },
  shortUrl:{
    type: String,
    required: true,
    unique: true
  }
});

//Let's create the models
const Urls= mongoose.model('Urls', UrlSchema);

//lets configure the middlewares
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true })); // to analize complex objects
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

function isValidHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}
//dns.lookup solo verifica si el dominio tiene un registro DNS válido (es decir, si el dominio existe y puede resolverse a una dirección IP), pero no garantiza que la URL completa sea legítima o que la página realmente exista.

function dnsLookupPromise(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err || !address) {
        return false
      }
      
      resolve(address);
    });
  });
}

// Creamos los endpoints
app.get('/api/shorturl/:shortU',  async (req, res)=> {
  
  console.log(req.params)
  const sUrl = req.params.shortU;
  const foundUrl = await Urls.findOne({shortUrl: sUrl})
  console.log(foundUrl);
  return res.redirect(foundUrl.url);
});

app.post('/api/shorturl', async (req, res) =>{
  let sUrl =req.body.url
  //veamos que llega por el body
  console.log(req.body)
  console.log(sUrl)
    // Verificar si la URL es válida
    if (!isValidHttpUrl(sUrl)) {
      return res.json({ error: "invalid url" });
    }
    try {
      // Parsear la URL y verificar el hostname con DNS
      const hostname = urlparser.parse(sUrl).hostname;
      const address = await dnsLookupPromise(hostname);
      if(!address){
        return res.json({ error: "invalid url" });
      }
      console.log(address);
      //Hacemos una peticion a axios para verificar que la pagina exista
      const response = await axios.get(sUrl, { timeout: 5000 });
      console.log(response.status)
      if(response.status < 200 && response.status > 400){
        return res.json({ error: "invalid url" });
      }
      // Creamos un ID
      const shortU = shortid.generate();
      const nUrl = new Urls({
        url: sUrl,
        shortUrl: shortU
      });
      const cUrl = await nUrl.save();
      
      return res.status(200).json({ original_url: cUrl.url, short_url: cUrl.shortUrl });
    } catch (error) {
      console.error('Error during URL processing:', error);
      return res.json({ error: "invalid url"});
    }
   /*
  const dnsverification = dns.lookup(urlparser.parse(sUrl).hostname, async (err, address) =>{
    if (!address) {
      console.error('URL not found');
      return res.status(404).json({error: 'invalid url'})
  } else {
      console.log('IP address:', address);
      try {
        //we create an unique id
        const shortU = shortid.generate();
        const nUrl = new Urls({
          url: sUrl,
          shortUrl: shortU
        })
        const cUrl = await nUrl.save();
        //console.log("despues de crearlo")
        console.log(cUrl);
        return res.status(200).json({original_url :cUrl.url, short_url : cUrl.shortUrl})
      } catch (error) {
        console.log("Error at posting URLs")
        return res.status(500).json({message: err.message})
      }
  }

  })

  */


})



app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
