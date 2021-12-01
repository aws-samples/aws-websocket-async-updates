// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

'use strict'

const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION || 'us-east-1' })
const textract = new AWS.Textract()
const s3 = new AWS.S3()

const { SNS_ROLE } = process.env;
const { SNS_TOPIC } = process.env;

// Main Lambda entry point
exports.handler = async (event) => {
   const Key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "))
   const requestToken = parseInt(Math.random()*10000000).toString()

   // Read the object from S3
   console.log(`Read object from S3 bucket: ${event.Records[0].s3.bucket.name}`)

    let params = {
        DocumentLocation: { 
            S3Object: {
                Bucket: event.Records[0].s3.bucket.name,
                Name: Key,
            }
        },
        FeatureTypes: [
            "TABLES"
        ],
        ClientRequestToken: requestToken,
        JobTag: Key,
        NotificationChannel: {
            RoleArn: SNS_ROLE,
            SNSTopicArn: SNS_TOPIC
        }
    };

    try {
        const extractionResult = await analyzeDocument(params)
    } 
    catch (err) {
        console.log(err)
    }

}

// Wrapper for AWS TextDetection functionality
const analyzeDocument = async (parameters) => {
    return new Promise((resolve, reject) => {
        try {
            textract.startDocumentAnalysis(parameters, (err, data) => {
                if (err) {
                    console.log(err, err.stack); // an error occurred
                    reject(err)
                }   
                console.log('Start Document Analysis - Data:' , data)
                if (data) resolve(data)
            })
        } catch (err) {
            console.error(err)
        }
    })
}


