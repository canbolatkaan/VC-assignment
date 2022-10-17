
const axios = require('axios');
const { response } = require('express');

const express = require('express'),
      mongoose = require('mongoose'),
      app = express(),
      serverPort = 3000,
      hostname = '127.0.0.1'

require('dotenv').config();


const url = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=admin`

mongoose.connect(url)

const db = mongoose.connection;

const Schema = mongoose.Schema;

const country = new Schema(
  {
    name: {
      type: String
    },
    region: {
      type: String
    }
  },
  { collection: "countries" }
);

const Countries = mongoose.model("countries",country);

//Countries endpoint
app.get("/countries", (req, res, next) => {
  try {
    
    let region = req.query.region;
    if(region == null){

        let query = Countries.find({},{_id: 0});
        query.exec(function (err, country) {
            res.json(country);
        })
   
    }
    else{
        //we have APAC and apac region in data, so we need to ignore case sensitivity when we searching with property
        let query = Countries.find({region: {'$regex': `^${region}$`, $options: 'i'}},{_id: 0});

        query.exec(function (err, country) {
            res.json(country);
        })
    }

  } catch (error) {
    
      res.send({message: error.message})
  }
    

});

//Salerep endpoint
app.get("/salesrep", (req, res, next) => {
  try {
    axios.get(`http://${hostname}:${serverPort}/countries`)
  
      // Show response data
      .then(response => 
          {
            let countries = response.data            
            
            let uRegions= new Map(countries.map(s => [s.region.toLowerCase(), s.region]))
            console.log(uRegions)
            uRegions=[...uRegions.values()]

            let answerList = [];
            let promises= [];

            uRegions.forEach(element => {
                let answer = {};
                promises.push(
                axios.get(`http://${hostname}:${serverPort}/countries/?region=` + element)
                    .then(response => {
                        answer["region"] = element;
                        answer["maxSalesReq"] = Math.ceil(response.data.length / 3);
                        answer["minSalesReq"] = Math.ceil(response.data.length / 7);
                        answerList.push(answer);
                        
                    })
                    .catch(err => console.log(err))
                    )
            });

            Promise.all(promises).then(() => res.send(answerList))

          }        
        )
      .catch(err => console.log(err))

    
  } catch (error) {
    res.send({message: error.message})
  }
});


app.get("/optimal", (req, res, next) => {
  axios.get(`http://${hostname}:${serverPort}/countries`)
  
      .then(response => 
          {
            let countries = response.data            
            
            let uRegions= new Map(countries.map(s => [s.region.toLowerCase(), s.region]))
            uRegions=[...uRegions.values()]

            let answerList = [];
            let promises= [];
            uRegions.forEach(element => {
                let answer = {};
                promises.push(
                    axios.get(`http://${hostname}:${serverPort}/countries/?region=` + element)
                    .then(response => {
                        answer["region"]=element;
                        answer["min"] = Math.ceil(response.data.length / 7);
                        answer["countrieList"]=response.data.map(item => item.name).filter((value, index, self) => self.indexOf(value) === index);
                        answerList.push(answer)
                    })
                    .catch(err => console.log(err))
                )
            });


            
            Promise.all(promises).then(() => {
                
               res.send(sliceEqualChunks(answerList))

              
              }

            
            )

          }        
        )
      .catch(err => console.log(err))
    
});


function sliceEqualChunks(answerList){

  let realAnswerList=[];

  for( i=0 ; i< answerList.length; i++){
    let list =partition(answerList[i].countrieList,answerList[i].min)
    for( j=0; j< list.length;j++){

      realAnswerList.push({
          "region":answerList[i].region,
          "countryList":list[j],
          "count":list[j].length
      }
          )
    }
  }
  
  return realAnswerList
}

function partition(arr, length) {
  let rest = arr.length % length
  let size = Math.floor(arr.length / length)
  let j = 0
  return Array.from({length}, (_, i) => arr.slice(j, j += size + (i < rest)))
}








app.listen(serverPort, hostname, () => console.log('Example app listening on port'))