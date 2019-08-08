'use strict';

module.exports.hello = async event => {
  console.log("Received event:",JSON.stringify(event,null,2));  // DEBUG: 
  return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
