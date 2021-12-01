// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const { TABLE_NAME } = process.env;

exports.handler = async event => {

  const fileName = JSON.parse(event.body).data;
  const putParams = {
    TableName: process.env.TABLE_NAME,
    Item: {
      websocketID: event.requestContext.connectionId,
      fileName: fileName
    }
  };

  try {
    await ddb.put(putParams).promise()
    .then(function(data) {
      console.log(data);
    })
    .catch(function(err) {
      console.log(err);
    });

  } catch (err) {
    return { statusCode: 500, body: 'Failed to log connection in DynamoDB ' + JSON.stringify(err) };
  }

  return { statusCode: 200, body: 'Successfully logged connection in DynamoDB.' };


};