<template>
  <v-app>
    <v-app-bar app color="primary" dark
    >
      <v-toolbar-title>Asynchronous client updates using Amazon API Gateway WebSockets</v-toolbar-title>
      <v-spacer></v-spacer>

    </v-app-bar>

    <v-main>
      <WebSocketDemo/>
    </v-main>


  </v-app>
</template>

<script>
/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */
import WebSocketDemo from './components/WebSocketDemo.vue'

export default {
  name: 'App',
  components: {
    WebSocketDemo
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
