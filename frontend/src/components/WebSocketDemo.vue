<template>
<v-container>
  <v-row>
    <h2>Upload an image (*.jpg or *.png) to analyse using Amazon Textract</h2>
  </v-row>
  <v-row>
    <v-col>
      <v-card class= "pa-2" max-width="600"> 
        <v-app-bar flat color="rgba(0, 0, 0, 0)">
              
          <v-toolbar-title class="text-h6 pl-0">
            Select Image
          </v-toolbar-title>

          <v-spacer></v-spacer>

          <v-btn @click="$refs.inputUpload.click()">
            Browse
          </v-btn>
          <input v-show="false" ref="inputUpload" type="file" @change="onFileChange" accept="image/jpeg, image/png"/>
          
        </v-app-bar>
        
        <v-img :src="image" id="img1" :contain="true"/>

        <v-card-actions v-if="image">
          <v-btn   @click="uploadImage">Upload image</v-btn>
          <v-btn   @click="removeImage">Remove image</v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col class= "pa-2">
      <v-card max-width="600"> 
        <v-tabs>
          <v-tab>Annotated Image</v-tab>
          <v-tab-item :eager="true">
            <v-img :src="annotatedImage" id="img2" :contain="true"/>
          </v-tab-item>

          <v-tab :eager="true" >Raw Output</v-tab>
          <v-tab-item>
            <v-textarea outlined v-model="jsonstr" rows="25" cols="80"></v-textarea>
          </v-tab-item>

  
        </v-tabs>
         <!-- <v-card-actions v-if="image">
           <v-btn>Download Results</v-btn>
         </v-card-actions> -->
      </v-card>
    </v-col>
  </v-row>
</v-container>
</template>

<script>
/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import axios from "axios";

const MAX_IMAGE_SIZE = 1000000;
const API_ENDPOINT = process.env.VUE_APP_UploadAPI;
const WEBSOCKET_ENDPOINT = process.env.VUE_APP_WebSocketURL

export default {
  name: 'WebSocketDemo',
data() {
    return {
      image: "",
      annotatedImage: "",
      uploadURL: "",
      websocketConnected: false,
      jsonstr: '{}',
      connection: null,
      imageType: "",
      canvas: null,
      ctx: null,
      imgCopy: null,

    };
  },
  mounted: function() {
    
    this.canvas =  document.createElement("canvas")
    this.ctx = this.canvas.getContext('2d')
    this.imgCopy = new Image

  },

  created: function() {

      console.log("Starting connection to WebSocket Server:" , WEBSOCKET_ENDPOINT);
      this.connection = new WebSocket(WEBSOCKET_ENDPOINT);
      this.connection.onmessage = (event) =>  {
        this.jsonstr += JSON.stringify(JSON.parse(event.data), null, 2);
        this.processReceivedMessage(event.data);

      }

      this.connection.onopen = function(event) {
        console.log(`Successfully connected to the websocket server: ${event}`)
        this.websocketConnected = true
      }

    },

  methods: {
    monitorFile: function(message) {
      console.log("Message", message)
      const data = { 
        action: "monitor",
        data: message
      }
      this.connection.send(JSON.stringify(data));
    },

    onFileChange(e) {
      let files = e.target.files || e.dataTransfer.files;
      if (!files.length) return;
      this.createImage(files[0]);
    },

    createImage(file) {
      let reader = new FileReader();
      reader.onload = (e) => {
        console.log("Upload API: ", API_ENDPOINT);
        console.log("length: ", e.target.result.length);

        if (e.target.result.includes("data:image/jpeg")) {
          this.imageType = "image/jpeg"
        } else if (e.target.result.includes("data:image/png")) {
          this.imageType = "image/png"
        }
        else {
          return alert("Wrong file type - Images only.");
        }

        if (e.target.result.length > MAX_IMAGE_SIZE) {
          return alert("Image is loo large - 1Mb maximum");
        }
        this.image = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    removeImage: function (e) {
      this.connection.close()
      location.reload()
      console.log("Remove clicked: ", e);
    },

    uploadImage: async function (e) {
      // Get the presigned URL
      const response = await axios({
        method: "GET",
        url: API_ENDPOINT,
      });
      console.log("Response: ", response.data);
      console.log(e)
      // Handle the binary data
      let binary = atob(this.image.split(",")[1]);
      let array = [];
      for (var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      let blobData = new Blob([new Uint8Array(array)], { type: this.imageType});
      console.log("Uploading to: ", response.data.uploadURL);
      console.log("Filename: ", response.data.photoFilename);

      // PUT the binary data
      const result = await fetch(response.data.uploadURL, {
        method: "PUT",
        body: blobData,
      });
      console.log("Result: ", result);
      // Final URL for the user doesn't need the query string params
      this.uploadURL = response.data.uploadURL.split("?")[0];

      this.setupAnnotatedImage()
      //Send a message via the websocket to to tell the backend what file to monitor 
      this.monitorFile(response.data.photoFilename);
    },

    setupAnnotatedImage() {
      this.imgCopy.src = this.image;
      
    },
   

  processReceivedMessage: function (data) {

    var img =  new Image;
    //img.src = this.image;
    img.src = this.imgCopy.src
    
    img.onload = () => {
        if(img.complete) {
          console.log(img.width, img.height)
          
          this.canvas.width = img.width
          this.canvas.height = img.height
          this.ctx.drawImage(img, 0, 0,this.canvas.width ,this.canvas.height ); 
          
          var blocks =  JSON.parse(data)
          blocks.forEach( block => {
            this.ctx.strokeStyle = 'rgba(255,0,0,0.5)';
            this.ctx.beginPath();
            block.Geometry.Polygon.forEach(({X, Y}) =>
              this.ctx.lineTo(img.width * X , img.height * Y)
            );
            this.ctx.closePath();
            this.ctx.stroke();
          })
          this.annotatedImage = this.canvas.toDataURL();
          this.imgCopy.src = this.annotatedImage;
        } 
      }
    },



  },
};

</script>


<style scoped>


</style>
