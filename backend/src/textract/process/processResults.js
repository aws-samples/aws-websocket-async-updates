// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

'use strict'


const AWS = require('aws-sdk');
const textract = new AWS.Textract()
const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
const { TABLE_NAME } = process.env;
const MAX_DATA_SIZE = 100000

exports.handler = async (event) => {
    console.log(event)
    const txtExtractMsg = JSON.parse(event.Records[0].body)
    const jobId = txtExtractMsg.JobId
    const status = txtExtractMsg.Status
    const filename = txtExtractMsg.DocumentLocation.S3ObjectName
    console.log("Filename: ", filename )
    const webSocketID =  await getWebSocketID(filename);

    if (status !== 'SUCCEEDED') {
        console.log('TextExtract Operation failed')
        return {
            statusCode: 300,
            body: JSON.stringify('TextExtract Operation failed!'),
        }
    }
    
    let params = {
        "JobId": jobId
    }
 
    let results = {}
    var nextTokenFlag
    var size = 0
    var blockArray = []

    try {
      do {
        results =  await getDocumentResults(params)
        let blocks = results.Blocks
        for (var i = 0; i < blocks.length; i++) {
            let block = blocks[i]
             blockArray.push(block)
             size = Buffer.byteLength(JSON.stringify(blockArray), "utf8");
             if(size > MAX_DATA_SIZE) {
              console.log("Payload size:", size )
              await sendToClient(webSocketID,blockArray)
              blockArray = []
              size = 0
            }
        }
        
        if (results.hasOwnProperty('NextToken')) {
            nextTokenFlag = true
            nextToken = results.NextToken
            params = {
                "JobId": jobId,
                "NextToken": nextToken
            }
            console.log('Next Token exists',nextToken )
            
        } else {
            nextTokenFlag = false
            console.log('No next Token exists' )
        }

    } while (nextTokenFlag === true)

    await sendToClient(webSocketID,blockArray)

    } catch (err) {
        console.log('Error',err)
        
    }

    const response = {
        statusCode: 200,
        body: JSON.stringify('Successfully retrieved results'),
    };
    return response;
};


// Wrapper for AWS TextDetection functionality
const getDocumentResults = async (parameters) => {
    return new Promise((resolve, reject) => {
        try {
            textract.getDocumentAnalysis(parameters, (err, data) => {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    reject(err)
                } 
                if (data) resolve(data)
            })
        } catch (err) {
            console.error(err)
        }
    })
}

const getWebSocketID =  async (filename) => {
  let connectionData;
  const params  = {
    TableName: TABLE_NAME ,
    KeyConditionExpression: 'fileName = :name',
    ExpressionAttributeValues: {
      ':name': filename
    }
  }
  console.log("Get websocket ID")
  try {
    connectionData = await ddb.query(params).promise();
    console.log(connectionData.Items[0].websocketID)
    return connectionData.Items[0].websocketID
  } catch (e) {
    console.log(e.stack )
    return "";
  }
}

const sendToClient =  async (webSocketID,data) => {

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: process.env.WebSocketURL
  });

  try {
    await apigwManagementApi.postToConnection({ ConnectionId: webSocketID, Data: JSON.stringify(data) }).promise();
  } catch (e) {
    console.log(`monitor: Error posting data to connection: ${e}`)
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${webSocketID}`);
        await ddb.delete({ TableName: TABLE_NAME, Key: { filename } }).promise();
      } else {
        throw e;
      }
    }

  return { statusCode: 200, body: 'Data sent.' };
}
