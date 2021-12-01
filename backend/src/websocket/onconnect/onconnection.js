// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

exports.handler = async event => {
  console.log(event)
  return { statusCode: 200, body: 'Websocket connection successfull.' };
};